import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./public-env";

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
