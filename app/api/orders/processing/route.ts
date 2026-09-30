import { readProcessingResult } from "../../../../lib/orders/read-processing-result";
import { createServiceRoleClient } from "../../../../lib/supabase/server";
import { getSessionUser } from "../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

// 付款結果讀取：只讀、需要 session；忽略 RtnCode／SimulatePaid 等付款 query。
export async function GET(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const orderParam = new URL(request.url).searchParams.get("order");
  const client = await createServiceRoleClient();
  const result = await readProcessingResult(client, user.id, orderParam, new Date());
  return Response.json(result.body, { status: result.status });
}
