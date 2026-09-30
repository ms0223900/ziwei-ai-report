import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  POINTS_PACK_5_PLAN_ID,
  SUBSCRIBE_REPORT_MONTHLY_PLAN_ID,
  UNLOCK_REPORT_LIFETIME_PLAN_ID,
} from "../payments/plans";
import { deriveOrderReason } from "./derive-order-reason";

export type AdminOrderView = {
  order: { id: string; status: string; planId: string; amount: number; currency: string };
  evidence: {
    hasCredit: boolean;
    accessStatus: string | null;
    hasFirstSuccess: boolean;
    currentPeriodEnd: string | null;
  };
  hasAdminOk: boolean;
  hasSuccessNotification: boolean;
  reason: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function notificationExists(client: SupabaseClient, key: string): Promise<boolean> {
  const { data } = await client
    .from("notifications")
    .select()
    .eq("idempotency_key", key)
    .maybeSingle();
  return Boolean(data);
}

// 管理者查詢：service role 讀取；呼叫端必須先確認白名單。只讀，不寫任何表。
export async function readAdminOrder(
  client: SupabaseClient,
  orderParam: string | null,
): Promise<AdminOrderView | null> {
  if (!orderParam || !UUID_RE.test(orderParam)) {
    return null;
  }
  const { data: orderData } = await client.from("orders").select().eq("id", orderParam).maybeSingle();
  const order = orderData as {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    amount: number;
    currency: string;
  } | null;
  if (!order) {
    return null;
  }

  const [{ data: profile }, { data: credit }, { data: actions }] = await Promise.all([
    client.from("profiles").select().eq("user_id", order.user_id).maybeSingle(),
    client
      .from("point_transactions")
      .select()
      .eq("source_order_id", order.id)
      .eq("type", "credit_purchase")
      .maybeSingle(),
    client.from("admin_actions").select().eq("source_order_id", order.id),
  ]);
  const accessStatus = (profile as { access_status?: string } | null)?.access_status ?? null;
  const okAction = ((actions ?? []) as { id: string; result: string }[]).find(
    (row) => row.result === "ok",
  );

  let hasFirstSuccess = false;
  let currentPeriodEnd: string | null = null;
  let firstSuccessId: string | null = null;
  const { data: sub } = await client
    .from("subscriptions")
    .select()
    .eq("order_id", order.id)
    .maybeSingle();
  if (sub) {
    const subscription = sub as { id: string; current_period_end: string };
    currentPeriodEnd = subscription.current_period_end;
    const { data: event } = await client
      .from("subscription_events")
      .select()
      .eq("subscription_id", subscription.id)
      .eq("event_type", "first_success")
      .maybeSingle();
    firstSuccessId = (event as { id?: string } | null)?.id ?? null;
    hasFirstSuccess = Boolean(firstSuccessId);
  }

  // 本筆的完成證據與對應的成功通知鍵。
  let hasCompletionEvidence = false;
  let successKey: string | null = null;
  if (order.plan_id === POINTS_PACK_5_PLAN_ID) {
    hasCompletionEvidence = Boolean(credit);
    successKey = `credit:${order.id}`;
  } else if (order.plan_id === UNLOCK_REPORT_LIFETIME_PLAN_ID) {
    hasCompletionEvidence = order.status === "paid" && accessStatus === "unlocked";
    successKey = `unlock:${order.id}`;
  } else if (order.plan_id === SUBSCRIBE_REPORT_MONTHLY_PLAN_ID) {
    hasCompletionEvidence = hasFirstSuccess;
    successKey = firstSuccessId ? `sub:${firstSuccessId}` : null;
  }

  const notified = await Promise.all([
    successKey ? notificationExists(client, successKey) : Promise.resolve(false),
    okAction ? notificationExists(client, `admin:${okAction.id}`) : Promise.resolve(false),
  ]);
  const hasSuccessNotification = notified.some(Boolean);
  const hasAdminOk = Boolean(okAction);

  return {
    order: {
      id: order.id,
      status: order.status,
      planId: order.plan_id,
      amount: order.amount,
      currency: order.currency,
    },
    evidence: { hasCredit: Boolean(credit), accessStatus, hasFirstSuccess, currentPeriodEnd },
    hasAdminOk,
    hasSuccessNotification,
    reason: deriveOrderReason({
      status: order.status,
      hasCompletionEvidence,
      hasAdminOk,
      hasSuccessNotification,
    }),
  };
}
