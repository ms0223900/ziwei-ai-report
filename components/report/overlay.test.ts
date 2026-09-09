import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "../../lib/constants";
import {
  isPersistFailedBody,
  maskedReportFromApi,
  overlayCannedReport,
} from "./overlay";

describe("overlayCannedReport", () => {
  it("keeps canned short copy and overlays the submitted birth fields", () => {
    const report = overlayCannedReport({
      nickname: "阿明",
      birth_date: "1990-01-02",
      birth_time: "卯",
      focus: "關係",
    });

    expect(report.status).toBe("basic");
    expect(report.nickname).toBe("阿明");
    expect(report.focus).toBe("關係");
    expect(report.overall).toContain("未知時辰，準確度較低");
    expect(report.action).toBe("先完成一件能展示的小交付。");
    expect(JSON.stringify(report)).not.toContain("rationale");
    expect(JSON.stringify(report)).not.toContain("action_plan");
  });

  it("defaults omitted focus to 整體", () => {
    const report = overlayCannedReport({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: null,
    });

    expect(report.focus).toBe("整體");
    expect(report.time_unknown).toBe(true);
  });
});

describe("maskedReportFromApi", () => {
  const request = {
    nickname: "阿明",
    birth_date: "1990-01-02",
    birth_time: "卯" as string | null,
    focus: "關係" as const,
  };

  it("uses the masked API body instead of canned copy", () => {
    const report = maskedReportFromApi(
      {
        nickname: "阿明",
        birth_date: "1990-01-02",
        birth_time: "卯",
        time_unknown: false,
        focus: "關係",
        overall: "API 總覽",
        work: "API 事業",
        relationship: "API 關係",
        action: "API 行動",
        disclaimer: DISCLAIMER,
        status: "basic",
      },
      request,
    );

    expect(report.overall).toBe("API 總覽");
    expect(report.work).toBe("API 事業");
    expect(report.relationship).toBe("API 關係");
    expect(report.action).toBe("API 行動");
    expect(JSON.stringify(report)).not.toContain("rationale");
  });

  it("falls back to canned copy when the 200 body is incomplete", () => {
    const report = maskedReportFromApi({ nickname: "阿明" }, request);
    expect(report.action).toBe("先完成一件能展示的小交付。");
  });

  it("never treats HIGH_RISK as a report card", () => {
    const report = maskedReportFromApi(
      { error_code: "HIGH_RISK", message: "不可作答" },
      request,
    );
    expect(report.overall).toContain("未知時辰，準確度較低");
  });
});

describe("isPersistFailedBody", () => {
  it("detects PERSIST_FAILED so the wizard can still show 畫面 A", () => {
    expect(isPersistFailedBody({ error_code: "PERSIST_FAILED" })).toBe(true);
    expect(isPersistFailedBody({ error_code: "GENERATION_FAILED" })).toBe(false);
  });
});
