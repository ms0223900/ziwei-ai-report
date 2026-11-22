import { isAdminUser } from "../../../../lib/admin/is-admin";
import { insertNotification } from "../../../../lib/notifications/insert-notification";
import { POINTS_PACK_5_PLAN_ID } from "../../../../lib/payments/plans";
import { createServiceRoleClient } from "../../../../lib/supabase/server";
import { getSessionUser } from "../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ServiceClient = Awaited<ReturnType<typeof createServiceRoleClient>>;
type ActionResult = "ok" | "skipped_already_fulfilled" | "rejected";

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // 無效 JSON 視為空 body
  }
  return {};
}

async function recordAction(
  client: ServiceClient,
  row: {
    adminUserId: string;
    reason: string;
    orderId: string;
    idempotencyKey: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    result: ActionResult;
  },
) {
  return client
    .from("admin_actions")
    .insert({
      admin_user_id: row.adminUserId,
      action: "credit_points",
      reason: row.reason,
      source_order_id: row.orderId,
      idempotency_key: row.idempotencyKey,
      before_state: row.before,
      after_state: row.after,
      result: row.result,
    })
    .select()
    .single();
}

// 管理者補點：只重用 fulfill_points_pack_order，不直接改 points_balance、不新增 admin_credit。
export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  if (!isAdminUser(user.id)) {
    return Response.json({ error: "沒有管理權限" }, { status: 403 });
  }

  const body = await readBody(request);
  if (body.action !== "credit_points") {
    return Response.json({ error: "本版只接受補點" }, { status: 422 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return Response.json({ error: "請填寫處置原因" }, { status: 422 });
  }
  const orderId = typeof body.sourceOrderId === "string" ? body.sourceOrderId : "";
  if (!UUID_RE.test(orderId)) {
    return Response.json({ error: "訂單編號格式不正確" }, { status: 422 });
  }

  const client = await createServiceRoleClient();
  const { data: orderData } = await client.from("orders").select().eq("id", orderId).maybeSingle();
  const order = orderData as {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    trade_no: string | null;
  } | null;
  if (!order) {
    return Response.json({ error: "找不到訂單" }, { status: 404 });
  }

  const { data: profileData } = await client
    .from("profiles")
    .select()
    .eq("user_id", order.user_id)
    .maybeSingle();
  const pointsBefore = Number((profileData as { points_balance?: number } | null)?.points_balance ?? 0);
  const before = { points_balance: pointsBefore, order_status: order.status };
  const base = { adminUserId: user.id, reason, orderId, before, after: before };

  const eligible =
    order.plan_id === POINTS_PACK_5_PLAN_ID &&
    order.status === "paid" &&
    Boolean(order.trade_no?.trim());
  if (!eligible) {
    // rejected 另用唯一鍵，不占成功補償鍵；之後訂單符合條件仍可補點。
    await recordAction(client, {
      ...base,
      idempotencyKey: `compensate:${orderId}:credit_points:rejected:${crypto.randomUUID()}`,
      result: "rejected",
    });
    return Response.json(
      { result: "rejected", error: "這筆訂單不符合補點條件（需為已付款、有交易編號的點數包）" },
      { status: 422 },
    );
  }

  const skip = async () => {
    await recordAction(client, {
      ...base,
      idempotencyKey: `compensate:${orderId}:credit_points:skipped:${crypto.randomUUID()}`,
      result: "skipped_already_fulfilled",
    });
    return Response.json({ result: "skipped_already_fulfilled" });
  };

  const { data: credit } = await client
    .from("point_transactions")
    .select()
    .eq("source_order_id", orderId)
    .eq("type", "credit_purchase")
    .maybeSingle();
  if (credit) {
    return skip();
  }

  const { data: rpcData, error: rpcError } = await client.rpc("fulfill_points_pack_order", {
    order_id: orderId,
  });
  const rpc = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
    | { ok?: boolean; reason?: string; points_balance?: number }
    | null;
  if (rpcError || rpc?.ok !== true) {
    console.error("[admin compensation] credit failed", orderId, rpcError ?? rpc);
    return Response.json({ error: "補點失敗，請稍後再試" }, { status: 500 });
  }
  if (rpc.reason !== "credited") {
    return skip();
  }

  const after = { points_balance: Number(rpc.points_balance ?? pointsBefore + 5), order_status: order.status };
  const { data: action, error: actionError } = await recordAction(client, {
    ...base,
    after,
    idempotencyKey: `compensate:${orderId}:credit_points`,
    result: "ok",
  });
  const actionId = (action as { id?: string } | null)?.id;
  if (actionError || !actionId) {
    // 加點已提交；紀錄失敗只留 log，不回滾加點。
    console.error("[admin compensation] action record failed", orderId, actionError);
    return Response.json({ result: "ok" });
  }

  await insertNotification(client, {
    userId: order.user_id,
    type: "admin_compensated",
    sourceType: "admin_action",
    sourceId: actionId,
    idempotencyKey: `admin:${actionId}`,
  });
  return Response.json({ result: "ok" });
}
