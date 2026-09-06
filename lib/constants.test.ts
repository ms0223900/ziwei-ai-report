import { describe, expect, it } from "vitest";
import {
  DISCLAIMER,
  ERROR_MESSAGES,
  HIGH_RISK_MESSAGES,
  LOCKED_FIELDS,
  LOCK_CAPTION,
} from "./constants";
import {
  generationFailedError,
  persistFailedError,
  schemaInvalidError,
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
});
