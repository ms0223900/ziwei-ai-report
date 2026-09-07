/**
 * 唯一組 HTTP 200 報告 body 的地方。
 * 只取 basic 淺層 + persist meta + disclaimer；永不帶出 advanced_json 或進階三欄。
 */
import "server-only";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";

export type ReportPersistMeta = {
  status: "basic";
  generation_status: "success";
};

export type BuildReportResponseInput = {
  report: Record<string, unknown>;
  advanced_json?: unknown;
  meta: ReportPersistMeta;
};

export type MaskedReportResponse = {
  report_id: string;
  tier: "basic";
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  focus: string;
  disclaimer: string;
  overall: string;
  work: string;
  relationship: string;
  action: string;
  locked_fields: string[];
  status: "basic";
  generation_status: "success";
};

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBirthTime(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return readString(value);
}

export function buildReportResponse(
  input: BuildReportResponseInput,
): MaskedReportResponse {
  const { report } = input;

  return {
    report_id: readString(report.report_id),
    tier: "basic",
    nickname: readString(report.nickname),
    birth_date: readString(report.birth_date),
    birth_time: readBirthTime(report.birth_time),
    time_unknown: report.time_unknown === true,
    focus: readString(report.focus),
    disclaimer: readString(report.disclaimer) || DISCLAIMER,
    overall: readString(report.overall),
    work: readString(report.work),
    relationship: readString(report.relationship),
    action: readString(report.action),
    locked_fields: [...LOCKED_FIELDS],
    status: "basic",
    generation_status: "success",
  };
}
