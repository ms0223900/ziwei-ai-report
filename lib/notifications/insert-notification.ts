import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSourceType, NotificationType } from "./types";

export type { NotificationSourceType, NotificationType } from "./types";

export type InsertNotificationInput = {
  userId: string;
  type: NotificationType;
  sourceType: NotificationSourceType;
  sourceId: string;
  idempotencyKey: string;
};

export type InsertNotificationResult = "inserted" | "skipped" | "failed";

const UNIQUE_VIOLATION = "23505";

// 只接受 service role client（notifications 僅 service role 可 INSERT）。
// 必須在履約交易提交之後呼叫；失敗只記 log，不 throw、不回滾履約。
export async function insertNotification(
  client: SupabaseClient,
  input: InsertNotificationInput,
): Promise<InsertNotificationResult> {
  try {
    const { error } = await client.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      source_type: input.sourceType,
      source_id: input.sourceId,
      idempotency_key: input.idempotencyKey,
    });
    if (!error) {
      return "inserted";
    }
    if (error.code === UNIQUE_VIOLATION) {
      return "skipped";
    }
    console.error("[notifications] insert failed", input.idempotencyKey, error);
    return "failed";
  } catch (error) {
    console.error("[notifications] insert threw", input.idempotencyKey, error);
    return "failed";
  }
}
