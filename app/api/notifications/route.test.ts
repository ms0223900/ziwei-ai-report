import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeSubscription,
  seedFakeUser,
  type FakeNotification,
  type FakeSupabaseMemory,
} from "../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SUB_ORDER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ADMIN_ORDER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../lib/supabase/session", () => ({
  createSessionClient: async () => createFakeServiceRoleClient(state.memory),
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "yuan@example.com" } : null,
}));

let seq = 0;
function seedNotification(overrides: Partial<FakeNotification> & Pick<FakeNotification, "type">) {
  seq += 1;
  const row: FakeNotification = {
    id: `n-${String(seq).padStart(3, "0")}`,
    user_id: USER_ID,
    source_type: "order",
    source_id: ORDER_ID,
    idempotency_key: `k-${seq}`,
    created_at: `2026-09-${String(10 + seq).padStart(2, "0")}T00:00:00.000Z`,
    read_at: null,
    ...overrides,
  };
  state.memory.notifications.set(row.id, row);
  return row;
}

async function getList() {
  const { GET } = await import("./route");
  return GET();
}

type Item = { id: string; type: string; text: string; href: string; createdAt: string; readAt: string | null };

async function items(): Promise<Item[]> {
  const body = (await (await getList()).json()) as { notifications?: Item[] } | Item[];
  return Array.isArray(body) ? body : (body.notifications ?? []);
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    seq = 0;
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedFakeUser(state.memory, { id: OTHER_ID, email: "other@example.com" });
    vi.resetModules();
  });

  it("returns 401 { error } without a session", async () => {
    state.userId = null;

    const response = await getList();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "請先登入" });
  });

  it("returns only the session user's rows, newest first, with exactly six fields", async () => {
    seedNotification({ type: "order_pending" });
    seedNotification({ type: "order_failed", user_id: OTHER_ID });
    seedNotification({ type: "order_failed" });

    const response = await getList();
    const list = await items();

    expect(response.status).toBe(200);
    expect(list.map((row) => row.id)).toEqual(["n-003", "n-001"]);
    for (const row of list) {
      expect(Object.keys(row).sort()).toEqual(
        ["createdAt", "href", "id", "readAt", "text", "type"].sort(),
      );
    }
    expect(list[1]).toMatchObject({
      type: "order_pending",
      createdAt: "2026-09-11T00:00:00.000Z",
      readAt: null,
    });
  });

  it("maps text from the type constants", async () => {
    seedNotification({ type: "order_pending" });
    seedNotification({ type: "order_failed" });
    seedNotification({ type: "unlock_completed" });
    seedNotification({ type: "credit_completed" });
    seedNotification({ type: "report_unlocked", source_type: "report", source_id: "r1" });

    const byType = Object.fromEntries((await items()).map((row) => [row.type, row.text]));

    expect(byType).toEqual({
      order_pending: "付款已受理，正在確認中",
      order_failed: "付款未完成，尚未變更權益",
      unlock_completed: "付款成功：完整解讀已解鎖",
      credit_completed: "付款成功：已新增 5 點",
      report_unlocked: "已用 1 點解鎖此報告",
    });
  });

  it("formats subscription_active text with the owning subscription's period end", async () => {
    const sub = seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-10-18T04:00:00.000Z",
      order_id: SUB_ORDER_ID,
    });
    state.memory.subscriptionEvents.set("evt-1", {
      id: "evt-1",
      subscription_id: sub.id,
      user_id: USER_ID,
      event_type: "first_success",
      idempotency_key: "return:MTN1",
      gwsr: null,
      total_success_times: null,
      rtn_code: null,
      processed_at: "2026-09-18T04:00:00.000Z",
    });
    seedNotification({ type: "subscription_active", source_type: "subscription_event", source_id: "evt-1" });

    const [row] = await items();

    expect(row?.text).toBe("訂閱有效至 2026/10/18");
    expect(row?.href).toBe("/");
  });

  it("falls back to 訂閱有效至 when the subscription cannot be read", async () => {
    seedNotification({ type: "subscription_active", source_type: "subscription_event", source_id: "missing" });

    const [row] = await items();

    expect(row?.text).toBe("訂閱有效至");
  });

  it("links order notifications to the order result page and reward notifications to /", async () => {
    seedNotification({ type: "order_pending" });
    seedNotification({ type: "order_failed" });
    seedNotification({ type: "unlock_completed" });
    seedNotification({ type: "credit_completed" });
    seedNotification({ type: "report_unlocked", source_type: "report", source_id: "r1" });

    const byType = Object.fromEntries((await items()).map((row) => [row.type, row.href]));

    expect(byType).toEqual({
      order_pending: `/orders/processing?order=${ORDER_ID}`,
      order_failed: `/orders/processing?order=${ORDER_ID}`,
      unlock_completed: "/",
      credit_completed: "/",
      report_unlocked: "/",
    });
  });

  it("links subscription_inactive to the owning subscription's order", async () => {
    const sub = seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-09-01T00:00:00.000Z",
      status: "cancelled",
      order_id: SUB_ORDER_ID,
    });
    state.memory.subscriptionEvents.set("evt-c", {
      id: "evt-c",
      subscription_id: sub.id,
      user_id: USER_ID,
      event_type: "cancelled",
      idempotency_key: `cancel:${sub.id}:MTN1`,
      gwsr: null,
      total_success_times: null,
      rtn_code: null,
      processed_at: "2026-09-20T00:00:00.000Z",
    });
    seedNotification({ type: "subscription_inactive", source_type: "subscription_event", source_id: "evt-c" });

    const [row] = await items();

    expect(row).toMatchObject({
      text: "訂閱已失效",
      href: `/orders/processing?order=${SUB_ORDER_ID}`,
    });
  });

  it("links admin_compensated to admin_actions.source_order_id", async () => {
    state.memory.adminActions.set("act-1", {
      id: "act-1",
      admin_user_id: OTHER_ID,
      action: "credit_points",
      reason: "測試",
      source_order_id: ADMIN_ORDER_ID,
      idempotency_key: "admin-k",
      before_state: {},
      after_state: {},
      result: "ok",
    });
    seedNotification({ type: "admin_compensated", source_type: "admin_action", source_id: "act-1" });

    const [row] = await items();

    expect(row).toMatchObject({
      text: "已完成人工補償：已新增 5 點",
      href: `/orders/processing?order=${ADMIN_ORDER_ID}`,
    });
  });
});
