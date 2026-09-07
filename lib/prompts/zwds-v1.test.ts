import { describe, expect, it } from "vitest";
import { DISCLAIMER } from "../constants";
import { PROMPT_VERSION, ZWDS_SYSTEM_PROMPT } from "./zwds-v1";

const REQUIRED_JSON_KEYS = [
  "action",
  "locked_fields",
  "rationale",
  "path_compare",
  "action_plan",
] as const;

describe("zwds-v1 prompt", () => {
  it("exports an initial prompt version", () => {
    expect(PROMPT_VERSION).toBe("zwds-v1");
  });

  it("is a single system prompt that lists required JSON field names", () => {
    expect(ZWDS_SYSTEM_PROMPT).toMatch(/只輸出一個 JSON 物件/);
    for (const key of REQUIRED_JSON_KEYS) {
      expect(ZWDS_SYSTEM_PROMPT).toContain(key);
    }
    expect(ZWDS_SYSTEM_PROMPT).toContain("整體");
    expect(ZWDS_SYSTEM_PROMPT).toContain("工作");
    expect(ZWDS_SYSTEM_PROMPT).toContain("關係");
    expect(ZWDS_SYSTEM_PROMPT).toContain(DISCLAIMER);
  });
});
