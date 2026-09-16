import { ERROR_MESSAGES } from "../../../../lib/constants";
import {
  AppError,
  jsonError,
  memberNotFoundError,
  unauthorizedError,
  updateFailedError,
  validationError,
} from "../../../../lib/errors";
import { createServiceRoleClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

function readIdentity(body: Record<string, unknown>): {
  email: string;
  userId: string;
} {
  return {
    email: typeof body.email === "string" ? body.email.trim() : "",
    userId: typeof body.user_id === "string" ? body.user_id.trim() : "",
  };
}

async function resolveUserId(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  identity: { email: string; userId: string },
): Promise<string | null> {
  if (identity.userId) {
    const { data, error } = await client.auth.admin.getUserById(identity.userId);
    if (error || !data.user) {
      return null;
    }
    return data.user.id;
  }

  const { data, error } = await client.auth.admin.listUsers();
  if (error) {
    throw updateFailedError();
  }

  return data.users.find((user) => user.email === identity.email)?.id ?? null;
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.MEMBERSHIP_GRANT_ENABLED !== "1") {
    return new Response(null, { status: 404 });
  }

  const secret = process.env.MEMBERSHIP_GRANT_SECRET ?? "";
  const token = readBearerToken(request);
  if (!secret || token !== secret) {
    return jsonError(unauthorizedError());
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(validationError(ERROR_MESSAGES.GRANT_IDENTITY_REQUIRED));
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(validationError(ERROR_MESSAGES.GRANT_IDENTITY_REQUIRED));
  }

  const identity = readIdentity(body as Record<string, unknown>);
  if (!identity.email && !identity.userId) {
    return jsonError(validationError(ERROR_MESSAGES.GRANT_IDENTITY_REQUIRED));
  }

  try {
    const client = await createServiceRoleClient();
    const userId = await resolveUserId(client, identity);
    if (!userId) {
      return jsonError(memberNotFoundError());
    }

    const { data, error } = await client
      .from("profiles")
      .update({ access_status: "unlocked" })
      .eq("user_id", userId)
      .select("user_id, access_status")
      .maybeSingle();

    if (error) {
      return jsonError(
        error.message === "not found"
          ? memberNotFoundError()
          : updateFailedError(),
      );
    }
    if (!data) {
      return jsonError(memberNotFoundError());
    }

    return Response.json({
      user_id: userId,
      access_status: "unlocked",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonError(error);
    }
    return jsonError(updateFailedError());
  }
}
