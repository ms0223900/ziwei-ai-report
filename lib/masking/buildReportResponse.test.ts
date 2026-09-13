import { describe, expect, it } from "vitest";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";
import advancedValid from "../generation/fixtures/advanced.valid.json";
import basicValid from "../generation/fixtures/basic.valid.json";
import { buildReportResponse } from "./buildReportResponse";

const FORBIDDEN_BODY_KEYS = [
  "advanced_json",
  "rationale",
  "path_compare",
  "action_plan",
] as const;

const completeReport = {
  ...basicValid,
  rationale: advancedValid.rationale,
  path_compare: advancedValid.path_compare,
  action_plan: advancedValid.action_plan,
  tier: "advanced",
};

const persistMeta = {
  status: "basic" as const,
  generation_status: "success" as const,
};

const PERSIST_ID = "00000000-0000-4000-8000-000000000001";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const specHttp200 = {
  persist_id: PERSIST_ID,
  report_id: "rpt_demo_001",
  tier: "basic",
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作",
  disclaimer: DISCLAIMER,
  overall: basicValid.overall,
  work: basicValid.work,
  relationship: basicValid.relationship,
  action: basicValid.action,
  locked_fields: [...LOCKED_FIELDS],
  status: "basic",
  generation_status: "success",
};

describe("buildReportResponse", () => {
  it("returns basic fields, disclaimer, locked_fields, and persist meta", () => {
    const body = buildReportResponse({
      report: completeReport,
      persist_id: PERSIST_ID,
      meta: persistMeta,
    });

    expect(body).toEqual(specHttp200);
    expect(body.status).toBe("basic");
    expect(body.generation_status).toBe("success");
    expect(body.disclaimer).toBe(DISCLAIMER);
    expect(body.locked_fields).toEqual([...LOCKED_FIELDS]);
    expect(body.overall).toBe(basicValid.overall);
    expect(body.overall).not.toBe(advancedValid.overall);
  });

  it("omits advanced fields and advanced_json from the HTTP body", () => {
    const body = buildReportResponse({
      report: completeReport,
      persist_id: PERSIST_ID,
      advanced_json: advancedValid,
      meta: persistMeta,
    });

    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it("forces outbound tier to basic", () => {
    const body = buildReportResponse({
      report: completeReport,
      persist_id: PERSIST_ID,
      meta: persistMeta,
    });

    expect(body.tier).toBe("basic");
  });

  it("includes uuid persist_id that is not the mock report_id", () => {
    const body = buildReportResponse({
      report: completeReport,
      persist_id: PERSIST_ID,
      meta: persistMeta,
    });

    expect(body.persist_id).toMatch(UUID_RE);
    expect(body.persist_id).toBe(PERSIST_ID);
    expect(body.report_id).toBe("rpt_demo_001");
    expect(body.persist_id).not.toBe(body.report_id);
  });

  it("still omits advanced fields when persist_id is attached", () => {
    const body = buildReportResponse({
      report: completeReport,
      persist_id: PERSIST_ID,
      advanced_json: advancedValid,
      meta: persistMeta,
    });

    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
  });
});
