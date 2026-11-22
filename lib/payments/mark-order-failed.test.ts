import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  failNextNotificationInsert,
  seedFakeUser,
  type FakeOrderStatus,
  type FakeSupabaseMemory,
} from "../../test/fakes/supabase";
import { markOrderFailed } from "./mark-order-failed";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

function seedOrder(memory: FakeSupabaseMemory, status: FakeOrderStatus) {
  memory.orders.set(ORDER_ID, {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "points_pack_5",
    merchant_trade_no: "MTN1",
    amount: 49,
    currency: "TWD",
    status,
    trade_no: null,
    payment_date: null,
  });
}

function failedNotifications(memory: FakeSupabaseMemory) {
  return [...memory.notifications.values()].filter((row) => row.type === "order_failed");
}

// Records every filter applied to an orders UPDATE chain, so the test can prove the pending guard.
function recordingClient(memory: FakeSupabaseMemory) {
  const base = createFakeServiceRoleClient(memory);
  const updateFilters: Array<Array<[string, unknown]>> = [];
  const client = {
    ...base,
    from(table: string) {
      const api = base.from(table) as Record<string, unknown> & {
        update: (row: Record<string, unknown>) => unknown;
        eq: (column: string, value: unknown) => unknown;
      };
      if (table !== "orders") {
        return api;
      }
      const originalUpdate = api.update.bind(api);
      const originalEq = api.eq.bind(api);
      let filters: Array<[string, unknown]> | null = null;
      api.update = (row) => {
        filters = [];
        updateFilters.push(filters);
        return originalUpdate(row);
      };
      api.eq = (column, value) => {
        filters?.push([column, value]);
        return originalEq(column, value);
      };
      return api;
    },
  };
  return { client: client as unknown as SupabaseClient, updateFilters };
}

describe("markOrderFailed", () => {
  let memory: FakeSupabaseMemory;
  let client: SupabaseClient;

  beforeEach(() => {
    memory = createFakeSupabaseMemory();
    client = createFakeServiceRoleClient(memory) as unknown as SupabaseClient;
    seedFakeUser(memory, { id: USER_ID, email: "a@example.com" }, { points_balance: 3 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moves pending to failed and writes exactly one order_failed notification", async () => {
    seedOrder(memory, "pending");

    await expect(markOrderFailed(client, ORDER_ID)).resolves.toBe("failed");

    expect(memory.orders.get(ORDER_ID)?.status).toBe("failed");
    const rows = failedNotifications(memory);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: USER_ID,
      source_type: "order",
      source_id: ORDER_ID,
      idempotency_key: `order-failed:${ORDER_ID}`,
    });
  });

  it("does not touch points, access, ledger or subscriptions", async () => {
    seedOrder(memory, "pending");
    const profileBefore = { ...memory.profiles.get(USER_ID) };

    await markOrderFailed(client, ORDER_ID);

    expect(memory.profiles.get(USER_ID)).toEqual(profileBefore);
    expect(memory.pointTransactions.size).toBe(0);
    expect(memory.subscriptions.size).toBe(0);
    expect(memory.subscriptionEvents.size).toBe(0);
  });

  it("keeps an already failed order failed with a single notification", async () => {
    seedOrder(memory, "pending");
    await markOrderFailed(client, ORDER_ID);

    await expect(markOrderFailed(client, ORDER_ID)).resolves.toBe("failed");

    expect(memory.orders.get(ORDER_ID)?.status).toBe("failed");
    expect(failedNotifications(memory)).toHaveLength(1);
  });

  it("S4-6: leaves a paid order paid and writes no order_failed", async () => {
    seedOrder(memory, "paid");

    await expect(markOrderFailed(client, ORDER_ID)).resolves.toBe("skipped");

    expect(memory.orders.get(ORDER_ID)?.status).toBe("paid");
    expect(failedNotifications(memory)).toHaveLength(0);
  });

  it("guards the status update with status=pending", async () => {
    seedOrder(memory, "pending");
    const recorded = recordingClient(memory);

    await markOrderFailed(recorded.client, ORDER_ID);

    expect(recorded.updateFilters.length).toBeGreaterThan(0);
    for (const filters of recorded.updateFilters) {
      expect(filters).toContainEqual(["id", ORDER_ID]);
      expect(filters).toContainEqual(["status", "pending"]);
    }
  });

  it("keeps failed and does not throw when the notification insert fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    seedOrder(memory, "pending");
    failNextNotificationInsert(memory);

    await expect(markOrderFailed(client, ORDER_ID)).resolves.toBe("failed");

    expect(memory.orders.get(ORDER_ID)?.status).toBe("failed");
    expect(memory.notifications.size).toBe(0);
  });

  it("returns error for an unknown order without writing anything", async () => {
    await expect(markOrderFailed(client, ORDER_ID)).resolves.toBe("error");
    expect(memory.notifications.size).toBe(0);
  });

  it('imports "server-only" in the source', () => {
    const source = readFileSync(
      join(process.cwd(), "lib/payments/mark-order-failed.ts"),
      "utf8",
    );
    expect(source).toMatch(/^import "server-only";/m);
  });
});
