import { createServiceRoleClient } from "../../../../../lib/supabase/server";
import { getSessionUser } from "../../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

// 已讀只經 service role：先確認這列屬於 session 使用者，read_at 為 null 才寫，已有值不覆寫。
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await context.params;
  const client = await createServiceRoleClient();
  const { data } = await client
    .from("notifications")
    .select()
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const row = data as { id: string; read_at?: string | null } | null;
  if (!row) {
    return Response.json({ error: "找不到通知" }, { status: 404 });
  }
  if (row.read_at) {
    return Response.json({ id: row.id, readAt: row.read_at });
  }

  const readAt = new Date().toISOString();
  const { error } = await client
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) {
    // 並發下另一請求可能已先寫入；重讀回傳實際值。
    const { data: again } = await client
      .from("notifications")
      .select()
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const current = (again as { read_at?: string | null } | null)?.read_at;
    if (current) {
      return Response.json({ id, readAt: current });
    }
    return Response.json({ error: "標記已讀失敗，請稍後再試" }, { status: 500 });
  }
  return Response.json({ id, readAt });
}
