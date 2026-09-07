import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "../constants";
import { validateAdvanced, validateBasic } from "../schemas/loader";
import advancedValid from "./fixtures/advanced.valid.json";
import basicValid from "./fixtures/basic.valid.json";
import { generateMockReport } from "./mock";

const ADVANCED_DISPLAY_KEYS = ["rationale", "path_compare", "action_plan"] as const;

const SPEC_BASIC_COPY = {
  overall:
    "（未知時辰，準確度較低）這段時間適合先整理已有能力與成果，而不是一次做大變動。",
  work: "工作上較需要『可被看見的小成果』，而不是更多靈感。",
  relationship: "合作時把範圍講清楚，會比加更多承諾更有幫助。",
  action: "先完成一件能展示的小交付。",
  disclaimer: DISCLAIMER,
} as const;

describe("generateMockReport", () => {
  it("valid mode returns canned basic without advanced display fields", () => {
    const result = generateMockReport("valid");

    expect(result.mode).toBe("valid");
    if (result.mode !== "valid") {
      throw new Error("expected valid");
    }
    expect(result.basic).toEqual(basicValid);
    expect(result.advanced).toEqual(advancedValid);
    for (const key of ADVANCED_DISPLAY_KEYS) {
      expect(result.basic).not.toHaveProperty(key);
    }
    expect(result.basic).toMatchObject(SPEC_BASIC_COPY);
    expect(result.basic.report_id).toBe("rpt_demo_001");
    expect(result.basic.focus).toBe("工作");
    expect(result.basic.birth_time).toBeNull();
    expect(result.basic.time_unknown).toBe(true);
    expect(result.basic.overall).not.toBe(result.advanced.overall);
    expect(JSON.stringify(result.basic)).not.toContain("原局總覽");
    expect(JSON.stringify(result.basic)).not.toContain("局象");
    expect(validateBasic(result.basic).ok).toBe(true);
    expect(validateAdvanced(result.advanced).ok).toBe(true);
  });

  it("invalid-json mode returns raw text that is not JSON", () => {
    const result = generateMockReport("invalid-json");

    expect(result.mode).toBe("invalid-json");
    if (result.mode !== "invalid-json") {
      throw new Error("expected invalid-json");
    }
    expect(typeof result.raw).toBe("string");
    expect(() => JSON.parse(result.raw)).toThrow();
  });

  it("schema-missing-field mode drops overall from basic canned", () => {
    const result = generateMockReport("schema-missing-field");

    expect(result.mode).toBe("schema-missing-field");
    if (result.mode !== "schema-missing-field") {
      throw new Error("expected schema-missing-field");
    }
    expect(result.basic).not.toHaveProperty("overall");
    expect(result.basic.work).toBe(basicValid.work);
    expect(result.basic.action).toBe(basicValid.action);
    expect(validateBasic(result.basic).ok).toBe(false);
  });
});

describe("mock canned fixtures", () => {
  it("advanced fixture deepens basic without contradicting it", () => {
    expect(advancedValid.source).toBe("spec-stand-in");
    expect(advancedValid.action_plan).toHaveLength(7);
    expect(advancedValid.rationale.length).toBeGreaterThan(0);
    expect(advancedValid.path_compare.path_a).toContain("小交付");
    expect(advancedValid.overall).toContain(SPEC_BASIC_COPY.overall);
    expect(advancedValid.work).toContain("可被看見的小成果");
    expect(advancedValid.relationship).toContain("把範圍講清楚");
  });
});
