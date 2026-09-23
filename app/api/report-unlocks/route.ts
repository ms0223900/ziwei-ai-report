import { jsonError, loginRequiredError } from "../../../lib/errors";
import { createServiceRoleClient } from "../../../lib/supabase/server";
import { getSessionUser } from "../../../lib/supabase/session";

export const dynamic = "force-dynamic";

type UnlockRow = { report_id?: string; created_at?: string };

type ReportRow = {
  user_id?: string | null;
  nickname?: string;
  basic_json?: { nickname?: unknown } | null;
};

export type ReportUnlockItem = {
  report_id: string;
  nickname: string;
  created_at: string;
};

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(loginRequiredError());
  }

  const client = await createServiceRoleClient();
  // The menu only reflects point unlocks; lifetime access_status is not a source.
  const { data: unlocks } = await client
    .from("report_unlocks")
    .select("report_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items: ReportUnlockItem[] = [];
  for (const unlock of (unlocks ?? []) as UnlockRow[]) {
    if (!unlock.report_id) {
      continue;
    }
    const { data } = await client
      .from("reports")
      .select("user_id, nickname, basic_json")
      .eq("id", unlock.report_id)
      .maybeSingle();
    const report = data as ReportRow | null;
    if (!report || report.user_id == null || report.user_id !== user.id) {
      continue;
    }
    const fallbackNickname = report.basic_json?.nickname;
    items.push({
      report_id: unlock.report_id,
      nickname:
        report.nickname ??
        (typeof fallbackNickname === "string" ? fallbackNickname : ""),
      created_at: unlock.created_at ?? "",
    });
  }

  return Response.json(items);
}
