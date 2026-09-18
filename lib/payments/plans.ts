/**
 * 後端唯一可建單方案。金額／品名以後端為準，未知 plan 不給價。
 */
import "server-only";

export const UNLOCK_REPORT_LIFETIME_PLAN_ID = "unlock_report_lifetime";

export type CheckoutPlan = {
  planId: typeof UNLOCK_REPORT_LIFETIME_PLAN_ID;
  amount: 99;
  currency: "TWD";
  itemName: "紫微斗數完整解讀";
  tradeDesc: "紫微斗數完整解讀";
};

const UNLOCK_REPORT_LIFETIME_PLAN: CheckoutPlan = {
  planId: UNLOCK_REPORT_LIFETIME_PLAN_ID,
  amount: 99,
  currency: "TWD",
  itemName: "紫微斗數完整解讀",
  tradeDesc: "紫微斗數完整解讀",
};

export function resolveCheckoutPlan(planId: string): CheckoutPlan | null {
  if (planId === UNLOCK_REPORT_LIFETIME_PLAN_ID) {
    return UNLOCK_REPORT_LIFETIME_PLAN;
  }
  return null;
}
