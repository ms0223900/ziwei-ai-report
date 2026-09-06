export type HighRiskCategory =
  | "health"
  | "legal"
  | "financial_risk"
  | "pregnancy"
  | "self_harm";

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

const MESSAGES: Record<HighRiskCategory, string> = {
  health: "這題涉及健康與醫療判斷，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  legal: "這題涉及法律諮詢，我不能用運勢作答。請尋求合格律師或法律援助。",
  financial_risk:
    "這題涉及財務與投資決策，我不能用命盤或運勢給判斷。請尋求合格的金融／專業意見。",
  pregnancy: "這題涉及孕產與身體安全，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  self_harm: "若你正處於危險中，請立即尋求現場專業協助。命盤解讀不能處理這類情況。",
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
      return { category, message: MESSAGES[category] };
    }
  }

  return null;
}
