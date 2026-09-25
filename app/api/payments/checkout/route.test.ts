import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCheckMacValue } from "../../../../lib/ecpay/check-mac";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeSubscription,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () =>
    createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId
      ? { id: state.userId, email: "yuan@example.com" }
      : null,
}));

function setPaymentEnv(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    ECPAY_MERCHANT_ID: "2000132",
    ECPAY_HASH_KEY: HASH_KEY,
    ECPAY_HASH_IV: HASH_IV,
    ECPAY_CHECKOUT_URL:
      "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
    ECPAY_RETURN_URL: "https://example.test/api/payments/ecpay/webhook",
    ECPAY_CLIENT_BACK_URL: "https://example.test/orders/processing",
    ECPAY_PERIOD_RETURN_URL:
      "https://example.test/api/payments/ecpay/period-webhook",
    APP_BASE_URL: undefined,
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function postCheckout(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function checkoutFields(body: Record<string, unknown>): Record<string, unknown> {
  if (body.fields && typeof body.fields === "object") {
    return body.fields as Record<string, unknown>;
  }
  return body;
}

const PAYMENT_ENV_KEYS = [
  "ECPAY_MERCHANT_ID",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
  "ECPAY_CHECKOUT_URL",
  "ECPAY_RETURN_URL",
  "ECPAY_CLIENT_BACK_URL",
  "ECPAY_PERIOD_RETURN_URL",
  "APP_BASE_URL",
] as const;

describe("POST /api/payments/checkout", () => {
  const originalPaymentEnv = Object.fromEntries(
    PAYMENT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof PAYMENT_ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    setPaymentEnv();
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of PAYMENT_ENV_KEYS) {
      const value = originalPaymentEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    state.userId = USER_ID;
  });

  it("returns 401 without a session and does not insert pending", async () => {
    state.userId = null;
    const response = await postCheckout({
      plan_id: "unlock_report_lifetime",
    });
    expect(response.status).toBe(401);
    const body = await readJson(response);
    expect(body.message).toBe("請先登入。");
    expect(state.memory.orders.size).toBe(0);
  });

  it("returns 400 for an unknown plan and does not insert pending", async () => {
    const response = await postCheckout({ plan_id: "points_pack" });
    expect(response.status).toBe(400);
    const body = await readJson(response);
    expect(body.message).toBe("不支援的方案。");
    expect(state.memory.orders.size).toBe(0);
  });

  it("returns 409 when already unlocked and does not insert pending", async () => {
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
    });
    const response = await postCheckout({
      plan_id: "unlock_report_lifetime",
    });
    expect(response.status).toBe(409);
    const body = await readJson(response);
    expect(body.message).toBe("此帳號已開通，無需再次付款。");
    expect(state.memory.orders.size).toBe(0);
  });

  it("returns 500 when Hash is missing, omits secrets, and does not insert", async () => {
    setPaymentEnv({ ECPAY_HASH_KEY: undefined, ECPAY_HASH_IV: undefined });
    const response = await postCheckout({
      plan_id: "unlock_report_lifetime",
    });
    expect(response.status).toBe(500);
    const raw = await response.text();
    expect(raw).toContain("付款服務暫時無法使用，請稍後再試。");
    expect(raw).not.toContain(HASH_KEY);
    expect(raw).not.toContain(HASH_IV);
    expect(state.memory.orders.size).toBe(0);
  });

  it("stores amount 99 even when the body sends amount 1", async () => {
    const response = await postCheckout({
      plan_id: "unlock_report_lifetime",
      amount: 1,
      currency: "USD",
      ItemName: "fake",
    });
    expect(response.status).toBe(200);
    const orders = [...state.memory.orders.values()];
    expect(orders).toHaveLength(1);
    expect(orders[0]?.amount).toBe(99);
    expect(orders[0]?.currency).toBe("TWD");
    expect(orders[0]?.status).toBe("pending");
    expect(orders[0]?.plan_id).toBe("unlock_report_lifetime");
    const fields = checkoutFields(await readJson(response));
    expect(String(fields.TotalAmount)).toBe("99");
  });

  it("stores amount 49 for points_pack_5 even when the body sends amount 1", async () => {
    const response = await postCheckout({
      plan_id: "points_pack_5",
      amount: 1,
      points: 99,
      ItemName: "fake",
    });
    expect(response.status).toBe(200);
    const orders = [...state.memory.orders.values()];
    expect(orders).toHaveLength(1);
    expect(orders[0]?.amount).toBe(49);
    expect(orders[0]?.currency).toBe("TWD");
    expect(orders[0]?.status).toBe("pending");
    expect(orders[0]?.plan_id).toBe("points_pack_5");
    const fields = checkoutFields(await readJson(response));
    expect(String(fields.TotalAmount)).toBe("49");
    expect(fields.ItemName).toBe("紫微斗數點數包（5 點）");
  });

  it("returns 200 for an unlocked member buying points_pack_5", async () => {
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
    });
    const response = await postCheckout({ plan_id: "points_pack_5" });
    expect(response.status).toBe(200);
    const orders = [...state.memory.orders.values()];
    expect(orders).toHaveLength(1);
    expect(orders[0]?.status).toBe("pending");
    expect(orders[0]?.plan_id).toBe("points_pack_5");
    expect(orders[0]?.amount).toBe(49);
  });

  it("returns form POST fields for a locked member", async () => {
    const response = await postCheckout({
      plan_id: "unlock_report_lifetime",
    });
    expect(response.status).toBe(200);
    const fields = checkoutFields(await readJson(response));
    expect(fields.MerchantID).toBe("2000132");
    expect(String(fields.MerchantTradeNo)).toMatch(/^[A-Za-z0-9]{1,20}$/);
    expect(fields.ReturnURL).toBe(
      "https://example.test/api/payments/ecpay/webhook",
    );
    expect(fields.ClientBackURL).toBe(
      "https://example.test/orders/processing",
    );
    expect(fields.TradeDesc).toBe("紫微斗數完整解讀");
    expect(fields.ItemName).toBe("紫微斗數完整解讀");
    expect(fields.ChoosePayment).toBe("Credit");
    expect(String(fields.EncryptType)).toBe("1");
    expect(fields.CheckMacValue).toMatch(/^[A-F0-9]{64}$/);
    const order = [...state.memory.orders.values()][0];
    expect(order?.merchant_trade_no).toBe(fields.MerchantTradeNo);
    expect(order?.status).toBe("pending");
  });

  it("allows a second pending order for the same locked member", async () => {
    const first = await postCheckout({ plan_id: "unlock_report_lifetime" });
    const second = await postCheckout({ plan_id: "unlock_report_lifetime" });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(state.memory.orders.size).toBe(2);
    const nos = [...state.memory.orders.values()].map((row) => row.merchant_trade_no);
    expect(new Set(nos).size).toBe(2);
  });
});

describe("POST /api/payments/checkout — subscribe_report_monthly", () => {
  const NOW = new Date("2026-01-15T00:00:00.000Z");
  const originalPaymentEnv = Object.fromEntries(
    PAYMENT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof PAYMENT_ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    setPaymentEnv();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of PAYMENT_ENV_KEYS) {
      const value = originalPaymentEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    state.userId = USER_ID;
  });

  function orders() {
    return [...state.memory.orders.values()];
  }

  it("returns period fields signed with CheckMacValue and stores a pending 19 order", async () => {
    const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

    expect(response.status).toBe(200);
    const fields = checkoutFields(await readJson(response)) as Record<string, string>;
    expect(fields).toMatchObject({
      TotalAmount: "19",
      PeriodAmount: "19",
      PeriodType: "M",
      Frequency: "1",
      ExecTimes: "12",
      PeriodReturnURL: "https://example.test/api/payments/ecpay/period-webhook",
      ChoosePayment: "Credit",
      ItemName: "紫微斗數月繳訂閱",
    });
    expect(
      verifyCheckMacValue(fields, fields.CheckMacValue, HASH_KEY, HASH_IV),
    ).toBe(true);
    expect(orders()).toEqual([
      expect.objectContaining({
        plan_id: "subscribe_report_monthly",
        amount: 19,
        status: "pending",
      }),
    ]);
  });

  it("ignores amount and period values sent by the client", async () => {
    const response = await postCheckout({
      plan_id: "subscribe_report_monthly",
      amount: 1,
      PeriodType: "D",
      PeriodAmount: 1,
    });

    const fields = checkoutFields(await readJson(response));
    expect(fields).toMatchObject({ TotalAmount: "19", PeriodAmount: "19", PeriodType: "M" });
    expect(orders()[0]?.amount).toBe(19);
  });

  it("returns 401 without a session and does not insert an order", async () => {
    state.userId = null;

    const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

    expect(response.status).toBe(401);
    expect(orders()).toHaveLength(0);
  });

  it("allows a lifetime-unlocked member to subscribe", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "unlocked" },
    );

    const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

    expect(response.status).toBe(200);
  });

  it("returns PAYMENT_UNAVAILABLE for the monthly plan only when PeriodReturnURL is missing", async () => {
    setPaymentEnv({ ECPAY_PERIOD_RETURN_URL: undefined, APP_BASE_URL: undefined });

    const monthly = await postCheckout({ plan_id: "subscribe_report_monthly" });
    const monthlyOrders = orders().length;
    const points = await postCheckout({ plan_id: "points_pack_5" });

    expect(monthly.status).toBe(500);
    expect((await readJson(monthly)).message).toBe("付款服務暫時無法使用，請稍後再試。");
    expect(monthlyOrders).toBe(0);
    expect(points.status).toBe(200);
  });

  it.each(["active", "past_due"] as const)(
    "returns 409 when a %s subscription period has not ended",
    async (status) => {
      seedFakeSubscription(state.memory, {
        user_id: USER_ID,
        merchant_trade_no: "MTN0",
        status,
        current_period_end: "2026-02-01T00:00:00.000Z",
      });

      const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

      expect(response.status).toBe(409);
      expect(String((await readJson(response)).message)).toMatch(/訂閱/);
      expect(orders()).toHaveLength(0);
    },
  );

  it.each(["cancelled", "expired"] as const)(
    "allows a new order when the %s subscription period has ended",
    async (status) => {
      seedFakeSubscription(state.memory, {
        user_id: USER_ID,
        merchant_trade_no: "MTN0",
        status,
        current_period_end: "2026-01-14T00:00:00.000Z",
      });

      const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

      expect(response.status).toBe(200);
    },
  );

  it("returns 409 while a monthly order is pending within 5 minutes, then allows it", async () => {
    const first = await postCheckout({ plan_id: "subscribe_report_monthly" });
    vi.setSystemTime(new Date(NOW.getTime() + 4 * 60 * 1000));
    const blocked = await postCheckout({ plan_id: "subscribe_report_monthly" });
    vi.setSystemTime(new Date(NOW.getTime() + 5 * 60 * 1000 + 1000));
    const allowed = await postCheckout({ plan_id: "subscribe_report_monthly" });

    expect(first.status).toBe(200);
    expect(blocked.status).toBe(409);
    expect(allowed.status).toBe(200);
    expect(orders()).toHaveLength(2);
  });

  it("does not block the monthly plan on a pending points pack order", async () => {
    await postCheckout({ plan_id: "points_pack_5" });

    const response = await postCheckout({ plan_id: "subscribe_report_monthly" });

    expect(response.status).toBe(200);
  });

  it("returns 400 UNSUPPORTED_PLAN for an unknown plan", async () => {
    const response = await postCheckout({ plan_id: "subscribe_report_yearly" });

    expect(response.status).toBe(400);
    expect((await readJson(response)).message).toBe("不支援的方案。");
  });
});
