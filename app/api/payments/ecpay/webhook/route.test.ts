import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeCheckMacValue } from "../../../../../lib/ecpay/check-mac";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  setFakeRpc,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MERCHANT_TRADE_NO = "ZW20260918001";
const TRADE_NO = "2609180000000001";

const state: {
  memory: FakeSupabaseMemory;
  failProfileUpdate: boolean;
} = {
  memory: createFakeSupabaseMemory(),
  failProfileUpdate: false,
};

vi.mock("../../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => {
    const client = createFakeServiceRoleClient(state.memory);
    if (!state.failProfileUpdate) {
      return client;
    }
    return {
      ...client,
      from(table: string) {
        const api = client.from(table);
        if (table !== "profiles") {
          return api;
        }
        return {
          select() {
            return api.select();
          },
          eq(column: string, value: unknown) {
            return api.eq(column, value);
          },
          update() {
            const failing = {
              eq() {
                return failing;
              },
              select() {
                return failing;
              },
              async maybeSingle() {
                return {
                  data: null,
                  error: { message: "profile write failed" },
                };
              },
              async single() {
                return {
                  data: null,
                  error: { message: "profile write failed" },
                };
              },
              then(
                onfulfilled?:
                  | ((value: {
                      data: unknown;
                      error: unknown;
                    }) => unknown)
                  | null,
                onrejected?: ((reason: unknown) => unknown) | null,
              ) {
                return failing.maybeSingle().then(onfulfilled, onrejected);
              },
            };
            return failing;
          },
          maybeSingle: api.maybeSingle.bind(api),
          single: api.single.bind(api),
        };
      },
    };
  },
}));

const PAYMENT_ENV_KEYS = ["ECPAY_HASH_KEY", "ECPAY_HASH_IV"] as const;

function setPaymentEnv() {
  process.env.ECPAY_HASH_KEY = HASH_KEY;
  process.env.ECPAY_HASH_IV = HASH_IV;
}

function seedPendingOrder(
  overrides: Partial<FakeOrder> = {},
): FakeOrder {
  const order: FakeOrder = {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "unlock_report_lifetime",
    merchant_trade_no: MERCHANT_TRADE_NO,
    amount: 99,
    currency: "TWD",
    status: "pending",
    trade_no: null,
    payment_date: null,
    ...overrides,
  };
  state.memory.orders.set(order.id, order);
  return order;
}

function signedNotify(fields: Record<string, string>): Record<string, string> {
  const CheckMacValue = computeCheckMacValue(fields, HASH_KEY, HASH_IV);
  return { ...fields, CheckMacValue };
}

function successFields(
  overrides: Record<string, string | undefined> = {},
): Record<string, string> {
  const fields: Record<string, string> = {
    MerchantID: "2000132",
    MerchantTradeNo: MERCHANT_TRADE_NO,
    RtnCode: "1",
    RtnMsg: "交易成功",
    TradeNo: TRADE_NO,
    TradeAmt: "99",
    PaymentDate: "2026/09/18 12:00:00",
    PaymentType: "Credit_CreditCard",
    SimulatePaid: "0",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete fields[key];
    } else {
      fields[key] = value;
    }
  }
  return signedNotify(fields);
}

async function postWebhook(fields: Record<string, string>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/payments/ecpay/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

async function readBody(response: Response): Promise<string> {
  return response.text();
}

function orderRow() {
  return state.memory.orders.get(ORDER_ID);
}

function profileRow() {
  return state.memory.profiles.get(USER_ID);
}

function creditsFor(orderId: string) {
  return [...state.memory.pointTransactions.values()].filter(
    (row) => row.type === "credit_purchase" && row.source_order_id === orderId,
  );
}

function installFulfillRpc() {
  setFakeRpc(state.memory, "fulfill_points_pack_order", (args) => {
    const orderId = String(args?.order_id ?? "");
    const order = state.memory.orders.get(orderId);
    const profile = order ? state.memory.profiles.get(order.user_id) : undefined;
    if (!order || !profile) {
      return {
        data: [{ ok: false, reason: "not_found", points_balance: 0 }],
        error: null,
      };
    }
    if (creditsFor(order.id).length > 0) {
      return {
        data: [
          {
            ok: true,
            reason: "already_fulfilled",
            points_balance: profile.points_balance,
          },
        ],
        error: null,
      };
    }
    const id = `credit-${order.id}`;
    state.memory.pointTransactions.set(id, {
      id,
      user_id: order.user_id,
      delta: 5,
      type: "credit_purchase",
      source_order_id: order.id,
      report_id: null,
    });
    profile.points_balance += 5;
    return {
      data: [
        {
          ok: true,
          reason: "credited",
          points_balance: profile.points_balance,
        },
      ],
      error: null,
    };
  });
}

function seedPointsPackOrder(overrides: Partial<FakeOrder> = {}) {
  return seedPendingOrder({
    plan_id: "points_pack_5",
    amount: 49,
    ...overrides,
  });
}

describe("POST /api/payments/ecpay/webhook", () => {
  const originalPaymentEnv = Object.fromEntries(
    PAYMENT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof PAYMENT_ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.failProfileUpdate = false;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedPendingOrder();
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
    state.failProfileUpdate = false;
  });

  it("rejects a bad CheckMacValue without mutating state or returning 1|OK", async () => {
    const fields = successFields();
    fields.CheckMacValue = "0".repeat(64);

    const response = await postWebhook(fields);
    const body = await readBody(response);

    expect(body).not.toBe("1|OK");
    expect(body).not.toBe("1OK");
    expect(orderRow()?.status).toBe("pending");
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("rejects an unknown MerchantTradeNo without returning 1|OK", async () => {
    const response = await postWebhook(
      successFields({ MerchantTradeNo: "MISSINGTRADE001" }),
    );
    const body = await readBody(response);

    expect(body).not.toBe("1|OK");
    expect(orderRow()?.status).toBe("pending");
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("rejects a TradeAmt that does not match the order amount", async () => {
    const response = await postWebhook(successFields({ TradeAmt: "1" }));
    const body = await readBody(response);

    expect(body).not.toBe("1|OK");
    expect(orderRow()?.status).toBe("pending");
    expect(orderRow()?.amount).toBe(99);
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("acks SimulatePaid=1 without fulfilling paid or unlocking", async () => {
    const response = await postWebhook(successFields({ SimulatePaid: "1" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).not.toBe("paid");
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("marks failed and stays locked when RtnCode is not 1", async () => {
    const response = await postWebhook(successFields({ RtnCode: "0" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("failed");
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("pays and unlocks when SimulatePaid is omitted", async () => {
    const response = await postWebhook(successFields({ SimulatePaid: undefined }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(orderRow()?.trade_no).toBe(TRADE_NO);
    expect(profileRow()?.access_status).toBe("unlocked");
  });

  it("pays and unlocks when SimulatePaid is empty or 0", async () => {
    const empty = await postWebhook(successFields({ SimulatePaid: "" }));
    expect(await empty.text()).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("unlocked");

    state.memory = createFakeSupabaseMemory();
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedPendingOrder();
    vi.resetModules();

    const zero = await postWebhook(successFields({ SimulatePaid: "0" }));
    expect(await zero.text()).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("unlocked");
  });

  it("still pays when PaymentDate cannot be parsed", async () => {
    const response = await postWebhook(
      successFields({ PaymentDate: "not-a-date" }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(orderRow()?.payment_date).toBeNull();
    expect(profileRow()?.access_status).toBe("unlocked");
  });

  it("is idempotent for a paid unlocked order and never flips to failed", async () => {
    seedPendingOrder({
      status: "paid",
      trade_no: TRADE_NO,
      payment_date: "2026-09-18T04:00:00.000Z",
    });
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      {
        access_status: "unlocked",
        points_balance: 3,
        subscription_status: "none",
      },
    );

    const response = await postWebhook(successFields({ RtnCode: "0" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("unlocked");
    expect(profileRow()?.points_balance).toBe(3);
    expect(profileRow()?.subscription_status).toBe("none");
  });

  it("compensates unlock when the order is already paid but still locked", async () => {
    seedPendingOrder({
      status: "paid",
      trade_no: TRADE_NO,
    });

    const response = await postWebhook(successFields());
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("unlocked");
  });

  it("does not return 1|OK first when the entitlement write fails", async () => {
    state.failProfileUpdate = true;

    const response = await postWebhook(successFields());
    const body = await readBody(response);

    expect(body).not.toBe("1|OK");
    expect(profileRow()?.access_status).toBe("locked");
  });

  it("marks pending paid when the member is already unlocked without extra side effects", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      {
        access_status: "unlocked",
        points_balance: 7,
        subscription_status: "none",
      },
    );

    const response = await postWebhook(successFields());
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(orderRow()?.trade_no).toBe(TRADE_NO);
    expect(profileRow()?.access_status).toBe("unlocked");
    expect(profileRow()?.points_balance).toBe(7);
    expect(profileRow()?.subscription_status).toBe("none");
  });

  it("credits points_pack_5 and leaves access_status unchanged", async () => {
    seedPointsPackOrder();
    installFulfillRpc();

    const response = await postWebhook(successFields({ TradeAmt: "49" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.points_balance).toBe(5);
    expect(profileRow()?.access_status).toBe("locked");
    expect(profileRow()?.subscription_status).toBe("none");
    expect(creditsFor(ORDER_ID)).toHaveLength(1);
    expect(creditsFor(ORDER_ID)[0]?.delta).toBe(5);
    expect(state.memory.reportUnlocks.size).toBe(0);
  });

  it("does not credit again when the points pack already has a credit", async () => {
    seedPointsPackOrder({
      status: "paid",
      trade_no: TRADE_NO,
    });
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "locked", points_balance: 5 },
    );
    state.memory.pointTransactions.set("credit-existing", {
      id: "credit-existing",
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });
    installFulfillRpc();

    const response = await postWebhook(successFields({ TradeAmt: "49" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.points_balance).toBe(5);
    expect(profileRow()?.access_status).toBe("locked");
    expect(creditsFor(ORDER_ID)).toHaveLength(1);
  });

  it("backfills a credit when a paid points pack has none", async () => {
    seedPointsPackOrder({
      status: "paid",
      trade_no: TRADE_NO,
    });
    installFulfillRpc();

    const response = await postWebhook(successFields({ TradeAmt: "49" }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toBe("1|OK");
    expect(profileRow()?.points_balance).toBe(5);
    expect(profileRow()?.access_status).toBe("locked");
    expect(creditsFor(ORDER_ID)).toHaveLength(1);
  });

  it("does not add points or unlock rows when a lifetime plan succeeds", async () => {
    const response = await postWebhook(successFields());
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("unlocked");
    expect(profileRow()?.points_balance).toBe(0);
    expect(state.memory.pointTransactions.size).toBe(0);
    expect(state.memory.reportUnlocks.size).toBe(0);
  });

  it("compensates a paid lifetime order without adding points", async () => {
    seedPendingOrder({ status: "paid", trade_no: TRADE_NO });

    const response = await postWebhook(successFields());
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(profileRow()?.access_status).toBe("unlocked");
    expect(profileRow()?.points_balance).toBe(0);
    expect(state.memory.pointTransactions.size).toBe(0);
  });

  it("does not credit a points pack when SimulatePaid is 1", async () => {
    seedPointsPackOrder();
    installFulfillRpc();

    const response = await postWebhook(
      successFields({ TradeAmt: "49", SimulatePaid: "1" }),
    );
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(orderRow()?.status).not.toBe("paid");
    expect(profileRow()?.points_balance).toBe(0);
    expect(profileRow()?.access_status).toBe("locked");
    expect(creditsFor(ORDER_ID)).toHaveLength(0);
  });

  it("does not credit a points pack when RtnCode is not 1", async () => {
    seedPointsPackOrder();
    installFulfillRpc();

    const response = await postWebhook(
      successFields({ TradeAmt: "49", RtnCode: "0" }),
    );
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("failed");
    expect(profileRow()?.points_balance).toBe(0);
    expect(profileRow()?.access_status).toBe("locked");
    expect(creditsFor(ORDER_ID)).toHaveLength(0);
  });

  it("acks an unknown plan_id without changing entitlements", async () => {
    seedPendingOrder({ plan_id: "not_a_plan", amount: 49 });
    installFulfillRpc();

    const response = await postWebhook(successFields({ TradeAmt: "49" }));
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(orderRow()?.status).toBe("paid");
    expect(profileRow()?.access_status).toBe("locked");
    expect(profileRow()?.points_balance).toBe(0);
    expect(creditsFor(ORDER_ID)).toHaveLength(0);
  });

  it("dispatches from the stored plan_id when CustomField says lifetime", async () => {
    seedPointsPackOrder();
    installFulfillRpc();

    const response = await postWebhook(
      successFields({
        TradeAmt: "49",
        CustomField1: "unlock_report_lifetime",
      }),
    );
    const body = await readBody(response);

    expect(body).toBe("1|OK");
    expect(orderRow()?.plan_id).toBe("points_pack_5");
    expect(profileRow()?.points_balance).toBe(5);
    expect(profileRow()?.access_status).toBe("locked");
    expect(creditsFor(ORDER_ID)).toHaveLength(1);
  });
});
