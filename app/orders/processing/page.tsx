import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OrdersProcessingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  void (await searchParams);

  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <article className="w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
        <h1 className="font-serif text-display text-ink">付款處理中</h1>
        <p className="mt-4 text-[13px] font-medium leading-snug text-ink-soft">
          綠界已返回商店。開通結果以伺服器通知為準；本頁不會依網址參數更新訂單或權益，也不會查詢綠界交易。
        </p>
        <p className="mt-3 text-[13px] font-medium leading-snug text-ink-soft">
          頂層導轉會丟掉記憶體 persist_id。解鎖後若畫面清空，請再送出同一生辰，才能讀回三欄。
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4"
          href="/"
        >
          返回解讀
        </Link>
      </article>
    </main>
  );
}
