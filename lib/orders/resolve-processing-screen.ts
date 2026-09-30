import {
  POINTS_PACK_5_PLAN_ID,
  SUBSCRIBE_REPORT_MONTHLY_PLAN_ID,
  UNLOCK_REPORT_LIFETIME_PLAN_ID,
} from "../payments/plans";

export type ProcessingScreen =
  | "accepted"
  | "incomplete"
  | "unlock_completed"
  | "points_credited"
  | "subscription_active"
  | "subscription_inactive"
  | "needs_manual";

export type ProcessingEvidence = {
  order: { status: string; planId: string };
  accessStatus: string | null;
  // 本筆 point_transactions.type=credit_purchase 且 source_order_id=本筆
  hasOwnCredit: boolean;
  // 本筆訂閱＝subscriptions.order_id 等於本筆；hasFirstSuccess 為該訂閱是否有 first_success 事件
  ownSubscription: {
    status: string;
    currentPeriodEnd: string;
    hasFirstSuccess: boolean;
  } | null;
  now: Date;
};

// spec §2 Story 2：先看 orders.status，再看本筆證據；每筆訂單只落在一個 screen。
export function resolveProcessingScreen(evidence: ProcessingEvidence): ProcessingScreen {
  const { order } = evidence;
  if (order.status === "pending") {
    return "accepted";
  }
  if (order.status === "failed") {
    return "incomplete";
  }
  if (order.status !== "paid") {
    return "needs_manual";
  }

  if (order.planId === UNLOCK_REPORT_LIFETIME_PLAN_ID) {
    return evidence.accessStatus === "unlocked" ? "unlock_completed" : "needs_manual";
  }
  if (order.planId === POINTS_PACK_5_PLAN_ID) {
    return evidence.hasOwnCredit ? "points_credited" : "needs_manual";
  }
  if (order.planId === SUBSCRIBE_REPORT_MONTHLY_PLAN_ID) {
    const sub = evidence.ownSubscription;
    if (!sub?.hasFirstSuccess) {
      return "needs_manual";
    }
    const withinPeriod = evidence.now.getTime() <= new Date(sub.currentPeriodEnd).getTime();
    const inactiveStatus = sub.status === "cancelled" || sub.status === "expired";
    return withinPeriod && !inactiveStatus ? "subscription_active" : "subscription_inactive";
  }
  return "needs_manual";
}
