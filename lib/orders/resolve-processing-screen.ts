// TODO(US-019)：實作。此為 US-018 測試用空殼，只為讓測試能載入。

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

export function resolveProcessingScreen(evidence: ProcessingEvidence): ProcessingScreen {
  void evidence;
  throw new Error("not implemented");
}
