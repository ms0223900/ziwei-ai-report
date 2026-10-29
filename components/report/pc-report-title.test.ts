import { describe, expect, it } from "vitest";
import { pcReportTitle } from "./pc-report-title";

describe("pcReportTitle", () => {
  it("rewrites an advanced title only on the PC layout", () => {
    expect(pcReportTitle("小圓的進階報告", true)).toBe("小圓的紫微斗數進階報告");
    expect(pcReportTitle("小圓的進階報告", false)).toBe("小圓的進階報告");
  });

  it("leaves the basic title unchanged", () => {
    expect(pcReportTitle("小圓的基本分析", true)).toBe("小圓的基本分析");
  });
});
