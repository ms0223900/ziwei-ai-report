import {
  DISCLAIMER,
  ERROR_MESSAGES,
  HIGH_RISK_MESSAGES,
  type HighRiskCategory,
} from "../../lib/constants";

const HIGH_RISK_CATEGORIES: readonly HighRiskCategory[] = [
  "health",
  "legal",
  "financial_risk",
  "pregnancy",
  "self_harm",
];

export type ReportsViewDecision =
  | {
      kind: "high_risk";
      category: HighRiskCategory;
      message: string;
      disclaimer: string;
    }
  | {
      kind: "fail";
      message: string;
    }
  | {
      kind: "report";
    }
  | {
      kind: "validation";
    };

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readCategory(value: unknown): HighRiskCategory | undefined {
  return HIGH_RISK_CATEGORIES.find((category) => category === value);
}

export function interpretReportsResponse(
  status: number,
  body: unknown,
): ReportsViewDecision {
  const record = asRecord(body);
  const errorCode = readString(record.error_code);

  if (errorCode === "HIGH_RISK") {
    const category = readCategory(record.category) ?? "financial_risk";
    return {
      kind: "high_risk",
      category,
      message: readString(record.message) ?? HIGH_RISK_MESSAGES[category],
      disclaimer: readString(record.disclaimer) ?? DISCLAIMER,
    };
  }

  if (status === 400 || errorCode === "VALIDATION_ERROR") {
    return { kind: "validation" };
  }

  if (status === 200 && errorCode == null) {
    return { kind: "report" };
  }

  if (status === 422 || status === 502 || status === 503 || status >= 400) {
    return {
      kind: "fail",
      message:
        readString(record.message) ?? ERROR_MESSAGES.GENERATION_FAILED,
    };
  }

  return {
    kind: "fail",
    message: readString(record.message) ?? ERROR_MESSAGES.GENERATION_FAILED,
  };
}
