import { forbidden } from "next/navigation";
import { CompensationForm } from "../../../components/admin/CompensationForm";
import { isAdminUser } from "../../../lib/admin/is-admin";
import { readAdminOrder } from "../../../lib/admin/read-admin-order";
import { createServiceRoleClient } from "../../../lib/supabase/server";
import { getSessionUser } from "../../../lib/supabase/session";

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

const yesNo = (value: boolean) => (value ? "有" : "無");

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">請先登入</h1>
      </Shell>
    );
  }
  // 非白名單在讀任何訂單或餘額之前就中斷，回 HTTP 403。
  if (!isAdminUser(user.id)) {
    forbidden();
  }

  const params = await searchParams;
  const orderParam = typeof params.order === "string" ? params.order.trim() : null;
  if (!orderParam) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">訂單查詢</h1>
        <p className="mt-4 text-[13px] text-ink-soft">請在網址加上 ?order=訂單編號 查詢。</p>
      </Shell>
    );
  }

  const client = await createServiceRoleClient();
  const view = await readAdminOrder(client, orderParam);
  if (!view) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">訂單查詢</h1>
        <p className="mt-4 text-[13px] text-warn" role="alert">
          查無這筆訂單，請確認訂單編號。
        </p>
      </Shell>
    );
  }

  const { order, evidence } = view;
  return (
    <Shell>
      <h1 className="font-serif text-display text-ink">訂單查詢</h1>
      <p className="mt-2 text-[15px] font-medium text-seal">處置原因：{view.reason}</p>
      <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px] leading-snug">
        <dt className="text-ink-soft">訂單編號</dt>
        <dd className="break-all font-mono text-ink">{order.id}</dd>
        <dt className="text-ink-soft">狀態</dt>
        <dd className="text-ink">{order.status}</dd>
        <dt className="text-ink-soft">方案</dt>
        <dd className="break-all text-ink">{order.planId}</dd>
        <dt className="text-ink-soft">金額</dt>
        <dd className="text-ink">
          {order.amount} {order.currency}
        </dd>
        <dt className="text-ink-soft">本筆加點</dt>
        <dd className="text-ink">{yesNo(evidence.hasCredit)}</dd>
        <dt className="text-ink-soft">帳號解鎖</dt>
        <dd className="text-ink">{evidence.accessStatus ?? "—"}</dd>
        <dt className="text-ink-soft">訂閱首期</dt>
        <dd className="text-ink">
          {yesNo(evidence.hasFirstSuccess)}
          {evidence.currentPeriodEnd ? `（期末 ${evidence.currentPeriodEnd}）` : ""}
        </dd>
        <dt className="text-ink-soft">成功通知</dt>
        <dd className="text-ink">{yesNo(view.hasSuccessNotification)}</dd>
        <dt className="text-ink-soft">人工補償</dt>
        <dd className="text-ink">{yesNo(view.hasAdminOk)}</dd>
      </dl>
      <CompensationForm orderId={order.id} />
    </Shell>
  );
}
