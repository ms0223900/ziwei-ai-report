import { describe, expect, it } from "vitest";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";
import basicSchema from "./report.basic.v1.json";
import advancedSchema from "./report.advanced.v1.json";
import completeSchema from "./report.complete.v1.json";
import {
  validateAdvanced,
  validateBasic,
  validateComplete,
} from "./loader";

const basicFixture = {
  report_id: "rpt_demo_001",
  tier: "basic",
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作",
  disclaimer: DISCLAIMER,
  overall: "（未知時辰，準確度較低）這段時間適合先整理已有能力與成果。",
  work: "工作上較需要可被看見的小成果。",
  relationship: "合作時把範圍講清楚會更有幫助。",
  action: "先完成一件能展示的小交付。",
  locked_fields: [...LOCKED_FIELDS],
};

const advancedFixture = {
  report_id: "rpt_demo_001",
  tier: "advanced",
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作",
  disclaimer: DISCLAIMER,
  overall: "（未知時辰，準確度較低）這段時間適合先整理已有能力與成果。",
  work: "工作上較需要可被看見的小成果。",
  relationship: "合作時把範圍講清楚會更有幫助。",
  rationale: "先把可見成果堆疊起來，再談更大的轉向。",
  path_compare: {
    path_a: "先交付一件可展示的小事。",
    path_b: "先擴張承諾再補成果。",
    note: "這段時間路徑 A 較穩。",
  },
  action_plan: [
    "第 1 天：列出一件可展示的交付。",
    "第 2 天：縮小範圍到一天內做完。",
    "第 3 天：做完並留下紀錄。",
    "第 4 天：給一位同事看。",
    "第 5 天：依回饋改一小處。",
    "第 6 天：再交一次。",
    "第 7 天：收斂成一句成果說明。",
  ],
};

const completeFixture = {
  ...basicFixture,
  ...advancedFixture,
  tier: "advanced",
  action: basicFixture.action,
  locked_fields: [...LOCKED_FIELDS],
};

function assertSchemaHasNoUuidFormat(schema: {
  properties?: { report_id?: { format?: string } };
}) {
  expect(schema.properties?.report_id?.format).toBeUndefined();
}

describe("report schemas via ajv loader", () => {
  it("accepts a minimal valid basic fixture", () => {
    expect(validateBasic(basicFixture).ok).toBe(true);
  });

  it("accepts a minimal valid advanced fixture", () => {
    expect(validateAdvanced(advancedFixture).ok).toBe(true);
  });

  it("accepts a minimal valid complete fixture", () => {
    expect(validateComplete(completeFixture).ok).toBe(true);
  });

  it("rejects basic JSON that is missing overall", () => {
    const { overall: _overall, ...missingOverall } = basicFixture;

    expect(validateBasic(missingOverall).ok).toBe(false);
  });

  it("rejects a non-object value", () => {
    expect(validateBasic("not-an-object").ok).toBe(false);
    expect(validateBasic(null).ok).toBe(false);
  });

  it("does not declare report_id as format uuid", () => {
    assertSchemaHasNoUuidFormat(basicSchema);
    assertSchemaHasNoUuidFormat(advancedSchema);
    assertSchemaHasNoUuidFormat(completeSchema);
  });

  it("accepts both rpt_demo_001 and a uuid string as report_id", () => {
    expect(validateBasic(basicFixture).ok).toBe(true);
    expect(
      validateBasic({
        ...basicFixture,
        report_id: "550e8400-e29b-41d4-a716-446655440000",
      }).ok,
    ).toBe(true);
  });

  it("does not treat a masked HTTP body as a complete-schema pass", () => {
    expect(validateComplete(basicFixture).ok).toBe(false);
  });
});
