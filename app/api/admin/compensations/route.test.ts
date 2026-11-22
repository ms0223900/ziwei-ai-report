import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeCheckMacValue } from "../../../../lib/ecpay/check-mac";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  setFakeRpc,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MTN = "ZW20260928001";
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";

const state: { memory: FakeSupabaseMemory; userId: string | null; rpcCalls: number } = {
  memory: createFakeSupabaseMemory(),
  userId: ADMIN_ID,
  rpcCalls: 0,
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "admin@example.com" } : null,
}));

// 與 fulfill_points_pack_order 相同：source_order_id unique，已有 credit 回 already_fulfilled。
function installFulfillRpc() {
  setFakeRpc(state.memory, "fulfill_points_pack_order", (args) => {
    state.rpcCalls += 1;
    const order = state.memory.orders.get(String(args?.order_id ?? ""));
    const profile = order ? state.memory.profiles.get(order.user_id) : undefined;
    if (!order || !profile) {
      return { data: [{ ok: false, reason: "not_found", points_balance: 0 }], error: null };
    }
    if (credits().length > 0) {
      return {
        data: [{ ok: true, reason: "already_fulfilled", points_balance: profile.points_balance }],
        error: null,
      };
    }
    state.memory.pointTransactions.set(`credit-${order.id}`, {
      id: `credit-${order.id}`,
      user_id: order.user_id,
      delta: 5,
      type: "credit_purchase",
      source_order_id: order.id,
      report_id: null,
    });
    profile.points_balance += 5;
    return {
      data: [{ ok: true, reason: "credited", points_balance: profile.points_balance }],
      error: null,
    };
  });
}

// 測試 fixture：已 paid、有 trade_no、無 credit 的點數包；不經 Webhook、不呼叫加點。
function seedOrder(overrides: Partial<FakeOrder> = {}) {
  state.memory.orders.set(ORDER_ID, {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "points_pack_5",
    merchant_trade_no: MTN,
    amount: 49,
    currency: "TWD",
    status: "paid",
    trade_no: "2609280000000001",
    payment_date: null,
    ...overrides,
  });
}

function credits() {
  return [...state.memory.pointTransactions.values()].filter(
    (row) => row.type === "credit_purchase" && row.source_order_id === ORDER_ID,
  );
}

function balance() {
  return state.memory.profiles.get(USER_ID)?.points_balance;
}

function actions() {
  return [...state.memory.adminActions.values()];
}

function compensatedNotifications() {
  return [...state.memory.notifications.values()].filter((row) => row.type === "admin_compensated");
}

async function postCompensation(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/admin/compensations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const VALID = { action: "credit_points", sourceOrderId: ORDER_ID, reason: "Webhook 漏送，人工補點" };

describe("POST /api/admin/compensations", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = ADMIN_ID;
    state.rpcCalls = 0;
    vi.stubEnv("ADMIN_USER_IDS", `${ADMIN_ID}`);
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, { points_balance: 2 });
    seedFakeUser(state.memory, { id: ADMIN_ID, email: "admin@example.com" });
    installFulfillRpc();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("S6-1: credits +5 once, writes an ok admin action and one admin_compensated", async () => {
    seedOrder();

    const response = await postCompensation(VALID);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "ok" });
    expect(balance()).toBe(7);
    expect(credits()).toHaveLength(1);
    const [action] = actions();
    expect(actions()).toHaveLength(1);
    expect(action).toMatchObject({
      admin_user_id: ADMIN_ID,
      action: "credit_points",
      reason: VALID.reason,
      source_order_id: ORDER_ID,
      result: "ok",
      idempotency_key: `compensate:${ORDER_ID}:credit_points`,
    });
    expect(action?.before_state).toMatchObject({ points_balance: 2 });
    expect(action?.after_state).toMatchObject({ points_balance: 7 });
    expect(compensatedNotifications()).toEqual([
      expect.objectContaining({
        user_id: USER_ID,
        source_type: "admin_action",
        source_id: action?.id,
        idempotency_key: `admin:${action?.id}`,
      }),
    ]);
  });

  it("S6-2: the same compensation again is skipped_already_fulfilled without a second credit", async () => {
    seedOrder();
    await postCompensation(VALID);

    const response = await postCompensation(VALID);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "skipped_already_fulfilled" });
    expect(balance()).toBe(7);
    expect(credits()).toHaveLength(1);
    expect(compensatedNotifications()).toHaveLength(1);
  });

  it("S6-2: replaying the unit 5 success webhook after compensation adds nothing", async () => {
    seedOrder();
    await postCompensation(VALID);
    vi.stubEnv("ECPAY_HASH_KEY", HASH_KEY);
    vi.stubEnv("ECPAY_HASH_IV", HASH_IV);
    const fields: Record<string, string> = {
      MerchantID: "2000132",
      MerchantTradeNo: MTN,
      RtnCode: "1",
      RtnMsg: "交易成功",
      TradeNo: "2609280000000001",
      TradeAmt: "49",
      PaymentDate: "2026/09/28 12:00:00",
      PaymentType: "Credit_CreditCard",
      SimulatePaid: "0",
    };
    fields.CheckMacValue = computeCheckMacValue(fields, HASH_KEY, HASH_IV);
    const { POST: webhook } = await import("../../payments/ecpay/webhook/route");

    const response = await webhook(
      new Request("http://localhost/api/payments/ecpay/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString(),
      }),
    );

    expect(await response.text()).toBe("1|OK");
    expect(balance()).toBe(7);
    expect(credits()).toHaveLength(1);
  });

  it("skips without calling the credit function when the order already has a credit", async () => {
    seedOrder();
    state.memory.pointTransactions.set("existing", {
      id: "existing",
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });

    const response = await postCompensation(VALID);

    expect(await response.json()).toEqual({ result: "skipped_already_fulfilled" });
    expect(state.rpcCalls).toBe(0);
    expect(actions()).toEqual([
      expect.objectContaining({ result: "skipped_already_fulfilled" }),
    ]);
    expect(compensatedNotifications()).toHaveLength(0);
  });

  it.each<[string, Partial<FakeOrder>]>([
    ["pending", { status: "pending" }],
    ["failed", { status: "failed" }],
    ["missing trade_no", { trade_no: null }],
    ["empty trade_no", { trade_no: "" }],
    ["not a points pack", { plan_id: "unlock_report_lifetime", amount: 99 }],
  ])("S6-3: rejects %s with 422 and a rejected action, leaving status and balance", async (_label, overrides) => {
    seedOrder(overrides);
    const statusBefore = state.memory.orders.get(ORDER_ID)?.status;

    const response = await postCompensation(VALID);

    expect(response.status).toBe(422);
    expect(state.memory.orders.get(ORDER_ID)?.status).toBe(statusBefore);
    expect(balance()).toBe(2);
    expect(state.rpcCalls).toBe(0);
    expect(actions()).toHaveLength(1);
    expect(actions()[0]).toMatchObject({ result: "rejected" });
    expect(actions()[0]?.idempotency_key).toMatch(
      new RegExp(`^compensate:${ORDER_ID}:credit_points:rejected:[0-9a-f-]{36}$`),
    );
    expect(compensatedNotifications()).toHaveLength(0);
  });

  it("allows a successful compensation after an earlier rejection", async () => {
    seedOrder({ status: "pending" });
    await postCompensation(VALID);
    await postCompensation(VALID);
    seedOrder({ status: "paid" });

    const response = await postCompensation(VALID);

    expect(await response.json()).toEqual({ result: "ok" });
    expect(balance()).toBe(7);
    expect(actions().filter((row) => row.result === "rejected")).toHaveLength(2);
    expect(actions().filter((row) => row.result === "ok")).toHaveLength(1);
  });

  it("accepts a null payment_date", async () => {
    seedOrder({ payment_date: null });

    expect(await (await postCompensation(VALID)).json()).toEqual({ result: "ok" });
  });

  it("rejects actions other than credit_points with 422 本版只接受補點", async () => {
    seedOrder();

    const response = await postCompensation({ ...VALID, action: "grant_lifetime" });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "本版只接受補點" });
    expect(balance()).toBe(2);
  });

  it.each(["", "   "])("rejects a blank reason (%j) with 422", async (reason) => {
    seedOrder();

    const response = await postCompensation({ ...VALID, reason });

    expect(response.status).toBe(422);
    expect(balance()).toBe(2);
  });

  it("S6-4: returns 401 without a session and writes no admin action", async () => {
    state.userId = null;
    seedOrder();

    const response = await postCompensation(VALID);

    expect(response.status).toBe(401);
    expect(actions()).toHaveLength(0);
    expect(balance()).toBe(2);
  });

  it("S6-4: returns 403 for a non-admin and writes no admin action", async () => {
    state.userId = USER_ID;
    seedOrder();

    const response = await postCompensation(VALID);

    expect(response.status).toBe(403);
    expect(actions()).toHaveLength(0);
    expect(balance()).toBe(2);
  });

  it("S6-4: returns 403 for everyone when ADMIN_USER_IDS is empty", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "");
    seedOrder();

    const response = await postCompensation(VALID);

    expect(response.status).toBe(403);
    expect(actions()).toHaveLength(0);
  });
});
