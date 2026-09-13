export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY，無法建立瀏覽器 Supabase client。",
    );
  }
  return env;
}
