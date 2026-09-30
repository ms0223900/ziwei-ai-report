import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  POINTS_PACK_5_PLAN_ID,
  SUBSCRIBE_REPORT_MONTHLY_PLAN_ID,
} from "../payments/plans";
import { formatTaipeiDate } from "../time/taipei-date";
import {
  resolveProcessingScreen,
  type ProcessingEvidence,
  type ProcessingScreen,
} from "./resolve-processing-screen";

export type ProcessingResult = { status: number; body: Record<string, unknown> };

type CtaKind = "refresh" | "report" | "home" | "plans";

const ACCEPTED_TITLE = "付款已受理，正在確認";
const POINTS_ADDED = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SCREEN_TITLES: Record<Exclude<ProcessingScreen, "subscription_active">, string> = {
  accepted: ACCEPTED_TITLE,
  incomplete: "付款未完成，尚未變更權益",
  unlock_completed: "完整解讀已解鎖",
  points_credited: "已新增 5 點",
  subscription_inactive: "訂閱已失效，進階權益已收回",
  needs_manual: "正在處理交付，權益尚未變更",
};

const CTAS: Record<ProcessingScreen, { primary: CtaKind; secondary: "home" | "plans" }> = {
  accepted: { primary: "refresh", secondary: "home" },
  needs_manual: { primary: "refresh", secondary: "home" },
  incomplete: { primary: "plans", secondary: "home" },
  unlock_completed: { primary: "report", secondary: "plans" },
  points_credited: { primary: "home", secondary: "plans" },
  subscription_active: { primary: "report", secondary: "plans" },
  subscription_inactive: { primary: "plans", secondary: "home" },
};

type OrderRow = {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: string | null;
};

type SubscriptionRow = { id: string; status: string; current_period_end: string };

async function loadOwnSubscription(
  client: SupabaseClient,
  orderId: string,
): Promise<ProcessingEvidence["ownSubscription"]> {
  const { data } = await client
    .from("subscriptions")
    .select()
    .eq("order_id", orderId)
    .maybeSingle();
  const sub = data as SubscriptionRow | null;
  if (!sub) {
    return null;
  }
  const { data: event } = await client
    .from("subscription_events")
    .select()
    .eq("subscription_id", sub.id)
    .eq("event_type", "first_success")
    .maybeSingle();
  return {
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    hasFirstSuccess: Boolean(event),
  };
}

// 只讀：以 session 使用者讀本筆訂單與本筆履約證據組回應。不寫任何表、不呼叫 markOrderFailed。
export async function readProcessingResult(
  client: SupabaseClient,
  userId: string,
  orderParam: string | null,
  now: Date,
): Promise<ProcessingResult> {
  const readAt = now.toISOString();
  if (!orderParam || !UUID_RE.test(orderParam)) {
    return {
      status: 200,
      body: {
        screen: "accepted",
        title: ACCEPTED_TITLE,
        detail: ACCEPTED_TITLE,
        order: null,
        delivery: null,
        primaryCta: { kind: CTAS.accepted.primary },
        secondaryCta: { kind: CTAS.accepted.secondary },
        readAt,
      },
    };
  }

  const { data: orderData } = await client
    .from("orders")
    .select()
    .eq("id", orderParam)
    .maybeSingle();
  const order = orderData as OrderRow | null;
  // 不存在與他人訂單一律 404，不區分。
  if (!order || order.user_id !== userId) {
    return { status: 404, body: { error: "找不到訂單" } };
  }

  const { data: profileData } = await client
    .from("profiles")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  const profile = profileData as { access_status?: string; points_balance?: number } | null;

  let hasOwnCredit = false;
  let ownSubscription: ProcessingEvidence["ownSubscription"] = null;
  if (order.status === "paid" && order.plan_id === POINTS_PACK_5_PLAN_ID) {
    const { data: credit } = await client
      .from("point_transactions")
      .select()
      .eq("source_order_id", order.id)
      .eq("type", "credit_purchase")
      .maybeSingle();
    hasOwnCredit = Boolean(credit);
  }
  if (order.status === "paid" && order.plan_id === SUBSCRIBE_REPORT_MONTHLY_PLAN_ID) {
    ownSubscription = await loadOwnSubscription(client, order.id);
  }

  const screen = resolveProcessingScreen({
    order: { status: order.status, planId: order.plan_id },
    accessStatus: profile?.access_status ?? null,
    hasOwnCredit,
    ownSubscription,
    now,
  });

  let delivery: Record<string, unknown> | null = null;
  let title: string;
  if (screen === "subscription_active" && ownSubscription) {
    title = `訂閱有效至 ${formatTaipeiDate(ownSubscription.currentPeriodEnd)}`;
    delivery = { activeUntil: ownSubscription.currentPeriodEnd };
  } else {
    title = SCREEN_TITLES[screen as Exclude<ProcessingScreen, "subscription_active">];
    if (screen === "unlock_completed") {
      delivery = { unlocked: true };
    } else if (screen === "points_credited") {
      delivery = {
        pointsAdded: POINTS_ADDED,
        pointsBalance: Number(profile?.points_balance ?? 0),
      };
    } else if (screen === "subscription_inactive") {
      delivery = { inactive: true };
    }
  }

  return {
    status: 200,
    body: {
      screen,
      title,
      detail: title,
      order: {
        id: order.id,
        planId: order.plan_id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        createdAt: order.created_at ?? null,
      },
      delivery,
      primaryCta: { kind: CTAS[screen].primary },
      secondaryCta: { kind: CTAS[screen].secondary },
      readAt,
    },
  };
}
