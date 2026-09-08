/**
 * ajv 通過後寫入 reports。固定 status=basic、generation_status=success。
 * 驗證失敗路徑不呼叫本函式（由 Route 保證）。本版不提供 GET。
 */
import "server-only";
import { persistFailedError } from "../errors";
import { createServiceRoleClient } from "../supabase/server";
import type { FocusValue } from "../validation/birth";

export type InsertReportInput = {
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  focus: FocusValue;
  basic_json: Record<string, unknown>;
  advanced_json: Record<string, unknown>;
  model: string | null;
  provider: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  request_id: string | null;
  generated_at: string | null;
};

export type ReportRow = {
  id: string;
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  focus: string;
  basic_json: Record<string, unknown>;
  advanced_json: Record<string, unknown> | null;
  status: "basic";
  generation_status: "success" | "failed" | "pending";
  model: string | null;
  provider: string | null;
  prompt_version: string | null;
  schema_version: string | null;
  request_id: string | null;
  generated_at: string | null;
  created_at: string;
};

export function buildSuccessReportInsert(input: InsertReportInput) {
  return {
    nickname: input.nickname,
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    time_unknown: input.time_unknown,
    focus: input.focus,
    basic_json: input.basic_json,
    advanced_json: input.advanced_json,
    status: "basic" as const,
    generation_status: "success" as const,
    model: input.model,
    provider: input.provider,
    prompt_version: input.prompt_version,
    schema_version: input.schema_version,
    request_id: input.request_id,
    generated_at: input.generated_at,
  };
}

export async function insertReport(input: InsertReportInput): Promise<ReportRow> {
  const client = await createServiceRoleClient();
  const { data, error } = await client
    .from("reports")
    .insert(buildSuccessReportInsert(input))
    .select()
    .single();

  if (error || !data) {
    throw persistFailedError();
  }

  return data as ReportRow;
}
