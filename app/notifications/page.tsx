import Link from "next/link";
import { NotificationList } from "../../components/notifications/NotificationList";
import { listNotifications } from "../../lib/notifications/list-notifications";
import { createServiceRoleClient } from "../../lib/supabase/server";
import { createSessionClient, getSessionUser } from "../../lib/supabase/session";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <article className="w-full min-w-0 max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
        {children}
      </article>
    </main>
  );
}

async function loadItems(userId: string) {
  try {
    const session = await createSessionClient();
    if (!session) {
      return null;
    }
    const service = await createServiceRoleClient();
    return await listNotifications(session, service, userId);
  } catch {
    return null;
  }
}

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">請先登入</h1>
        <Link
          className="mt-6 inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4"
          href="/login"
        >
          前往登入
        </Link>
      </Shell>
    );
  }

  const items = await loadItems(user.id);
  return (
    <Shell>
      <h1 className="font-serif text-display text-ink">通知</h1>
      {items ? (
        <NotificationList initialItems={items} />
      ) : (
        <p className="mt-4 text-[13px] text-warn" role="alert">
          通知暫時讀不到，請稍後重新整理。
        </p>
      )}
    </Shell>
  );
}
