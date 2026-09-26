import { DISCLAIMER } from "../../../../lib/constants";
import {
  forbiddenLockedError,
  jsonError,
  loginRequiredError,
  reportNotFoundError,
} from "../../../../lib/errors";
import { resolveReportEntitlement } from "../../../../lib/entitlements/resolve";
import { createServiceRoleClient } from "../../../../lib/supabase/server";
import { getSessionUser } from "../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isEmptyAdvanced(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return true;
  }
  return Object.keys(value).length === 0;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ persistId: string }> },
): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(loginRequiredError());
  }

  const { persistId } = await context.params;
  if (!UUID_RE.test(persistId)) {
    return jsonError(reportNotFoundError());
  }

  const client = await createServiceRoleClient();
  const { data: row } = await client
    .from("reports")
    .select()
    .eq("id", persistId)
    .maybeSingle();

  const report = row as {
    user_id?: string | null;
    generation_status?: string;
    basic_json?: unknown;
    advanced_json?: unknown;
  } | null;

  // Lifetime access and grants are not owner passes: legacy rows without
  // user_id and other members' reports stay unreadable.
  if (!report || report.user_id == null || report.user_id !== user.id) {
    return jsonError(reportNotFoundError());
  }

  const entitlement = await resolveReportEntitlement(client, user.id, persistId);
  if (entitlement === "none") {
    return jsonError(forbiddenLockedError());
  }

  if (
    report.generation_status !== "success" ||
    isEmptyAdvanced(report.advanced_json)
  ) {
    return jsonError(reportNotFoundError());
  }

  const basic = asObject(report.basic_json);
  const advanced = asObject(report.advanced_json);

  return Response.json({
    persist_id: persistId,
    report_id: readString(basic.report_id),
    tier: "advanced",
    nickname: readString(basic.nickname),
    birth_date: readString(basic.birth_date),
    birth_time: basic.birth_time === null ? null : readString(basic.birth_time),
    time_unknown: basic.time_unknown === true,
    focus: readString(basic.focus),
    overall: readString(basic.overall),
    work: readString(basic.work),
    relationship: readString(basic.relationship),
    action: readString(basic.action),
    rationale: readString(advanced.rationale),
    path_compare: advanced.path_compare,
    action_plan: advanced.action_plan,
    disclaimer: readString(basic.disclaimer) || DISCLAIMER,
    locked_fields: [],
    ...(entitlement === "lifetime"
      ? { access_status: "unlocked" as const }
      : { access_status: "locked" as const, unlock_mode: entitlement }),
  });
}
