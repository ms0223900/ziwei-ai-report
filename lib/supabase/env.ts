import "server-only";

export type SupabaseServiceRoleEnv = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseServiceRoleEnv(): SupabaseServiceRoleEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL，無法建立 Supabase service-role client。",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "缺少 SUPABASE_SERVICE_ROLE_KEY，無法建立 Supabase service-role client。",
    );
  }

  return { url, serviceRoleKey };
}
