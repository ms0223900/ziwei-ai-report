import { HomeClient } from "../components/home/HomeClient";
import { ensureProfile } from "../lib/membership/ensureProfile";
import { createServiceRoleClient } from "../lib/supabase/server";
import { getSessionUser } from "../lib/supabase/session";

export const dynamic = "force-dynamic";

// Kept apart from the profile read: if the subscriptions table is missing or
// the query fails, lifetime access and points still render normally.
async function readSubscriptionActiveUntil(userId: string): Promise<string | null> {
  try {
    const client = await createServiceRoleClient();
    const { data, error } = await client
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    const periodEnd = (data as { current_period_end?: string } | null)
      ?.current_period_end;
    if (error || !periodEnd || new Date(periodEnd).getTime() < Date.now()) {
      return null;
    }
    return periodEnd;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const user = await getSessionUser();
  let initialAccessStatus: "locked" | "unlocked" | null = null;
  let initialPointsBalance = 0;
  let initialSubscriptionActiveUntil: string | null = null;

  if (user) {
    try {
      const profile = await ensureProfile({
        userId: user.id,
        email: user.email ?? "",
      });
      initialAccessStatus = profile?.access_status ?? "locked";
      initialPointsBalance = profile?.points_balance ?? 0;
    } catch {
      initialAccessStatus = "locked";
    }
    initialSubscriptionActiveUntil = await readSubscriptionActiveUntil(user.id);
  }

  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <HomeClient
        initialAccessStatus={initialAccessStatus}
        initialHasSession={Boolean(user)}
        initialPointsBalance={initialPointsBalance}
        initialSubscriptionActiveUntil={initialSubscriptionActiveUntil}
      />
    </main>
  );
}
