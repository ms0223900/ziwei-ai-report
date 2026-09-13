import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "./public-env";

export async function createSessionClient() {
  const env = readSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 無法寫 cookie；交給 proxy 刷新。
        }
      },
    },
  });
}

export async function getSessionUser(): Promise<User | null> {
  const client = await createSessionClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
