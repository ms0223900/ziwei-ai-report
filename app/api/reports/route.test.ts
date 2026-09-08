import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISCLAIMER,
  ERROR_MESSAGES,
  HIGH_RISK_MESSAGES,
  LOCKED_FIELDS,
} from "../../../lib/constants";
import { generationFailedError, persistFailedError } from "../../../lib/errors";
import advancedValid from "../../../lib/generation/fixtures/advanced.valid.json";
import basicValid from "../../../lib/generation/fixtures/basic.valid.json";
import { POST } from "./route";

const {
  validateBirth,
  scanHighRisk,
  generateMockReport,
  validateBasic,
  validateAdvanced,
  validateComplete,
  insertReport,
  buildReportResponse,
} = vi.hoisted(() => ({
  validateBirth: vi.fn(),
  scanHighRisk: vi.fn(),
  generateMockReport: vi.fn(),
  validateBasic: vi.fn(),
  validateAdvanced: vi.fn(),
  validateComplete: vi.fn(),
  insertReport: vi.fn(),
  buildReportResponse: vi.fn(),
}));

vi.mock("../../../lib/validation/birth", () => ({ validateBirth }));
vi.mock("../../../lib/policy/high-risk", () => ({ scanHighRisk }));
vi.mock("../../../lib/generation/mock", () => ({ generateMockReport }));
vi.mock("../../../lib/schemas/loader", () => ({
  validateBasic,
  validateAdvanced,
  validateComplete,
}));
// mock store 只鎖 HTTP 分支；真 insert 成功列由 US-018 驗收
vi.mock("../../../lib/reports/store", () => ({ insertReport }));
}
vi.mock("../../../lib/masking/buildReportResponse", () => ({
  buildReportResponse,
}));

const FORBIDDEN_BODY_KEYS = [
  "advanced_json",
  "rationale",
  "path_compare",
  "action_plan",
] as const;

const validBody = {
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  focus: "工作",
};

const validatedBirth = {
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作" as const,
};

const specHttp200 = {
  report_id: "rpt_demo_001",
  tier: "basic" as const,
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
  status: "basic" as const,
  generation_status: "success" as const,
};

async function postReports(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/reports", () => {
  beforeEach(() => {
    validateBirth.mockReturnValue({ ok: true, value: validatedBirth });
    scanHighRisk.mockReturnValue(null);
    generateMockReport.mockReturnValue({
      mode: "valid",
      basic: basicValid,
      advanced: advancedValid,
    });
    validateBasic.mockReturnValue({ ok: true, data: basicValid });
    validateAdvanced.mockReturnValue({ ok: true, data: advancedValid });
    validateComplete.mockReturnValue({
      ok: true,
      data: { ...basicValid, ...advancedValid },
    });
    insertReport.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      status: "basic",
      generation_status: "success",
    });
    buildReportResponse.mockReturnValue(specHttp200);
  });

  it("returns 200 without error_code and without advanced fields for mock valid", async () => {
    const res = await postReports(validBody);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual(specHttp200);
    expect(json).not.toHaveProperty("error_code");
    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(json).not.toHaveProperty(key);
    }
    expect(insertReport).toHaveBeenCalledOnce();
  });

  it("returns 400 VALIDATION_ERROR and skips generate/insert", async () => {
    validateBirth.mockReturnValue({
      ok: false,
      error: { error_code: "VALIDATION_ERROR", message: "請填寫暱稱。" },
    });

    const res = await postReports({ ...validBody, nickname: "" });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error_code: "VALIDATION_ERROR",
      message: "請填寫暱稱。",
    });
    expect(res.ok).toBe(false);
    expect(generateMockReport).not.toHaveBeenCalled();
    expect(insertReport).not.toHaveBeenCalled();
  });

  it("returns 200 HIGH_RISK without insert, distinct from success by error_code", async () => {
    scanHighRisk.mockReturnValue({
      category: "financial_risk",
      message: HIGH_RISK_MESSAGES.financial_risk,
    });

    const res = await postReports({
      ...validBody,
      nickname: "這筆投資會不會賺",
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
    expect(json.error_code).toBe("HIGH_RISK");
    expect(json.category).toBe("financial_risk");
    expect(json.message).toBe(HIGH_RISK_MESSAGES.financial_risk);
    expect(json.disclaimer).toBe(DISCLAIMER);
    expect(json).not.toHaveProperty("overall");
    expect(generateMockReport).not.toHaveBeenCalled();
    expect(insertReport).not.toHaveBeenCalled();
  });

  it("returns 422 SCHEMA_INVALID and skips insert for invalid-json", async () => {
    generateMockReport.mockReturnValue({
      mode: "invalid-json",
      raw: "not-json: mock SCHEMA_INVALID payload",
    });

    const res = await postReports(validBody);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error_code: "SCHEMA_INVALID",
      message: ERROR_MESSAGES.SCHEMA_INVALID,
    });
    expect(insertReport).not.toHaveBeenCalled();
  });

  it("returns 422 SCHEMA_INVALID and skips insert when a required field is missing", async () => {
    generateMockReport.mockReturnValue({
      mode: "schema-missing-field",
      basic: { ...basicValid, overall: undefined },
    });
    validateBasic.mockReturnValue({ ok: false, errors: [] });
    validateComplete.mockReturnValue({ ok: false, errors: [] });

    const res = await postReports(validBody);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error_code).toBe("SCHEMA_INVALID");
    expect(insertReport).not.toHaveBeenCalled();
  });

  it("returns 503 PERSIST_FAILED when insert throws", async () => {
    insertReport.mockRejectedValue(persistFailedError());

    const res = await postReports(validBody);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json).toEqual({
      error_code: "PERSIST_FAILED",
      message: ERROR_MESSAGES.PERSIST_FAILED,
    });
  });

  it("returns 502 GENERATION_FAILED for stubbed provider transport failure", async () => {
    generateMockReport.mockImplementation(() => {
      throw generationFailedError();
    });

    const res = await postReports(validBody);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json).toEqual({
      error_code: "GENERATION_FAILED",
      message: ERROR_MESSAGES.GENERATION_FAILED,
    });
    expect(insertReport).not.toHaveBeenCalled();
  });

  it("normalizes omitted focus to 整體 on the success body", async () => {
    const { focus: _focus, ...bodyWithoutFocus } = validBody;
    validateBirth.mockReturnValue({
      ok: true,
      value: { ...validatedBirth, focus: "整體" },
    });
    buildReportResponse.mockReturnValue({ ...specHttp200, focus: "整體" });

    const res = await postReports(bodyWithoutFocus);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error_code).toBeUndefined();
    expect(json.focus).toBe("整體");
    expect(validateBirth).toHaveBeenCalledWith(
      expect.not.objectContaining({ time_unknown: expect.anything() }),
    );
  });

  it("normalizes empty-string focus to 整體 on the success body", async () => {
    validateBirth.mockReturnValue({
      ok: true,
      value: { ...validatedBirth, focus: "整體" },
    });
    buildReportResponse.mockReturnValue({ ...specHttp200, focus: "整體" });

    const res = await postReports({ ...validBody, focus: "" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.focus).toBe("整體");
  });
});
