import Link from "next/link";
import { readProcessingResult } from "../../../lib/orders/read-processing-result";
import { createServiceRoleClient } from "../../../lib/supabase/server";
import { getSessionUser } from "../../../lib/supabase/session";

export const dynamic = "force-dynamic";

type Cta = { kind?: string };
type OrderSummary = {
  id: string;
  planId: string;
  amount: number;
  currency: string;
  createdAt: string | null;
};
type Delivery = {
  unlocked?: boolean;
  pointsAdded?: number;
  pointsBalance?: number;
  activeUntil?: string;
  inactive?: boolean;
} | null;

const CTA_LABELS: Record<string, string> = {
  refresh: "重新整理本頁",
  report: "查看完整報告",
  home: "返回報告",
  plans: "返回方案",
};

// 方案 CTA 都在報告頁，本版沒有獨立的方案路由。
function ctaHref(kind: string | undefined, orderId: string | null): string {
  if (kind === "refresh") {
    return orderId ? `/orders/processing?order=${encodeURIComponent(orderId)}` : "/orders/processing";
  }
  return "/";
}

function formatTaipei(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function deliverySummary(screen: string, delivery: Delivery): string {
  if (screen === "unlock_completed" && delivery?.unlocked) {
    return "完整解讀已開通";
  }
  if (screen === "points_credited" && delivery) {
    return `本筆新增 ${delivery.pointsAdded ?? 0} 點，目前餘額 ${delivery.pointsBalance ?? 0} 點`;
  }
  if (screen === "subscription_active" && delivery?.activeUntil) {
    return `訂閱期間至 ${formatTaipei(delivery.activeUntil)}`;
  }
  if (screen === "subscription_inactive") {
    return "本筆訂閱已不在有效期間";
  }
  return "尚無交付紀錄";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <article className="w-full min-w-0 max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
        {children}
      </article>
    </main>
  );
}

const linkClass =
  "inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4";

export default async function OrdersProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 只讀 order；RtnCode、SimulatePaid、TradeAmt 等付款 query 一律忽略。
  const params = await searchParams;
  const orderParam = typeof params.order === "string" ? params.order : null;

  const user = await getSessionUser();
  if (!user) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">請先登入</h1>
        <Link className={`mt-6 ${linkClass}`} href="/login">
          前往登入
        </Link>
      </Shell>
    );
  }

  const client = await createServiceRoleClient();
  const result = await readProcessingResult(client, user.id, orderParam, new Date());
  if (result.status !== 200) {
    return (
      <Shell>
        <h1 className="font-serif text-display text-ink">找不到訂單</h1>
        <Link className={`mt-6 ${linkClass}`} href="/">
          返回報告
        </Link>
      </Shell>
    );
  }

  const body = result.body;
  const screen = String(body.screen);
  const order = body.order as OrderSummary | null;
  const primary = body.primaryCta as Cta;
  const secondary = body.secondaryCta as Cta;
  const orderId = order?.id ?? null;

  return (
    <Shell>
      <h1 className="font-serif text-display text-ink">{String(body.title)}</h1>
      <p className="mt-4 text-[13px] font-medium leading-snug text-ink-soft">
        付款結果以伺服器收到的通知為準，本頁只讀取這筆訂單的交付紀錄。
      </p>
      {order ? (
        <dl className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px] leading-snug">
          <dt className="text-ink-soft">方案</dt>
          <dd className="break-all text-ink">{order.planId}</dd>
          <dt className="text-ink-soft">金額</dt>
          <dd className="text-ink">
            {order.amount} {order.currency}
          </dd>
          <dt className="text-ink-soft">建立時間</dt>
          <dd className="text-ink">{formatTaipei(order.createdAt)}</dd>
          <dt className="text-ink-soft">訂單編號</dt>
          <dd className="break-all font-mono text-ink">{order.id}</dd>
          <dt className="text-ink-soft">交付</dt>
          <dd className="text-ink">{deliverySummary(screen, body.delivery as Delivery)}</dd>
        </dl>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-x-6">
        <Link className={linkClass} href={ctaHref(primary.kind, orderId)}>
          {CTA_LABELS[primary.kind ?? ""] ?? "返回報告"}
        </Link>
        <Link className={linkClass} href={ctaHref(secondary.kind, orderId)}>
          {CTA_LABELS[secondary.kind ?? ""] ?? "返回報告"}
        </Link>
      </div>
      <p className="mt-4 text-[12px] text-ink-soft">讀取時間 {formatTaipei(String(body.readAt))}</p>
    </Shell>
  );
}
