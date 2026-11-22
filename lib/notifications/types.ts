export const NOTIFICATION_TYPES = [
  "order_pending",
  "order_failed",
  "unlock_completed",
  "credit_completed",
  "report_unlocked",
  "subscription_active",
  "subscription_inactive",
  "admin_compensated",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationSourceType =
  | "order"
  | "report"
  | "subscription_event"
  | "admin_action";

// spec §2 Story 5 表；subscription_active 的 {日期} 由通知列表 API（US-022）組出。
export const NOTIFICATION_TEXT: Record<NotificationType, string> = {
  order_pending: "付款已受理，正在確認中",
  order_failed: "付款未完成，尚未變更權益",
  unlock_completed: "付款成功：完整解讀已解鎖",
  credit_completed: "付款成功：已新增 5 點",
  report_unlocked: "已用 1 點解鎖此報告",
  subscription_active: "訂閱有效至 {日期}",
  subscription_inactive: "訂閱已失效",
  admin_compensated: "已完成人工補償：已新增 5 點",
};
