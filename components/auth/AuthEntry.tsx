import Link from "next/link";
import { REPORT_SLOTS } from "../../lib/constants";

export function AuthEntry() {
  return (
    <header className="border-b border-line bg-sheet">
      <div className="mx-auto flex h-14 w-full max-w-[576px] items-center justify-between px-5">
        <p className="font-serif text-label text-ink">紫微解讀</p>
        <nav
          className="flex items-center gap-4 text-label"
          data-report-slot={REPORT_SLOTS.authEntry}
        >
          <Link className="text-ink underline-offset-4 hover:underline" href="/login">
            登入
          </Link>
          <Link
            className="text-seal underline-offset-4 hover:underline"
            href="/register"
          >
            註冊
          </Link>
        </nav>
      </div>
    </header>
  );
}
