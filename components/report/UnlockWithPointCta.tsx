"use client";

import Link from "next/link";
import { useState } from "react";
import {
  POINTS_BACK_TO_REPORT,
  POINTS_BALANCE_INLINE,
  POINTS_INSUFFICIENT_NOTE,
  POINTS_PACK_CLIENT_PLAN_ID,
  POINTS_PACK_CTA,
  POINTS_UNLOCK_FAILED,
  REPORT_SLOTS,
  UNLOCK_WITH_POINT_CTA,
} from "../../lib/constants";
import { UnlockCheckoutCta } from "./UnlockCheckoutCta";

const OK_REASONS = new Set(["unlocked", "already_unlocked", "lifetime", "subscription"]);

type UnlockResult = {
  ok: boolean;
  reason: string;
  points_balance: number;
};

function readUnlockResult(json: unknown): UnlockResult {
  const record =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  return {
    ok: record.ok === true,
    reason: typeof record.reason === "string" ? record.reason : "forbidden",
    points_balance: Number(record.points_balance ?? 0) || 0,
  };
}

export function UnlockWithPointCta({
  persistId,
  pointsInsufficient,
  pointsBalance,
  onUnlocked,
}: {
  persistId: string;
  pointsInsufficient: boolean;
  pointsBalance: number;
  onUnlocked?: (pointsBalance: number, reason?: string) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [insufficient, setInsufficient] = useState(pointsInsufficient);
  const [loginOpen, setLoginOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/reports/unlock-with-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: persistId }),
      });
      if (response.status === 401) {
        setLoginOpen(true);
        return;
      }
      let json: unknown = {};
      try {
        json = await response.json();
      } catch {
        json = {};
      }
      const result = readUnlockResult(json);
      if (result.ok && OK_REASONS.has(result.reason)) {
        await onUnlocked?.(result.points_balance, result.reason);
        return;
      }
      if (result.reason === "insufficient") {
        setInsufficient(true);
        return;
      }
      setError(POINTS_UNLOCK_FAILED);
    } catch {
      setError(POINTS_UNLOCK_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-2"
      data-report-slot={REPORT_SLOTS.unlockWithPoint}
    >
      {insufficient ? (
        <div className="flex flex-col gap-2 rounded-sheet border border-line bg-paper p-4" role="status">
          <p className="text-[13px] font-medium leading-snug text-ink">
            {POINTS_INSUFFICIENT_NOTE}
          </p>
          {pointsInsufficient ? null : (
            <div className="flex flex-wrap items-center gap-3">
              <UnlockCheckoutCta
                ctaLabel={POINTS_PACK_CTA}
                hasSession
                planId={POINTS_PACK_CLIENT_PLAN_ID}
                slot={`${REPORT_SLOTS.unlockWithPoint}-buy`}
                variant="secondary"
              />
              <button
                className="min-h-11 text-[13px] font-medium text-ink-soft underline decoration-line underline-offset-4"
                onClick={() => setInsufficient(false)}
                type="button"
              >
                {POINTS_BACK_TO_REPORT}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-control border border-seal px-5 py-3 text-button text-seal transition-colors duration-[var(--primitive-duration-hover)] hover:bg-paper disabled:opacity-60"
            disabled={busy}
            onClick={() => {
              void handleClick();
            }}
            type="button"
          >
            {UNLOCK_WITH_POINT_CTA}
          </button>
          <span className="text-[13px] font-medium text-ink-soft">
            {`${POINTS_BALANCE_INLINE}：${pointsBalance} 點`}
          </span>
        </div>
      )}

      {error ? (
        <p className="text-[13px] font-medium text-ink" role="status">
          {error}
        </p>
      ) : null}

      {loginOpen ? (
        <div className="rounded-sheet border border-line bg-sheet p-4" role="dialog" aria-label="請先登入">
          <p className="font-serif text-[16px] font-bold text-ink">請先登入</p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4"
            href="/login"
          >
            前往登入
          </Link>
        </div>
      ) : null}
    </div>
  );
}
