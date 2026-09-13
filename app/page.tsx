import { HomeClient } from "../components/home/HomeClient";
import { ensureProfile } from "../lib/membership/ensureProfile";
import { getSessionUser } from "../lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  let initialAccessStatus: "locked" | "unlocked" | null = null;

  if (user) {
    try {
      const profile = await ensureProfile({
        userId: user.id,
        email: user.email ?? "",
      });
      initialAccessStatus = profile?.access_status ?? "locked";
    } catch {
      initialAccessStatus = "locked";
    }
  }

  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <HomeClient
        initialAccessStatus={initialAccessStatus}
        initialHasSession={Boolean(user)}
      />
    </main>
  );
}
