import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNotification } from "../notifications/insert-notification";

// failed：本次或先前已是 failed；skipped：訂單不是 pending（例如已 paid），未更動；error：找不到或讀寫失敗。
export type MarkOrderFailedResult = "failed" | "skipped" | "error";

// 所有 pending → failed 的唯一入口（ReturnURL、Checkpoint／測試 helper）。不加點、不改 access_status、不寫訂閱。
// 做成 TS 函式而非 SQL RPC：通知 INSERT 與狀態更新分開提交，通知失敗不會把 failed 回滾成 pending。
export async function markOrderFailed(
  client: SupabaseClient,
  orderId: string,
): Promise<MarkOrderFailedResult> {
  // 帶 status=pending 條件：並發下已 paid 的訂單不會被改成 failed。沒有符合的列不算錯，下方重讀判斷。
  const { error: updateError } = await client
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId)
    .eq("status", "pending");

  const { data: order, error: readError } = await client
    .from("orders")
    .select()
    .eq("id", orderId)
    .maybeSingle();
  if (readError || !order) {
    return "error";
  }

  const current = order as { status?: string; user_id?: string };
  if (current.status === "pending") {
    console.error("[mark-order-failed] status update failed", orderId, updateError);
    return "error";
  }
  if (current.status !== "failed") {
    return "skipped";
  }

  // 已 failed 時由 unique key 跳過，通知維持一則。
  await insertNotification(client, {
    userId: String(current.user_id),
    type: "order_failed",
    sourceType: "order",
    sourceId: orderId,
    idempotencyKey: `order-failed:${orderId}`,
  });
  return "failed";
}
