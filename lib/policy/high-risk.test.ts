import { describe, expect, it } from "vitest";
import { scanHighRisk } from "./high-risk";

const MESSAGES = {
  health: "這題涉及健康與醫療判斷，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  legal: "這題涉及法律諮詢，我不能用運勢作答。請尋求合格律師或法律援助。",
  financial_risk:
    "這題涉及財務與投資決策，我不能用命盤或運勢給判斷。請尋求合格的金融／專業意見。",
  pregnancy: "這題涉及孕產與身體安全，我不能用命盤作答。請尋求合格醫療專業人員協助。",
  self_harm: "若你正處於危險中，請立即尋求現場專業協助。命盤解讀不能處理這類情況。",
} as const;

describe("scanHighRisk", () => {
  it("returns financial_risk for 這筆投資會不會賺", () => {
    const hit = scanHighRisk({ nickname: "這筆投資會不會賺", focus: "工作" });

    expect(hit).not.toBeNull();
    expect(hit?.category).toBe("financial_risk");
    expect(hit?.message).toBe(MESSAGES.financial_risk);
  });

  it("does not hit a normal nickname 小圓", () => {
    expect(scanHighRisk({ nickname: "小圓", focus: "整體" })).toBeNull();
  });

  it("hits health for 病症", () => {
    const hit = scanHighRisk({ nickname: "想問這個病症", focus: "整體" });

    expect(hit?.category).toBe("health");
    expect(hit?.message).toBe(MESSAGES.health);
  });

  it("hits legal for 律師", () => {
    const hit = scanHighRisk({ nickname: "要不要找律師", focus: "工作" });

    expect(hit?.category).toBe("legal");
    expect(hit?.message).toBe(MESSAGES.legal);
  });

  it("hits pregnancy for 懷孕", () => {
    const hit = scanHighRisk({ nickname: "懷孕期間運勢", focus: "關係" });

    expect(hit?.category).toBe("pregnancy");
    expect(hit?.message).toBe(MESSAGES.pregnancy);
  });

  it("hits self_harm for 自殺", () => {
    const hit = scanHighRisk({ nickname: "想自殺嗎", focus: "整體" });

    expect(hit?.category).toBe("self_harm");
    expect(hit?.message).toBe(MESSAGES.self_harm);
  });

  it("uses the first matching category when several apply", () => {
    const hit = scanHighRisk({ nickname: "律師說這筆投資", focus: "工作" });

    expect(hit?.category).toBe("legal");
    expect(hit?.message).toBe(MESSAGES.legal);
  });

  it("does not treat the single character 金 as a hit", () => {
    expect(scanHighRisk({ nickname: "金", focus: "工作" })).toBeNull();
  });

  it("scans focus as well as nickname", () => {
    const hit = scanHighRisk({ nickname: "小圓", focus: "投資" });

    expect(hit?.category).toBe("financial_risk");
  });
});
