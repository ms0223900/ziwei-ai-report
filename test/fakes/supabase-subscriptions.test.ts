import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addOneMonthTaipei,
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeSubscription,
  seedFakeUser,
  setFakeRpc,
  type FakeSupabaseMemory,
} from "./supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const REPORT_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-01-15T00:00:00.000Z");

function rpcRow(result: { data: unknown }) {
  return (result.data as Record<string, unknown>[])[0];
}

function seedPaidMonthlyOrder(memory: FakeSupabaseMemory, paymentDate: string) {
  memory.orders.set(ORDER_ID, {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "subscribe_report_monthly",
    merchant_trade_no: "MTN1",
    amount: 19,
    currency: "TWD",
    status: "paid",
    trade_no: "T1",
    payment_date: paymentDate,
  });
}

describe("fake supabase subscriptions", () => {
  let memory: FakeSupabaseMemory;
  let client: ReturnType<typeof createFakeServiceRoleClient>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    memory = createFakeSupabaseMemory();
    client = createFakeServiceRoleClient(memory);
    seedFakeUser(memory, { id: USER_ID, email: "a@example.com" }, { points_balance: 3 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores subscriptions and events and rejects duplicate keys with 23505", async () => {
    const first = await client
      .from("subscriptions")
      .insert({ user_id: USER_ID, merchant_trade_no: "MTN1", status: "active" })
      .select()
      .single();
    const duplicateUser = await client
      .from("subscriptions")
      .insert({ user_id: USER_ID, merchant_trade_no: "MTN2", status: "active" })
      .select()
      .single();
    await client
      .from("subscription_events")
      .insert({ idempotency_key: "k1", user_id: USER_ID })
      .select()
      .single();
    const duplicateKey = await client
      .from("subscription_events")
      .insert({ idempotency_key: "k1", user_id: USER_ID })
      .select()
      .single();

    expect(first.error).toBeNull();
    expect(duplicateUser.error).toMatchObject({ code: "23505" });
    expect(duplicateKey.error).toMatchObject({ code: "23505" });
  });

  it("defaults created_at on orders and subscriptions inserts", async () => {
    await client.from("orders").insert({ id: ORDER_ID, merchant_trade_no: "MTN1" });
    const { data } = await client
      .from("subscriptions")
      .insert({ user_id: USER_ID, merchant_trade_no: "MTN1" })
      .select()
      .single();

    expect(memory.orders.get(ORDER_ID)?.created_at).toBe(NOW.toISOString());
    expect((data as { created_at: string }).created_at).toBe(NOW.toISOString());
  });

  it("adds one Taipei calendar month and clamps month ends like Postgres", () => {
    expect(addOneMonthTaipei("2026-01-31T04:00:00.000Z")).toBe("2026-02-28T04:00:00.000Z");
    expect(addOneMonthTaipei("2026-01-31T16:30:00.000Z")).toBe("2026-02-28T16:30:00.000Z");
    expect(addOneMonthTaipei("2026-03-15T00:00:00.000Z")).toBe("2026-04-15T00:00:00.000Z");
  });

  it("activates once from a paid monthly order and treats replays as fulfilled", async () => {
    seedPaidMonthlyOrder(memory, "2026-01-10T00:00:00.000Z");

    const first = rpcRow(await client.rpc("activate_subscription_from_order", { p_order_id: ORDER_ID }));
    const replay = rpcRow(await client.rpc("activate_subscription_from_order", { p_order_id: ORDER_ID }));

    const [sub] = [...memory.subscriptions.values()];
    expect(first).toEqual({ ok: true, reason: "activated" });
    expect(replay).toEqual({ ok: true, reason: "already_fulfilled" });
    expect(sub).toMatchObject({ status: "active", current_period_end: "2026-02-10T00:00:00.000Z" });
    expect(memory.subscriptionEvents.size).toBe(1);
    expect(memory.profiles.get(USER_ID)).toMatchObject({
      subscription_status: "active",
      access_status: "locked",
      points_balance: 3,
    });
  });

  it("renews once, keeps duplicates idempotent and never revives a cancelled subscription", async () => {
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-02-10T00:00:00.000Z",
    });
    const event = (key: string, type: string) =>
      client.rpc("apply_subscription_period_event", {
        p_merchant_trade_no: "MTN1",
        p_idempotency_key: key,
        p_event_type: type,
        p_rtn_code: "1",
        p_total_success_times: 2,
        p_gwsr: "g",
        p_processed_at: null,
      });

    expect(rpcRow(await event("period:MTN1:1", "first_duplicate")).reason).toBe("duplicate_first");
    expect(rpcRow(await event("period:MTN1:2", "renewal_success")).reason).toBe("renewed");
    expect(rpcRow(await event("period:MTN1:2", "renewal_success")).reason).toBe("already_processed");
    const renewedEnd = [...memory.subscriptions.values()][0].current_period_end;
    expect(rpcRow(await client.rpc("cancel_subscription", { p_user_id: USER_ID })).reason).toBe("cancelled");
    expect(rpcRow(await client.rpc("cancel_subscription", { p_user_id: USER_ID })).reason).toBe("already_cancelled");
    expect(rpcRow(await event("period:MTN1:3", "renewal_success")).reason).toBe("recorded_inactive");

    const [sub] = [...memory.subscriptions.values()];
    expect(renewedEnd).toBe("2026-03-10T00:00:00.000Z");
    expect(sub.status).toBe("cancelled");
    expect(new Date(sub.current_period_end).getTime()).toBeLessThan(NOW.getTime());
    expect(memory.subscriptionEvents.size).toBe(4);
  });

  it("marks past_due on payment failure without moving the period end", async () => {
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-02-10T00:00:00.000Z",
    });

    const result = rpcRow(
      await client.rpc("apply_subscription_period_event", {
        p_merchant_trade_no: "MTN1",
        p_idempotency_key: "failed:MTN1:g3",
        p_event_type: "payment_failed",
        p_rtn_code: "10100058",
        p_total_success_times: 1,
        p_gwsr: "g3",
        p_processed_at: null,
      }),
    );

    expect(result.reason).toBe("past_due");
    expect([...memory.subscriptions.values()][0]).toMatchObject({
      status: "past_due",
      current_period_end: "2026-02-10T00:00:00.000Z",
    });
  });

  it("unlocks with subscription reason without debiting while the period is active", async () => {
    seedFakeReport(memory, {
      id: REPORT_ID,
      user_id: USER_ID,
      generation_status: "success",
      basic_json: {},
      advanced_json: {},
    });
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-02-10T00:00:00.000Z",
    });

    const active = rpcRow(
      await client.rpc("unlock_report_with_point", { report_id: REPORT_ID, p_user_id: USER_ID }),
    );
    await client.rpc("cancel_subscription", { p_user_id: USER_ID });
    const afterCancel = rpcRow(
      await client.rpc("unlock_report_with_point", { report_id: REPORT_ID, p_user_id: USER_ID }),
    );

    expect(active).toEqual({ ok: true, reason: "subscription", points_balance: 3 });
    expect(afterCancel).toEqual({ ok: true, reason: "unlocked", points_balance: 2 });
    expect(memory.reportUnlocks.size).toBe(1);
  });

  it("lets injected rpc handlers override the built-in ones", async () => {
    setFakeRpc(memory, "cancel_subscription", { data: [{ ok: false, reason: "stubbed" }], error: null });

    const result = rpcRow(await client.rpc("cancel_subscription", { p_user_id: USER_ID }));

    expect(result.reason).toBe("stubbed");
  });
});
