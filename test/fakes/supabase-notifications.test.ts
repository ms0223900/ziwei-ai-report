import { beforeEach, describe, expect, it } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  failNextNotificationInsert,
  type FakeSupabaseMemory,
} from "./supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function notification(key: string, extra: Record<string, unknown> = {}) {
  return {
    user_id: USER_ID,
    type: "order_pending",
    source_type: "order",
    source_id: ORDER_ID,
    idempotency_key: key,
    ...extra,
  };
}

function adminAction(key: string) {
  return {
    admin_user_id: USER_ID,
    action: "credit_points",
    reason: "測試補償",
    source_order_id: ORDER_ID,
    idempotency_key: key,
    before_state: {},
    after_state: {},
    result: "ok",
  };
}

describe("fake supabase notifications / admin_actions", () => {
  let memory: FakeSupabaseMemory;
  let client: ReturnType<typeof createFakeServiceRoleClient>;

  beforeEach(() => {
    memory = createFakeSupabaseMemory();
    client = createFakeServiceRoleClient(memory);
  });

  it("starts both tables empty", async () => {
    expect((await client.from("notifications").select()).data).toEqual([]);
    expect((await client.from("admin_actions").select()).data).toEqual([]);
  });

  it("fills id, created_at and null read_at on notification insert", async () => {
    const { data, error } = await client
      .from("notifications")
      .insert(notification("k1"))
      .select()
      .single();
    expect(error).toBeNull();
    const row = data as Record<string, unknown>;
    expect(row.id).toMatch(UUID_RE);
    expect(typeof row.created_at).toBe("string");
    expect(row.read_at).toBeNull();
  });

  it("fills id and created_at on admin_actions insert", async () => {
    const { data } = await client
      .from("admin_actions")
      .insert(adminAction("a1"))
      .select()
      .single();
    const row = data as Record<string, unknown>;
    expect(row.id).toMatch(UUID_RE);
    expect(typeof row.created_at).toBe("string");
  });

  it.each(["notifications", "admin_actions"] as const)(
    "rejects a duplicate idempotency_key on %s with 23505",
    async (table) => {
      const row = table === "notifications" ? notification("dup") : adminAction("dup");
      const first = await client.from(table).insert(row).select().single();
      const second = await client.from(table).insert(row).select().single();
      expect(first.error).toBeNull();
      expect((second.error as { code?: string }).code).toBe("23505");
      expect(((await client.from(table).select()).data as unknown[]).length).toBe(1);
    },
  );

  it("selects by filter and updates read_at", async () => {
    await client.from("notifications").insert(notification("k1"));
    await client.from("notifications").insert(notification("k2", { user_id: "other" }));
    const own = await client.from("notifications").select().eq("user_id", USER_ID);
    expect((own.data as unknown[]).length).toBe(1);

    const readAt = "2026-01-15T00:00:00.000Z";
    await client
      .from("notifications")
      .update({ read_at: readAt })
      .eq("idempotency_key", "k1");
    const after = await client
      .from("notifications")
      .select()
      .eq("idempotency_key", "k1")
      .single();
    expect((after.data as Record<string, unknown>).read_at).toBe(readAt);
  });

  it("fails only the next notification insert when injected, and stores nothing", async () => {
    failNextNotificationInsert(memory, { code: "XX000", message: "boom" });
    const failed = await client.from("notifications").insert(notification("k1")).select().single();
    expect(failed.error).toEqual({ code: "XX000", message: "boom" });
    expect(memory.notifications.size).toBe(0);

    const retry = await client.from("notifications").insert(notification("k1")).select().single();
    expect(retry.error).toBeNull();
    expect(memory.notifications.size).toBe(1);
  });

  it("does not let the injection affect admin_actions", async () => {
    failNextNotificationInsert(memory);
    const result = await client.from("admin_actions").insert(adminAction("a1")).select().single();
    expect(result.error).toBeNull();
    expect(memory.notificationInsertErrors).toHaveLength(1);
  });
});
