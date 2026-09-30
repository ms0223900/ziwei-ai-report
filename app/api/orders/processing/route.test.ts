import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeSubscription,
  seedFakeUser,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER_ORDER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MISSING_ORDER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const NOW = new Date("2026-10-01T00:00:00.000Z");
const CREATED_AT = "2026-09-28T00:00:00.000Z";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "yuan@example.com" } : null,
}));

const AMOUNTS: Record<string, number> = {
  unlock_report_lifetime: 99,
  points_pack_5: 49,
  subscribe_report_monthly: 19,
};

function seedOrder(overrides: Partial<FakeOrder> = {}): FakeOrder {
  const planId = overrides.plan_id ?? "unlock_report_lifetime";
  const order: FakeOrder = {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: planId,
    merchant_trade_no: `MTN-${overrides.id ?? ORDER_ID}`.slice(0, 20),
    amount: AMOUNTS[planId] ?? 99,
    currency: "TWD",
    status: "pending",
    trade_no: null,
    payment_date: null,
    created_at: CREATED_AT,
    ...overrides,
  };
  state.memory.orders.set(order.id, order);
  return order;
}

function setAccess(status: "locked" | "unlocked", points = 0) {
  const profile = state.memory.profiles.get(USER_ID)!;
  state.memory.profiles.set(USER_ID, { ...profile, access_status: status, points_balance: points });
}

function seedCredit(orderId: string) {
  state.memory.pointTransactions.set(`credit-${orderId}`, {
    id: `credit-${orderId}`,
    user_id: USER_ID,
    delta: 5,
    type: "credit_purchase",
    source_order_id: orderId,
    trade_no: null,
    payment_date: null,
  });
}

function seedOwnSubscription(options: {
  orderId: string | null;
  periodEnd: string;
  status?: "active" | "past_due" | "cancelled" | "expired";
  firstSuccess?: boolean;
  merchantTradeNo?: string;
}) {
  const sub = seedFakeSubscription(state.memory, {
    user_id: USER_ID,
    merchant_trade_no: options.merchantTradeNo ?? "MTN-SUB",
    current_period_end: options.periodEnd,
    status: options.status ?? "active",
    order_id: options.orderId,
  });
  if (options.firstSuccess !== false) {
    const id = crypto.randomUUID();
    state.memory.subscriptionEvents.set(id, {
      id,
      subscription_id: sub.id,
      user_id: USER_ID,
      event_type: "first_success",
      idempotency_key: `return:${sub.merchant_trade_no}`,
      gwsr: null,
      total_success_times: null,
      rtn_code: null,
      processed_at: CREATED_AT,
    });
  }
  return sub;
}

async function getProcessing(query: string) {
  const { GET } = await import("./route");
  return GET(new Request(`http://localhost/api/orders/processing${query}`));
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("GET /api/orders/processing", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedFakeUser(state.memory, { id: OTHER_ID, email: "other@example.com" });
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("S2-1: own pending order on an unlocked account is accepted with a refresh CTA", async () => {
    seedOrder({ status: "pending" });
    setAccess("unlocked");

    const response = await getProcessing(`?order=${ORDER_ID}`);
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      screen: "accepted",
      title: "付款已受理，正在確認",
      detail: "付款已受理，正在確認",
      delivery: null,
      primaryCta: { kind: "refresh" },
    });
  });

  it("S2-2: paid points pack without its own credit is needs_manual and writes no notification", async () => {
    seedOrder({ plan_id: "points_pack_5", status: "paid" });
    seedCredit(OTHER_ORDER_ID);

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "needs_manual",
      title: "正在處理交付，權益尚未變更",
      delivery: null,
      primaryCta: { kind: "refresh" },
    });
    expect(state.memory.notifications.size).toBe(0);
  });

  it("S2-3: paid lifetime on an unlocked account is unlock_completed", async () => {
    seedOrder({ status: "paid" });
    setAccess("unlocked");

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "unlock_completed",
      title: "完整解讀已解鎖",
      delivery: { unlocked: true },
      primaryCta: { kind: "report" },
    });
  });

  it.each(["points_pack_5", "subscribe_report_monthly"])(
    "S2-3: paid %s on an unlocked account is not unlock_completed",
    async (planId) => {
      seedOrder({ plan_id: planId, status: "paid" });
      setAccess("unlocked");

      const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

      expect(body.screen).not.toBe("unlock_completed");
    },
  );

  it("S2-4: paid points pack with its own credit is points_credited with the profile balance", async () => {
    seedOrder({ plan_id: "points_pack_5", status: "paid" });
    seedCredit(ORDER_ID);
    setAccess("locked", 7);

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "points_credited",
      title: "已新增 5 點",
      detail: "已新增 5 點",
      delivery: { pointsAdded: 5, pointsBalance: 7 },
      primaryCta: { kind: "home" },
    });
  });

  it("S2-5: paid monthly with its own first_success inside the period is subscription_active", async () => {
    seedOrder({ plan_id: "subscribe_report_monthly", status: "paid" });
    const sub = seedOwnSubscription({ orderId: ORDER_ID, periodEnd: "2026-10-28T04:00:00.000Z" });

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "subscription_active",
      delivery: { activeUntil: sub.current_period_end },
      primaryCta: { kind: "report" },
    });
    expect(String(body.title)).toMatch(/^訂閱有效至 /);
    expect(body.detail).toBe(body.title);
  });

  it("S2-6: paid monthly past the period end is subscription_inactive", async () => {
    seedOrder({ plan_id: "subscribe_report_monthly", status: "paid" });
    seedOwnSubscription({ orderId: ORDER_ID, periodEnd: "2026-09-30T00:00:00.000Z" });

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "subscription_inactive",
      title: "訂閱已失效，進階權益已收回",
      delivery: { inactive: true },
      primaryCta: { kind: "plans" },
    });
  });

  it.each(["cancelled", "expired"] as const)(
    "S2-6: paid monthly with a %s own subscription is subscription_inactive",
    async (status) => {
      seedOrder({ plan_id: "subscribe_report_monthly", status: "paid" });
      seedOwnSubscription({ orderId: ORDER_ID, periodEnd: "2026-10-28T04:00:00.000Z", status });

      const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

      expect(body.screen).toBe("subscription_inactive");
    },
  );

  it("conflict: paid monthly whose first_success belongs to another order's subscription is needs_manual", async () => {
    seedOrder({ plan_id: "subscribe_report_monthly", status: "paid" });
    seedOwnSubscription({ orderId: OTHER_ORDER_ID, periodEnd: "2026-10-28T04:00:00.000Z" });

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body.screen).toBe("needs_manual");
  });

  it("S2-7: failed order is incomplete even with unlock and a subscription row", async () => {
    seedOrder({ plan_id: "subscribe_report_monthly", status: "failed" });
    setAccess("unlocked");
    seedOwnSubscription({ orderId: ORDER_ID, periodEnd: "2026-10-28T04:00:00.000Z" });

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body).toMatchObject({
      screen: "incomplete",
      title: "付款未完成，尚未變更權益",
      delivery: null,
      primaryCta: { kind: "plans" },
    });
  });

  it("S2-8: payment query fields do not change the screen", async () => {
    seedOrder({ plan_id: "points_pack_5", status: "paid" });

    const plain = await readJson(await getProcessing(`?order=${ORDER_ID}`));
    const tampered = await readJson(
      await getProcessing(`?order=${ORDER_ID}&RtnCode=1&SimulatePaid=1&TradeAmt=49`),
    );

    expect(plain.screen).toBe("needs_manual");
    expect(tampered.screen).toBe(plain.screen);
  });

  it("S3-1: returns exactly 401 { error } without a session", async () => {
    state.userId = null;
    seedOrder({ status: "paid" });

    const response = await getProcessing(`?order=${ORDER_ID}`);

    expect(response.status).toBe(401);
    expect(await readJson(response)).toEqual({ error: "請先登入" });
  });

  it.each(["", "?order=", "?order=not-a-uuid"])(
    "S3-2: a missing or invalid order (%s) is accepted with order null",
    async (query) => {
      const response = await getProcessing(query);
      const body = await readJson(response);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        screen: "accepted",
        order: null,
        title: "付款已受理，正在確認",
        detail: "付款已受理，正在確認",
      });
    },
  );

  it("S3-3: another member's order and a missing order both return exactly 404 { error }", async () => {
    seedOrder({ id: OTHER_ORDER_ID, user_id: OTHER_ID, status: "paid" });

    const other = await getProcessing(`?order=${OTHER_ORDER_ID}`);
    const missing = await getProcessing(`?order=${MISSING_ORDER_ID}`);

    expect(other.status).toBe(404);
    expect(await readJson(other)).toEqual({ error: "找不到訂單" });
    expect(missing.status).toBe(404);
    expect(await readJson(missing)).toEqual({ error: "找不到訂單" });
  });

  it("S4-5: reading a pending order leaves it pending and writes no order_failed", async () => {
    seedOrder({ status: "pending", created_at: "2020-01-01T00:00:00.000Z" });

    await getProcessing(`?order=${ORDER_ID}`);

    expect(state.memory.orders.get(ORDER_ID)?.status).toBe("pending");
    expect(state.memory.notifications.size).toBe(0);
  });

  it("returns the order summary, CTAs and readAt without payload or internal fields", async () => {
    seedOrder({ plan_id: "points_pack_5", status: "paid", trade_no: "T123" });
    seedCredit(ORDER_ID);

    const body = await readJson(await getProcessing(`?order=${ORDER_ID}`));

    expect(body.order).toEqual({
      id: ORDER_ID,
      planId: "points_pack_5",
      amount: 49,
      currency: "TWD",
      status: "paid",
      createdAt: CREATED_AT,
    });
    expect(["home", "plans"]).toContain((body.secondaryCta as { kind?: string }).kind);
    expect(body.readAt).toBe(NOW.toISOString());
    expect(Object.keys(body).sort()).toEqual(
      ["delivery", "detail", "order", "primaryCta", "readAt", "screen", "secondaryCta", "title"].sort(),
    );
    const text = JSON.stringify(body);
    expect(text).not.toContain("T123");
    expect(text).not.toContain("merchant_trade_no");
    expect(text).not.toContain("CheckMacValue");
  });

  it("writes no notifications for any screen", async () => {
    const cases: Array<Partial<FakeOrder>> = [
      { id: "11111111-1111-4111-8111-111111111111", status: "pending" },
      { id: "22222222-2222-4222-8222-222222222222", status: "failed" },
      { id: "33333333-3333-4333-8333-333333333333", status: "paid" },
      { id: "44444444-4444-4444-8444-444444444444", plan_id: "points_pack_5", status: "paid" },
      { id: "55555555-5555-4555-8555-555555555555", plan_id: "subscribe_report_monthly", status: "paid" },
    ];
    setAccess("unlocked");
    for (const order of cases) {
      seedOrder(order);
      await getProcessing(`?order=${order.id}`);
    }

    expect(state.memory.notifications.size).toBe(0);
  });
});
