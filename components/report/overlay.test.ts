import { describe, expect, it } from "vitest";
import { overlayCannedReport } from "./overlay";

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
