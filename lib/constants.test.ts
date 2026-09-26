import { describe, expect, it } from "vitest";
import {
  AUTH_MESSAGES,
  DISCLAIMER,
  ERROR_MESSAGES,
  HIGH_RISK_MESSAGES,
  LOCKED_FIELDS,
  LOCK_CAPTION,
  REPORT_SLOTS,
} from "./constants";
import {
  forbiddenLockedError,
  generationFailedError,
  loginRequiredError,
  persistFailedError,
  schemaInvalidError,
  unauthorizedError,
  updateFailedError,
} from "./errors";

describe("shared copy and error codes", () => {
  it("keeps the disclaimer sentence that includes 投資", () => {
    expect(DISCLAIMER).toBe(
      "本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。",
    );
  });

  it("uses the Pencil LockCaption and not the old brief line", () => {
    expect(LOCK_CAPTION).toBe(
      "解鎖進階命書後，即啟七日行事方針與吉凶路徑析理",
    );
    expect(LOCK_CAPTION).not.toContain("解鎖進階報告後可見");
  });

  it("locks the three advanced fields", () => {
    expect(LOCKED_FIELDS).toEqual([
      "action_plan",
      "path_compare",
      "rationale",
    ]);
  });

  it("exposes named commercial report slots", () => {
    expect(REPORT_SLOTS).toEqual({
      lockActionPlan: "slot-lock-action-plan",
      lockRationale: "slot-lock-rationale",
      lockPathCompare: "slot-lock-path-compare",
      delivery: "slot-delivery",
      unlockCta: "slot-unlock-cta",
      followup: "slot-followup",
      subscribe: "slot-subscribe",
      authEntry: "slot-auth-entry",
      authSession: "slot-auth-session",
      pointsPackCta: "slot-points-pack-cta",
      subscriptionCta: "slot-subscription-cta",
      unlockWithPoint: "slot-unlock-with-point",
      reportUnlocks: "slot-report-unlocks",
      homePointsPack: "slot-home-points-pack",
    });
    expect(AUTH_MESSAGES.INVALID_EMAIL).toBe("請輸入有效的電子信箱。");
    expect(AUTH_MESSAGES.INVALID_CREDENTIALS).toBe("帳號或密碼不正確。");
    expect(AUTH_MESSAGES.DISPLAY_NAME_BLANK).toBe("請輸入顯示名稱。");
    expect(AUTH_MESSAGES.PUBLIC_ENV_MISSING).toBe(
      "目前無法連上帳號服務（缺少公開的 Supabase 網址或金鑰）。",
    );
  });

  it("keeps the five high-risk sentences from the spec", () => {
    expect(HIGH_RISK_MESSAGES.health).toBe(
      "這題涉及健康與醫療判斷，我不能用命盤作答。請尋求合格醫療專業人員協助。",
    );
    expect(HIGH_RISK_MESSAGES.legal).toBe(
      "這題涉及法律諮詢，我不能用運勢作答。請尋求合格律師或法律援助。",
    );
    expect(HIGH_RISK_MESSAGES.financial_risk).toBe(
      "這題涉及財務與投資決策，我不能用命盤或運勢給判斷。請尋求合格的金融／專業意見。",
    );
    expect(HIGH_RISK_MESSAGES.pregnancy).toBe(
      "這題涉及孕產與身體安全，我不能用命盤作答。請尋求合格醫療專業人員協助。",
    );
    expect(HIGH_RISK_MESSAGES.self_harm).toBe(
      "若你正處於危險中，請立即尋求現場專業協助。命盤解讀不能處理這類情況。",
    );
  });

  it("maps 422 / 502 / 503 to the spec default messages", () => {
    expect(schemaInvalidError()).toMatchObject({
      error_code: "SCHEMA_INVALID",
      status: 422,
      message: ERROR_MESSAGES.SCHEMA_INVALID,
    });
    expect(generationFailedError()).toMatchObject({
      error_code: "GENERATION_FAILED",
      status: 502,
      message: "生成失敗，請再試一次。",
    });
    expect(persistFailedError()).toMatchObject({
      error_code: "PERSIST_FAILED",
      status: 503,
      message: "儲存失敗，請再試一次。",
    });
  });

  it("maps membership grant and GET errors to spec copy", () => {
    expect(unauthorizedError()).toMatchObject({
      error_code: "UNAUTHENTICATED",
      status: 401,
      message: ERROR_MESSAGES.UNAUTHORIZED,
    });
    expect(loginRequiredError()).toMatchObject({
      error_code: "UNAUTHENTICATED",
      status: 401,
      message: ERROR_MESSAGES.LOGIN_REQUIRED,
    });
    expect(forbiddenLockedError()).toMatchObject({
      error_code: "FORBIDDEN",
      status: 403,
      message: ERROR_MESSAGES.ADVANCED_LOCKED,
    });
    expect(updateFailedError()).toMatchObject({
      error_code: "PERSIST_FAILED",
      status: 503,
      message: ERROR_MESSAGES.UPDATE_FAILED,
    });
    expect(ERROR_MESSAGES.GRANT_IDENTITY_REQUIRED).toBe(
      "請提供 email 或 user_id。",
    );
    expect(ERROR_MESSAGES.MEMBER_NOT_FOUND).toBe("找不到這位會員。");
    expect(ERROR_MESSAGES.REPORT_NOT_FOUND).toBe("找不到這份報告。");
  });
});
