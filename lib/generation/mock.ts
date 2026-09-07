/**
 * Mock 報告產出：讀取 US-012 同一套 canned fixture。
 * HTTP／畫面 A 使用 basic；不要從 advanced 剝欄當短 overall。
 */
import "server-only";
import advancedValid from "./fixtures/advanced.valid.json";
import basicValid from "./fixtures/basic.valid.json";

export const MOCK_AI_MODES = [
  "valid",
  "invalid-json",
  "schema-missing-field",
] as const;

export type MockAiMode = (typeof MOCK_AI_MODES)[number];

export type MockReportResult =
  | {
      mode: "valid";
      basic: typeof basicValid;
      advanced: typeof advancedValid;
    }
  | {
      mode: "invalid-json";
      raw: string;
    }
  | {
      mode: "schema-missing-field";
      basic: Omit<typeof basicValid, "overall">;
    };

const INVALID_JSON_RAW = "not-json: mock SCHEMA_INVALID payload";

function isMockAiMode(value: string | undefined): value is MockAiMode {
  return MOCK_AI_MODES.includes(value as MockAiMode);
}

function resolveMode(mode?: MockAiMode): MockAiMode {
  if (mode) {
    return mode;
  }

  const fromEnv = process.env.MOCK_AI_MODE;
  return isMockAiMode(fromEnv) ? fromEnv : "valid";
}

export function generateMockReport(mode?: MockAiMode): MockReportResult {
  switch (resolveMode(mode)) {
    case "valid":
      return {
        mode: "valid",
        basic: structuredClone(basicValid),
        advanced: structuredClone(advancedValid),
      };
    case "invalid-json":
      return { mode: "invalid-json", raw: INVALID_JSON_RAW };
    case "schema-missing-field": {
      const { overall: _overall, ...basic } = structuredClone(basicValid);
      return { mode: "schema-missing-field", basic };
    }
  }
}
