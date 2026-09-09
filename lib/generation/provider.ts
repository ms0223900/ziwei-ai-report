/**
 * 依 AI_PROVIDER 選擇 Mock 或 OpenRouter；Live 的重試／備援在 openrouter.ts。
 */
import "server-only";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";
import type { ValidatedBirth } from "../validation/birth";
import { generateMockReport } from "./mock";
import {
  generateOpenRouterReport,
  type GenerateReportResult,
} from "./openrouter";

export type { GenerateReportResult } from "./openrouter";

export async function generateLiveReport(
  birth?: ValidatedBirth,
): Promise<GenerateReportResult> {
  if (process.env.AI_PROVIDER !== "openrouter") {
    const generated = generateMockReport();
    if (generated.mode !== "valid") {
      return { ok: false, kind: "schema" };
    }
    return {
      ok: true,
      complete: {
        ...generated.basic,
        ...generated.advanced,
        tier: "advanced",
        action: generated.basic.action,
        locked_fields: [...LOCKED_FIELDS],
        disclaimer: generated.basic.disclaimer || DISCLAIMER,
      },
      model: "mock",
    };
  }

  return generateOpenRouterReport(birth);
}
