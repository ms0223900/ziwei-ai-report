export const DISCLAIMER =
  "本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。";

export const LOCK_CAPTION =
  "解鎖進階命書後，即啟七日行事方針與吉凶路徑析理";

export const LOCKED_FIELDS = [
  "action_plan",
  "path_compare",
  "rationale",
] as const;

export type HighRiskCategory =
  | "health"
  | "legal"
  | "financial_risk"
  | "pregnancy"
  | "self_harm";

export const HIGH_RISK_MESSAGES: Record<HighRiskCategory, string> = {
  health: "這題涉及健康與醫療判斷，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  legal: "這題涉及法律諮詢，我不能用運勢作答。請尋求合格律師或法律援助。",
  financial_risk:
    "這題涉及財務與投資決策，我不能用命盤或運勢給判斷。請尋求合格的金融／專業意見。",
  pregnancy: "這題涉及孕產與身體安全，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  self_harm: "若你正處於危險中，請立即尋求現場專業協助。命盤解讀不能處理這類情況。",
};

export const ERROR_MESSAGES = {
  SCHEMA_INVALID: "報告格式驗證失敗，請再試一次。",
  GENERATION_FAILED: "生成失敗，請再試一次。",
  PERSIST_FAILED: "儲存失敗，請再試一次。",
} as const;
