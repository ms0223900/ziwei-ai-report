"use client";

import { useState } from "react";
import {
  MODE_CREDIT_LINE,
  MODE_SUBSCRIBE_LINE,
  MODE_UNLOCK_LINE,
  POINT_UNLOCK_HINT,
  POINT_UNLOCK_LABEL,
  POINT_UNLOCK_UPCOMING,
  PREVIEW_NO_DEDUCT,
  PREVIEW_POINT_UNLOCKED,
  REPORT_SLOTS,
  SUBSCRIBE_HINT,
  UPCOMING_UNLOCK_NOTE,
} from "../../lib/constants";
import type { PreviewView } from "../../lib/commercial/preview";

export function CommercialSecondaryZone({ view }: { view: PreviewView }) {
  const [note, setNote] = useState<string | null>(null);

  function showUpcoming() {
    setNote(UPCOMING_UNLOCK_NOTE);
  }

  return (
    <aside className="flex flex-col gap-3 border-t border-line pt-5">
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_UNLOCK_LINE}
      </p>
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_CREDIT_LINE}
      </p>
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_SUBSCRIBE_LINE}
      </p>

      {view.pointUnlock === "hidden" ? null : (
        <div className="flex flex-col gap-1.5" data-report-slot={REPORT_SLOTS.pointUnlock}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-disabled={view.pointUnlock === "locked" ? true : undefined}
              className="min-h-11 self-start rounded-control border border-line bg-paper px-3 text-[13px] font-medium text-ink-soft"
              onClick={view.pointUnlock === "locked" ? showUpcoming : undefined}
              type="button"
            >
              {view.pointUnlock === "used" ? PREVIEW_POINT_UNLOCKED : POINT_UNLOCK_LABEL}
            </button>
            <span className="text-[13px] font-medium text-ink-soft">
              {view.pointUnlock === "used" ? PREVIEW_NO_DEDUCT : POINT_UNLOCK_UPCOMING}
            </span>
          </div>
          {view.pointUnlock === "locked" ? (
            <p className="text-[12px] font-medium leading-snug text-ink-soft">
              {POINT_UNLOCK_HINT}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-1.5" data-report-slot={REPORT_SLOTS.subscribe}>
        <button
          className="self-start text-left text-[13px] font-medium text-ink-soft underline decoration-line underline-offset-4"
          onClick={view.subscribeLocked ? showUpcoming : undefined}
          type="button"
        >
          {view.subscribeLabel}
        </button>
        <p className="text-[12px] font-medium leading-snug text-ink-soft">
          {SUBSCRIBE_HINT}
        </p>
      </div>

      {note ? (
        <p className="text-[13px] font-medium text-ink" role="status">
          {note}
        </p>
      ) : null}
    </aside>
  );
}
