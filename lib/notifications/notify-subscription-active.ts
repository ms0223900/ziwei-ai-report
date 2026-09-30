import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification } from "./insert-notification";

// RPC 不回傳事件 id，另以事件的 idempotency_key 查回 id 當通知鍵。查不到時不寫通知、不影響回應。
export async function notifySubscriptionActive(
  client: SupabaseClient,
  eventIdempotencyKey: string,
): Promise<void> {
  const { data, error } = await client
    .from("subscription_events")
    .select()
    .eq("idempotency_key", eventIdempotencyKey)
    .maybeSingle();
  const event = data as { id?: string; user_id?: string } | null;
  if (error || !event?.id || !event.user_id) {
    console.error("[notifications] subscription event not found", eventIdempotencyKey, error);
    return;
  }
  await insertNotification(client, {
    userId: event.user_id,
    type: "subscription_active",
    sourceType: "subscription_event",
    sourceId: event.id,
    idempotencyKey: `sub:${event.id}`,
  });
}
