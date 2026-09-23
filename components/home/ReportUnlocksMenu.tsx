"use client";

import {
  REPORT_SLOTS,
  REPORT_UNLOCKS_TITLE,
} from "../../lib/constants";

export type ReportUnlockMenuItem = {
  report_id: string;
  nickname: string;
  created_at: string;
};

export function reportUnlocksFromApi(body: unknown): ReportUnlockMenuItem[] {
  if (!Array.isArray(body)) {
    return [];
  }
  return body.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    if (typeof record.report_id !== "string" || !record.report_id) {
      return [];
    }
    return [
      {
        report_id: record.report_id,
        nickname: typeof record.nickname === "string" ? record.nickname : "",
        created_at: typeof record.created_at === "string" ? record.created_at : "",
      },
    ];
  });
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export function ReportUnlocksMenu({
  items,
  activeId,
  busyId,
  error,
  onOpen,
}: {
  items: ReportUnlockMenuItem[];
  activeId?: string;
  busyId?: string | null;
  error?: string | null;
  onOpen: (persistId: string) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={REPORT_UNLOCKS_TITLE}
      className="w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-4 py-3 md:max-w-[576px]"
      data-report-slot={REPORT_SLOTS.reportUnlocks}
    >
      <p className="mb-2 text-[13px] font-medium text-ink-soft">
        {REPORT_UNLOCKS_TITLE}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.report_id}>
            <button
              aria-current={item.report_id === activeId ? "true" : undefined}
              className="min-h-11 w-full rounded-control px-2 text-left text-[14px] font-medium text-ink transition-colors duration-[var(--primitive-duration-hover)] hover:bg-paper disabled:opacity-60"
              disabled={busyId === item.report_id}
              onClick={() => onOpen(item.report_id)}
              type="button"
            >
              {`${item.nickname || "未命名"}・${formatDate(item.created_at)}`}
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-2 text-[13px] font-medium text-ink" role="status">
          {error}
        </p>
      ) : null}
    </nav>
  );
}
