import { describe, expect, it } from "vitest";
import {
  buildChartMatrixCopy,
  chartSubjectLine,
  formatWesternBirthDate,
} from "./chart-matrix";

describe("chart-matrix copy", () => {
  it("keeps 女命 only for the demo nickname 小圓", () => {
    expect(chartSubjectLine("小圓")).toBe("命主：小圓（女命）");
    expect(chartSubjectLine("阿明")).toBe("命主：阿明");
    expect(chartSubjectLine("阿明")).not.toContain("女命");
  });

  it("formats the birth date as 西元 without padding", () => {
    expect(formatWesternBirthDate("1993-07-12")).toBe("生辰：西元1993年7月12日");
  });

  it("keeps bureau and year as decorative copy", () => {
    const copy = buildChartMatrixCopy({
      nickname: "阿明",
      birth_date: "1990-01-02",
      focus: "關係",
    });

    expect(copy.title).toBe("【 紫微原局・排盤總目 】");
    expect(copy.bureau).toBe("水二局・暫定命盤");
    expect(copy.year).toBe("歲次：癸酉年（劍鋒金）");
    expect(copy.focus).toBe("問事焦點：夫妻宮（關係交友）");
    expect(copy.birth).toBe("生辰：西元1990年1月2日");
  });
});
