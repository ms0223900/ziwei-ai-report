import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  failNextNotificationInsert,
  type FakeSupabaseMemory,
} from "../../test/fakes/supabase";
import {
  insertNotification,
  type InsertNotificationInput,
} from "./insert-notification";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

const INPUT: InsertNotificationInput = {
  userId: USER_ID,
  type: "order_pending",
  sourceType: "order",
  sourceId: ORDER_ID,
  idempotencyKey: `order-pending:${ORDER_ID}`,
};

describe("insertNotification", () => {
  let memory: FakeSupabaseMemory;
  let client: SupabaseClient;

  beforeEach(() => {
    memory = createFakeSupabaseMemory();
    client = createFakeServiceRoleClient(memory) as unknown as SupabaseClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts one row on first call and returns inserted", async () => {
    await expect(insertNotification(client, INPUT)).resolves.toBe("inserted");
    expect(memory.notifications.size).toBe(1);
    const row = [...memory.notifications.values()][0];
    expect(row).toMatchObject({
      user_id: USER_ID,
      type: "order_pending",
      source_type: "order",
      source_id: ORDER_ID,
      idempotency_key: `order-pending:${ORDER_ID}`,
      read_at: null,
    });
  });

  it("skips the same idempotencyKey without adding a row (23505 is not an error)", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    await insertNotification(client, INPUT);
    await expect(insertNotification(client, INPUT)).resolves.toBe("skipped");
    expect(memory.notifications.size).toBe(1);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("does not throw on other insert errors, returns failed and logs on the server", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    failNextNotificationInsert(memory, { code: "XX000", message: "boom" });
    await expect(insertNotification(client, INPUT)).resolves.toBe("failed");
    expect(memory.notifications.size).toBe(0);
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it("returns failed instead of throwing when the client itself throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      from() {
        throw new Error("network down");
      },
    } as unknown as SupabaseClient;
    await expect(insertNotification(broken, INPUT)).resolves.toBe("failed");
  });

  it('imports "server-only" in the helper source', () => {
    const source = readFileSync(
      join(process.cwd(), "lib/notifications/insert-notification.ts"),
      "utf8",
    );
    expect(source).toMatch(/^import "server-only";/m);
  });
});
