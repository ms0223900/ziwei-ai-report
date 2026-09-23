import { jsonError, loginRequiredError } from "../../../../lib/errors";
import { createServiceRoleClient } from "../../../../lib/supabase/server";
import { getSessionUser } from "../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

type UnlockRow = {
  ok?: boolean;
  reason?: string;
  points_balance?: number;
};

function isUniqueConflict(error: { code?: string; message?: string }): boolean {
  if (error.code === "23505") {
    return true;
  }
  return /unique|duplicate/i.test(error.message ?? "");
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // 無效 JSON 視為沒有 report_id
  }
  return {};
}

function readRow(data: unknown): UnlockRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return null;
  }
  return row as UnlockRow;
}

function unlockJson(row: UnlockRow): Response {
  return Response.json({
    ok: row.ok === true,
    reason: row.reason ?? "forbidden",
    points_balance: Number(row.points_balance ?? 0),
  });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(loginRequiredError());
  }

  const body = await readBody(request);
  const reportId = typeof body.report_id === "string" ? body.report_id : "";
  const client = await createServiceRoleClient();
  const { data, error } = await client.rpc("unlock_report_with_point", {
    report_id: reportId,
    p_user_id: user.id,
  });

  if (error) {
    if (!isUniqueConflict(error)) {
      return Response.json(
        { ok: false, reason: "forbidden", points_balance: 0 },
        { status: 500 },
      );
    }
    const { data: profile } = await client
      .from("profiles")
      .select()
      .eq("user_id", user.id)
      .maybeSingle();
    const points =
      profile && typeof profile === "object" && "points_balance" in profile
        ? Number((profile as { points_balance?: number }).points_balance ?? 0)
        : 0;
    return unlockJson({
      ok: true,
      reason: "already_unlocked",
      points_balance: Number.isFinite(points) ? points : 0,
    });
  }

  return unlockJson(readRow(data) ?? { ok: false, reason: "forbidden", points_balance: 0 });
}
