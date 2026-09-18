import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () =>
    createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../../lib/supabase/session", () => ({
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

describe("POST /api/payments/checkout", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    setPaymentEnv();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
});
