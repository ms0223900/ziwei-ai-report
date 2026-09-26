export type ReportEntitlement = "lifetime" | "points" | "subscription" | "none";

type QueryResult = { data: unknown; error: unknown };

type EntitlementQuery = PromiseLike<QueryResult> & {
  select(columns?: string): EntitlementQuery;
  eq(column: string, value: unknown): EntitlementQuery;
  maybeSingle(): PromiseLike<QueryResult>;
};

type EntitlementClient = {
  from(table: string): unknown;
};

function query(client: EntitlementClient, table: string): EntitlementQuery {
  return client.from(table) as EntitlementQuery;
}

/**
 * 看某份報告進階內容的權限順序：永久解鎖 → 單點解鎖 → 訂閱有效期間。
 * 訂閱只以 current_period_end 為準，不看 status 或 profiles.subscription_status；
 * 查詢失敗（例如表尚未套用）一律視為沒有該權益，不讓權限判斷整個丟錯。
 */
export async function resolveReportEntitlement(
  client: EntitlementClient,
  userId: string,
  reportId: string,
): Promise<ReportEntitlement> {
  const { data: profile } = await query(client, "profiles")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  if ((profile as { access_status?: string } | null)?.access_status === "unlocked") {
    return "lifetime";
  }

  const { data: unlock } = await query(client, "report_unlocks")
    .select()
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();
  if (unlock != null) {
    return "points";
  }

  const { data: subscription, error } = await query(client, "subscriptions")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  const periodEnd = (subscription as { current_period_end?: string } | null)
    ?.current_period_end;
  if (!error && periodEnd && new Date(periodEnd).getTime() >= Date.now()) {
    return "subscription";
  }
  return "none";
}
