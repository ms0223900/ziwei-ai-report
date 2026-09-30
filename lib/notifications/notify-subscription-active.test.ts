import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
} from "../../test/fakes/supabase";
import { notifySubscriptionActive } from "./notify-subscription-active";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("notifySubscriptionActive", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes sub:{event_id} for the event found by its idempotency key", async () => {
    const memory = createFakeSupabaseMemory();
    memory.subscriptionEvents.set("evt-1", {
      id: "evt-1",
      subscription_id: "sub-1",
      user_id: USER_ID,
      event_type: "renewal_success",
      idempotency_key: "period:MTN:2",
      gwsr: null,
      total_success_times: 2,
      rtn_code: "1",
      processed_at: "2026-10-18T04:00:00.000Z",
    });
    const client = createFakeServiceRoleClient(memory) as unknown as SupabaseClient;

    await notifySubscriptionActive(client, "period:MTN:2");

    expect([...memory.notifications.values()]).toEqual([
      expect.objectContaining({
        user_id: USER_ID,
        type: "subscription_active",
        source_type: "subscription_event",
        source_id: "evt-1",
        idempotency_key: "sub:evt-1",
      }),
    ]);
  });

  it("writes nothing and does not throw when the event cannot be found", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory) as unknown as SupabaseClient;

    await expect(notifySubscriptionActive(client, "period:MISSING:2")).resolves.toBeUndefined();

    expect(memory.notifications.size).toBe(0);
  });
});
