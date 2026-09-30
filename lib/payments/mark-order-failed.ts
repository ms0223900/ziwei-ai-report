// TODO(US-008)：實作。此為 US-007 測試用空殼，只為讓測試能載入。
import type { SupabaseClient } from "@supabase/supabase-js";

// failed：本次或先前已是 failed；skipped：訂單不是 pending（例如已 paid），未更動；error：找不到或讀寫失敗。
export type MarkOrderFailedResult = "failed" | "skipped" | "error";

export async function markOrderFailed(
  client: SupabaseClient,
  orderId: string,
): Promise<MarkOrderFailedResult> {
  void client;
  void orderId;
  throw new Error("not implemented");
}
