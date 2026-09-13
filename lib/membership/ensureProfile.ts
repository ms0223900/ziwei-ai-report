/**
 * 只補 profiles 列，不覆寫既有權益／display_name。
 */
import "server-only";
import { createServiceRoleClient } from "../supabase/server";

export type EnsureProfileInput = {
  userId: string;
  email: string;
};

export type ProfileRow = {
  user_id: string;
  display_name: string;
  access_status: "locked" | "unlocked";
  points_balance: number;
  subscription_status: string;
  created_at?: string;
  updated_at?: string;
};

export function displayNameFromEmail(email: string): string {
  return email.split("@")[0] ?? "";
}

export function buildMissingProfileInsert(input: EnsureProfileInput) {
  return {
    user_id: input.userId,
    display_name: displayNameFromEmail(input.email),
    access_status: "locked" as const,
    points_balance: 0,
    subscription_status: "none" as const,
  };
}

export async function ensureProfile(
  input: EnsureProfileInput,
): Promise<ProfileRow | null> {
  const client = await createServiceRoleClient();
  const payload = buildMissingProfileInsert({
    userId: input.userId,
    email: input.email,
  });

  const { error: upsertError } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "user_id", ignoreDuplicates: true });

  if (upsertError) {
    throw upsertError;
  }

  const { data, error } = await client
    .from("profiles")
    .select()
    .eq("user_id", input.userId)
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}
