import { describe, expect, it } from "vitest";
import { resolveCheckoutPlan } from "./plans";

describe("checkout plan catalog", () => {
  it("returns amount and item copy for the lifetime unlock plan", () => {
    expect(resolveCheckoutPlan("unlock_report_lifetime")).toEqual({
      planId: "unlock_report_lifetime",
      amount: 99,
      currency: "TWD",
      itemName: "紫微斗數完整解讀",
      tradeDesc: "紫微斗數完整解讀",
    });
  });

  it("fails unknown plan ids without returning a price", () => {
    const unknown = resolveCheckoutPlan("not_a_supported_plan");
    expect(unknown).toBeNull();
  });
});
