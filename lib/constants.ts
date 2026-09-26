export const DISCLAIMER =
  "本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。";

export const LOCK_CAPTION =
  "解鎖進階命書後，即啟七日行事方針與吉凶路徑析理";

export const LOCKED_FIELDS = [
  "action_plan",
  "path_compare",
  "rationale",
] as const;

export const MEMBERSHIP_GRANT_NOTE = "開通由講師受控流程處理，本版不收費";
export const MEMBERSHIP_CTA_UPGRADE = "升級／開通";
export const MEMBERSHIP_CTA_UNLOCK_REPORT = "永久解鎖完整報告";
export const MEMBERSHIP_CTA_UNLOCKED = "已開通";
export const MEMBERSHIP_CTA_POINT_UNLOCKED = "已用 1 點解鎖此報告";
export const MEMBERSHIP_CTA_SUBSCRIPTION_ACTIVE = "訂閱有效中";
export const MEMBERSHIP_CTA_SUBSCRIPTION_UNTIL_PREFIX = "訂閱有效至";

export const REPORT_SLOTS = {
  lockActionPlan: "slot-lock-action-plan",
  lockRationale: "slot-lock-rationale",
  lockPathCompare: "slot-lock-path-compare",
  delivery: "slot-delivery",
  unlockCta: "slot-unlock-cta",
  authEntry: "slot-auth-entry",
  authSession: "slot-auth-session",
  pointsPackCta: "slot-points-pack-cta",
  subscriptionCta: "slot-subscription-cta",
  unlockWithPoint: "slot-unlock-with-point",
  reportUnlocks: "slot-report-unlocks",
  homePointsPack: "slot-home-points-pack",
} as const;

export const POINTS_PACK_CLIENT_PLAN_ID = "points_pack_5";
export const POINTS_PACK_CTA = "購買點數包";
export const SUBSCRIPTION_CLIENT_PLAN_ID = "subscribe_report_monthly";
export const SUBSCRIPTION_CTA = "月繳訂閱（每月 TWD 19）";
export const SUBSCRIPTION_EXPIRED_NOTE = "訂閱已失效，請重新整理";
export const UNLOCK_WITH_POINT_CTA = "用 1 點解鎖此報告";
export const POINTS_BALANCE_INLINE = "目前點數";
export const POINTS_INSUFFICIENT_NOTE = "點數不足，無法用點數解鎖此報告。";
export const POINTS_BACK_TO_REPORT = "返回報告";
export const POINTS_UNLOCK_FAILED = "解鎖失敗，請稍後再試。";
export const HOME_POINTS_BALANCE_LABEL = "目前點數";
export const REPORT_UNLOCKS_TITLE = "已用點數解鎖的報告";
export const REPORT_UNLOCKS_OPEN_FAILED = "無法開啟這份報告，請稍後再試。";

export const AUTH_PASSWORD_MIN_LENGTH = 6;

export const AUTH_MESSAGES = {
  INVALID_EMAIL: "請輸入有效的電子信箱。",
  PASSWORD_TOO_SHORT: "請輸入符合長度的密碼。",
  EMAIL_TAKEN: "此信箱已註冊，請改登入。",
  INVALID_CREDENTIALS: "帳號或密碼不正確。",
  DISPLAY_NAME_BLANK: "請輸入顯示名稱。",
  REGISTER_FAILED: "註冊失敗，請再試一次。",
  PUBLIC_ENV_MISSING:
    "目前無法連上帳號服務（缺少公開的 Supabase 網址或金鑰）。",
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
  UPDATE_FAILED: "更新失敗，請再試一次。",
  UNAUTHORIZED: "未授權。",
  LOGIN_REQUIRED: "請先登入。",
  UNSUPPORTED_PLAN: "不支援的方案。",
  ALREADY_UNLOCKED: "此帳號已開通，無需再次付款。",
  SUBSCRIPTION_IN_PROGRESS: "已有有效訂閱或訂單處理中，請稍後再試。",
  PAYMENT_UNAVAILABLE: "付款服務暫時無法使用，請稍後再試。",
  GRANT_IDENTITY_REQUIRED: "請提供 email 或 user_id。",
  MEMBER_NOT_FOUND: "找不到這位會員。",
  REPORT_NOT_FOUND: "找不到這份報告。",
  ADVANCED_LOCKED: "尚未開通，無法讀取進階報告。",
} as const;

export const MODE_UNLOCK_LINE = "單次解鎖：這份 report 可看進階";
export const MODE_CREDIT_LINE = "點數：1 點可解鎖 1 份自己的報告進階內容";
export const MODE_SUBSCRIBE_LINE = "訂閱：有效期間內可看進階報告";
export const PREVIEW_BANNER = "開發預覽｜尚未實作真實付款";
export const PREVIEW_EXAMPLE_MARK = "預覽用範例";
