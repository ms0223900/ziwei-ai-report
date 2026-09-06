import {
  HIGH_RISK_MESSAGES,
  type HighRiskCategory,
} from "../constants";

export type { HighRiskCategory };

export type HighRiskHit = {
  category: HighRiskCategory;
  message: string;
};

const CATEGORY_ORDER: readonly HighRiskCategory[] = [
  "health",
  "legal",
  "financial_risk",
  "pregnancy",
  "self_harm",
];

const KEYWORDS: Record<HighRiskCategory, readonly string[]> = {
  health: ["病症", "醫療", "健康", "看病", "疾病"],
  legal: ["律師", "法律", "起訴", "官司"],
  financial_risk: ["投資", "理財", "股票"],
  pregnancy: ["懷孕", "孕產", "安胎"],
  self_harm: ["自殺", "自傷", "傷害他人"],
};

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

export function scanHighRisk(input: Record<string, unknown>): HighRiskHit | null {
  const haystack = collectStrings(input).join("\n");

  for (const category of CATEGORY_ORDER) {
    if (KEYWORDS[category].some((keyword) => haystack.includes(keyword))) {
      return { category, message: HIGH_RISK_MESSAGES[category] };
    }
  }

  return null;
}
