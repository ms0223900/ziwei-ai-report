"use client";

import Link from "next/link";
import { useState } from "react";

export type NotificationListItem = {
  id: string;
  type: string;
  text: string;
  href: string;
  createdAt: string | null;
  readAt: string | null;
};

function formatTaipei(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function NotificationList({ initialItems }: { initialItems: NotificationListItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markRead(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
      });
      if (!response.ok) {
        setError("標為已讀失敗，請稍後再試。");
        return;
      }
      const body = (await response.json()) as { readAt?: string };
      const readAt = body.readAt ?? new Date().toISOString();
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, readAt } : item)),
      );
    } catch {
      setError("標為已讀失敗，請檢查網路後再試。");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <p className="mt-4 text-[13px] text-ink-soft">目前沒有通知。付款或權益有變更時會出現在這裡。</p>;
  }

  return (
    <>
      {error ? (
        <p className="mt-4 text-[13px] text-warn" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-line">
        {items.map((item) => (
          <li
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3"
            data-read={item.readAt ? "true" : "false"}
            key={item.id}
          >
            <div className="min-w-0">
              <Link
                className={`break-words text-[14px] underline-offset-4 hover:underline ${item.readAt ? "text-ink-soft" : "font-medium text-ink"}`}
                href={item.href}
              >
                {item.text}
              </Link>
              <p className="mt-1 text-[12px] text-ink-soft">
                {formatTaipei(item.createdAt)}
                {item.readAt ? " · 已讀" : " · 未讀"}
              </p>
            </div>
            {item.readAt ? null : (
              <button
                className="min-h-9 rounded-control border border-line px-3 text-label text-ink hover:border-seal"
                disabled={busyId === item.id}
                onClick={() => {
                  void markRead(item.id);
                }}
                type="button"
              >
                標為已讀
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
