import { describe, expect, it } from "vitest";
import {
  assertDemoOrLocalSupabaseUrl,
  formatZhSummary,
  generateMerchantTradeNo,
  isWebhookUnreachableFlag,
  parseArgs,
  redactSecrets,
  ZIWEI_DEMO_PROJECT_REF,
} from "./course-recording-reset.mjs";

describe("course-recording-reset CLI helpers", () => {
  it("parses reset flags with safe defaults (keep orders)", () => {
    const args = parseArgs(["reset", "--email", "a@b.c", "--seed-pending", "4"]);
    expect(args.command).toBe("reset");
    expect(args.email).toBe("a@b.c");
    expect(args.clearOrders).toBe(false);
    expect(args.seedPending).toBe(4);
    expect(args.dryRun).toBe(false);
  });

  it("parses --clear-orders and webhook subcommands", () => {
    expect(parseArgs(["reset", "--user-id", "u1", "--clear-orders"]).clearOrders).toBe(
      true,
    );
    expect(parseArgs(["webhook", "off"]).webhookMode).toBe("off");
    expect(parseArgs(["webhook", "on"]).webhookMode).toBe("on");
    expect(parseArgs(["webhook", "status"]).webhookMode).toBe("status");
  });

  it("rejects bad --seed-pending", () => {
    expect(() => parseArgs(["--seed-pending", "-1"])).toThrow(/非負整數/);
  });

  it("allows only local or ziwei-demo supabase URLs (fail closed)", () => {
    expect(assertDemoOrLocalSupabaseUrl("http://127.0.0.1:54321")).toBe("local");
    expect(assertDemoOrLocalSupabaseUrl("http://localhost:54321")).toBe("local");
    expect(
      assertDemoOrLocalSupabaseUrl(
        `https://${ZIWEI_DEMO_PROJECT_REF}.supabase.co`,
      ),
    ).toBe("ziwei-demo");

    expect(() =>
      assertDemoOrLocalSupabaseUrl("https://prodproject123.supabase.co"),
    ).toThrow(/拒絕執行/);
    expect(() => assertDemoOrLocalSupabaseUrl("")).toThrow(/缺少/);
    expect(() => assertDemoOrLocalSupabaseUrl("not-a-url")).toThrow(/合法 URL/);
  });

  it("generates MerchantTradeNo in the same alphanumeric ≤20 format as checkout", () => {
    const taken = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const no = generateMerchantTradeNo({ taken });
      expect(no).toMatch(/^[A-Za-z0-9]{1,20}$/);
      taken.add(no);
    }
    expect(taken.size).toBe(8);
  });

  it("reads ECPAY_WEBHOOK_UNREACHABLE only as 1/true", () => {
    expect(isWebhookUnreachableFlag({})).toBe(false);
    expect(isWebhookUnreachableFlag({ ECPAY_WEBHOOK_UNREACHABLE: "0" })).toBe(
      false,
    );
    expect(isWebhookUnreachableFlag({ ECPAY_WEBHOOK_UNREACHABLE: "1" })).toBe(
      true,
    );
    expect(isWebhookUnreachableFlag({ ECPAY_WEBHOOK_UNREACHABLE: "true" })).toBe(
      true,
    );
  });

  it("redacts service role keys from error text", () => {
    const key = "super-secret-service-role-key-value";
    expect(redactSecrets(`fail ${key} boom`, key)).toBe(
      "fail [REDACTED_SERVICE_ROLE_KEY] boom",
    );
  });

  it("prints a Traditional Chinese pre-recording checklist summary", () => {
    const text = formatZhSummary({
      targetLabel: "demo@example.com / uuid-1",
      supabaseKind: "local",
      dryRun: true,
      profile: { access_status: "locked", previous: "unlocked", existed: true },
      orders: [
        { merchant_trade_no: "ABC123", amount: 99, status: "pending" },
        { merchant_trade_no: "DEF456", amount: 99, status: "pending" },
      ],
      clearOrders: true,
      seeded: [
        { merchant_trade_no: "ABC123", amount: 99, status: "pending" },
        { merchant_trade_no: "DEF456", amount: 99, status: "pending" },
      ],
    });
    expect(text).toContain("錄影前檢查清單");
    expect(text).toContain("未解鎖（locked）");
    expect(text).toContain("編號 ABC123｜金額 99｜狀態 pending");
    expect(text).toContain("dry-run");
  });
});
