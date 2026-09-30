// TODO(US-019)：實作。此為 US-018 測試用空殼，只為讓測試能載入。
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProcessingResult = { status: number; body: Record<string, unknown> };

export async function readProcessingResult(
  client: SupabaseClient,
  userId: string,
  orderParam: string | null,
  now: Date,
): Promise<ProcessingResult> {
  void client;
  void userId;
  void orderParam;
  void now;
  throw new Error("not implemented");
}
