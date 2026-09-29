import { describe, expect, it } from "vitest";
import { NOTIFICATION_TEXT, NOTIFICATION_TYPES } from "./types";

describe("notification text constants", () => {
  it("has exactly the eight spec types", () => {
    expect([...NOTIFICATION_TYPES].sort()).toEqual(
      [
        "admin_compensated",
        "credit_completed",
        "order_failed",
        "order_pending",
        "report_unlocked",
        "subscription_active",
        "subscription_inactive",
        "unlock_completed",
      ].sort(),
    );
    expect(Object.keys(NOTIFICATION_TEXT).sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });

  it("matches the spec Story 5 table verbatim", () => {
    expect(NOTIFICATION_TEXT).toEqual({
      order_pending: "付款已受理，正在確認中",
      order_failed: "付款未完成，尚未變更權益",
      unlock_completed: "付款成功：完整解讀已解鎖",
      credit_completed: "付款成功：已新增 5 點",
      report_unlocked: "已用 1 點解鎖此報告",
      subscription_active: "訂閱有效至 {日期}",
      subscription_inactive: "訂閱已失效",
      admin_compensated: "已完成人工補償：已新增 5 點",
    });
  });
});
