import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatTaipeiDate } from "../time/taipei-date";
import { NOTIFICATION_TEXT, type NotificationType } from "./types";

export type NotificationItem = {
  id: string;
  type: string;
  text: string;
  href: string;
  createdAt: string | null;
  readAt: string | null;
};

type NotificationRow = {
  id: string;
  type: string;
  source_id: string;
  created_at?: string | null;
  read_at?: string | null;
};

const HOME_HREF = "/";

function orderHref(orderId: string | null | undefined): string {
  return orderId ? `/orders/processing?order=${encodeURIComponent(orderId)}` : HOME_HREF;
}

async function subscriptionForEvent(
  service: SupabaseClient,
  eventId: string,
): Promise<{ current_period_end?: string; order_id?: string | null } | null> {
  const { data: event } = await service
    .from("subscription_events")
    .select()
    .eq("id", eventId)
    .maybeSingle();
  const subscriptionId = (event as { subscription_id?: string } | null)?.subscription_id;
  if (!subscriptionId) {
    return null;
  }
  const { data: sub } = await service
    .from("subscriptions")
    .select()
    .eq("id", subscriptionId)
    .maybeSingle();
  return (sub as { current_period_end?: string; order_id?: string | null } | null) ?? null;
}

async function toItem(service: SupabaseClient, row: NotificationRow): Promise<NotificationItem> {
  const base = NOTIFICATION_TEXT[row.type as NotificationType] ?? "";
  let text = base;
  let href = HOME_HREF;

  switch (row.type) {
    case "order_pending":
    case "order_failed":
      href = orderHref(row.source_id);
      break;
    case "subscription_active": {
      const sub = await subscriptionForEvent(service, row.source_id);
      const date = sub?.current_period_end ? formatTaipeiDate(sub.current_period_end) : "";
      text = date ? base.replace("{日期}", date) : base.replace(" {日期}", "");
      break;
    }
    case "subscription_inactive": {
      const sub = await subscriptionForEvent(service, row.source_id);
      href = orderHref(sub?.order_id);
      break;
    }
    case "admin_compensated": {
      const { data } = await service
        .from("admin_actions")
        .select()
        .eq("id", row.source_id)
        .maybeSingle();
      href = orderHref((data as { source_order_id?: string } | null)?.source_order_id);
      break;
    }
    default:
      break;
  }

  return {
    id: row.id,
    type: row.type,
    text,
    href,
    createdAt: row.created_at ?? null,
    readAt: row.read_at ?? null,
  };
}

// 列表以 session client（受 RLS）讀自己的列；連結所需的訂閱／管理紀錄以 service role 補查。
export async function listNotifications(
  session: SupabaseClient,
  service: SupabaseClient,
  userId: string,
): Promise<NotificationItem[] | null> {
  const { data, error } = await session
    .from("notifications")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    return null;
  }
  const rows = (data ?? []) as NotificationRow[];
  return Promise.all(rows.map((row) => toItem(service, row)));
}
