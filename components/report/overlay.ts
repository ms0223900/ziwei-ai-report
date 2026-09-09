import { DISCLAIMER } from "../../lib/constants";
import basicValid from "../../lib/generation/fixtures/basic.valid.json";
import type { BirthRequestBody } from "../birth-form/payload";

export type MaskedReportView = {
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  focus: string;
  overall: string;
  work: string;
  relationship: string;
  action: string;
  disclaimer: string;
  status: "basic";
};

export function overlayCannedReport(body: BirthRequestBody): MaskedReportView {
  return {
    nickname: body.nickname,
    birth_date: body.birth_date,
    birth_time: body.birth_time,
    time_unknown: body.birth_time == null,
    focus: body.focus ?? "整體",
    overall: basicValid.overall,
    work: basicValid.work,
    relationship: basicValid.relationship,
    action: basicValid.action,
    disclaimer: DISCLAIMER,
    status: "basic",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function maskedReportFromApi(
  body: unknown,
  request: BirthRequestBody,
): MaskedReportView {
  const record = asRecord(body);
  if (!record || readString(record.error_code)) {
    return overlayCannedReport(request);
  }

  const overall = readString(record.overall);
  const work = readString(record.work);
  const relationship = readString(record.relationship);
  const action = readString(record.action);
  if (!overall || !work || !relationship || !action) {
    return overlayCannedReport(request);
  }

  const birthTime =
    record.birth_time === null
      ? null
      : (readString(record.birth_time) ?? request.birth_time);

  return {
    nickname: readString(record.nickname) ?? request.nickname,
    birth_date: readString(record.birth_date) ?? request.birth_date,
    birth_time: birthTime,
    time_unknown: record.time_unknown === true || birthTime == null,
    focus: readString(record.focus) ?? request.focus ?? "整體",
    overall,
    work,
    relationship,
    action,
    disclaimer: readString(record.disclaimer) ?? DISCLAIMER,
    status: "basic",
  };
}

export function isPersistFailedBody(body: unknown): boolean {
  const record = asRecord(body);
  return readString(record?.error_code) === "PERSIST_FAILED";
}
