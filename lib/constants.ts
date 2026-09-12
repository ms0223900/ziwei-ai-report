export const DISCLAIMER =
  "本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。";

export const LOCK_CAPTION =
  "解鎖進階命書後，即啟七日行事方針與吉凶路徑析理";

export const LOCKED_FIELDS = [
  "action_plan",
  "path_compare",
  "rationale",
] as const;

export const UPCOMING_UNLOCK_NOTE = "解鎖即將開放，本版不收費。";

export const REPORT_SLOTS = {
  lockActionPlan: "slot-lock-action-plan",
  lockRationale: "slot-lock-rationale",
  lockPathCompare: "slot-lock-path-compare",
  delivery: "slot-delivery",
  unlockCta: "slot-unlock-cta",
  followup: "slot-followup",
  subscribe: "slot-subscribe",
} as const;

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

export const FOLLOWUP_PLACEHOLDER = "追問需點數或訂閱";
export const FOLLOWUP_HINT =
  "點數只買 1 次追問；不解鎖報告、不重算命盤";
export const SUBSCRIBE_LABEL = "了解訂閱權益";
export const SUBSCRIBE_HINT =
  "訂閱有效可看進階報告，本月可追問 10 次；第一版不做月報";
export const MODE_UNLOCK_LINE = "單次解鎖：這份 report 可看進階；不附贈追問";
export const MODE_CREDIT_LINE = "點數：只買 1 次追問；不解鎖報告、不重算命盤";
export const MODE_SUBSCRIBE_LINE =
  "訂閱：可看進階＋本月追問 10 次；權限與用量分欄";
export const PREVIEW_BANNER = "開發預覽｜尚未實作真實付款";
export const FOLLOWUP_API_UNIMPLEMENTED = "追問 API 尚未實作";
export const PREVIEW_NO_DEDUCT = "預覽：尚未扣點";
export const PREVIEW_MONTHLY_REMAINING = "本月剩餘 10 次（預覽）";
export const SUBSCRIBE_ACTIVE_PREVIEW = "訂閱有效（預覽）";
export const PREVIEW_EXAMPLE_MARK = "預覽用範例";
