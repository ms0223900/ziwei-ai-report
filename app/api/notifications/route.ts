import { listNotifications } from "../../../lib/notifications/list-notifications";
import { createServiceRoleClient } from "../../../lib/supabase/server";
import { createSessionClient, getSessionUser } from "../../../lib/supabase/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  const session = user ? await createSessionClient() : null;
  if (!user || !session) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const service = await createServiceRoleClient();
  const notifications = await listNotifications(session, service, user.id);
  if (!notifications) {
    return Response.json({ error: "讀取通知失敗，請稍後再試" }, { status: 500 });
  }
  return Response.json({ notifications });
}
