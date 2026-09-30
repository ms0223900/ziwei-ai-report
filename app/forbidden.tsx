import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <article className="w-full min-w-0 max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
        <h1 className="font-serif text-display text-ink">沒有管理權限</h1>
        <Link
          className="mt-6 inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4"
          href="/"
        >
          返回報告
        </Link>
      </article>
    </main>
  );
}
