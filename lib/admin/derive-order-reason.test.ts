import { describe, expect, it } from "vitest";
import { deriveOrderReason, type OrderReasonInput } from "./derive-order-reason";

function input(overrides: Partial<OrderReasonInput>): OrderReasonInput {
  return {
    status: "paid",
    hasCompletionEvidence: false,
    hasAdminOk: false,
    hasSuccessNotification: false,
    ...overrides,
  };
}

describe("deriveOrderReason", () => {
  it("pending → 等待 Webhook", () => {
    expect(deriveOrderReason(input({ status: "pending" }))).toBe("等待 Webhook");
  });

  it("paid without completion evidence → 需要補償", () => {
    expect(deriveOrderReason(input({ status: "paid" }))).toBe("需要補償");
  });

  it("an ok admin action → 人工補償完成, even with evidence and a notification", () => {
    expect(
      deriveOrderReason(
        input({ hasAdminOk: true, hasCompletionEvidence: true, hasSuccessNotification: true }),
      ),
    ).toBe("人工補償完成");
  });

  it("failed without completion evidence → 無法處理", () => {
    expect(deriveOrderReason(input({ status: "failed" }))).toBe("無法處理");
  });

  it("completion evidence without a success notification → 已履約但無通知", () => {
    expect(
      deriveOrderReason(input({ hasCompletionEvidence: true, hasSuccessNotification: false })),
    ).toBe("已履約但無通知");
  });

  it("completion evidence with a success notification → 已履約", () => {
    expect(
      deriveOrderReason(input({ hasCompletionEvidence: true, hasSuccessNotification: true })),
    ).toBe("已履約");
  });
});
