import { describe, expect, it } from "vitest";
import { reportUnlocksFromApi } from "./ReportUnlocksMenu";

describe("reportUnlocksFromApi", () => {
  it("keeps well-formed items and drops the rest", () => {
    expect(
      reportUnlocksFromApi([
        { report_id: "r1", nickname: "小圓", created_at: "2026-09-22T00:00:00Z" },
        { report_id: "", nickname: "x" },
        null,
        { nickname: "沒有 id" },
        { report_id: "r2" },
      ]),
    ).toEqual([
      { report_id: "r1", nickname: "小圓", created_at: "2026-09-22T00:00:00Z" },
      { report_id: "r2", nickname: "", created_at: "" },
    ]);
  });

  it("treats a non-array body as an empty menu", () => {
    expect(reportUnlocksFromApi({ error_code: "UNAUTHENTICATED" })).toEqual([]);
  });
});
