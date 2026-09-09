import { describe, expect, it } from "vitest";
import { DISCLAIMER, ERROR_MESSAGES, HIGH_RISK_MESSAGES } from "../../lib/constants";
import { interpretReportsResponse } from "./interpret-reports-response";

describe("interpretReportsResponse", () => {
  it("routes HTTP 200 HIGH_RISK to the safety screen, not a report", () => {
    const decision = interpretReportsResponse(200, {
      error_code: "HIGH_RISK",
      category: "financial_risk",
      message: HIGH_RISK_MESSAGES.financial_risk,
      disclaimer: DISCLAIMER,
    });

    expect(decision).toEqual({
      kind: "high_risk",
      category: "financial_risk",
      message: HIGH_RISK_MESSAGES.financial_risk,
      disclaimer: DISCLAIMER,
    });
  });

  it("routes HTTP 200 without error_code to the report card", () => {
    expect(interpretReportsResponse(200, { nickname: "小圓", overall: "短評" })).toEqual({
      kind: "report",
    });
  });

  it("does not treat HTTP 400 field validation as the generation-fail screen", () => {
    expect(
      interpretReportsResponse(400, {
        error_code: "VALIDATION_ERROR",
        message: "請填寫暱稱。",
      }),
    ).toEqual({ kind: "validation" });
  });

  it.each([
    [422, "SCHEMA_INVALID", ERROR_MESSAGES.SCHEMA_INVALID],
    [502, "GENERATION_FAILED", ERROR_MESSAGES.GENERATION_FAILED],
    [503, "PERSIST_FAILED", ERROR_MESSAGES.PERSIST_FAILED],
  ] as const)("routes HTTP %s to retryable fail with the API message", (status, code, message) => {
    expect(
      interpretReportsResponse(status, { error_code: code, message }),
    ).toEqual({ kind: "fail", message });
  });
});
