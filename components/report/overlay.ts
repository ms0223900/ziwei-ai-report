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
