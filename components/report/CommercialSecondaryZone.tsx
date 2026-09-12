"use client";

import { useState } from "react";
import {
  FOLLOWUP_API_UNIMPLEMENTED,
  FOLLOWUP_PLACEHOLDER,
  MODE_CREDIT_LINE,
  MODE_SUBSCRIBE_LINE,
  MODE_UNLOCK_LINE,
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

  function handleFollowupSubmit() {
    setNote(FOLLOWUP_API_UNIMPLEMENTED);
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

      <div className="flex flex-col gap-1.5" data-report-slot={REPORT_SLOTS.followup}>
        <label className="text-[13px] font-medium text-ink-soft" htmlFor="followup-preview">
          {view.followupCaption}
        </label>
        <input
          className="min-h-11 rounded-control border border-line bg-paper px-3 text-body text-ink-soft"
          id="followup-preview"
          onClick={view.followupLocked ? showUpcoming : undefined}
          onFocus={view.followupLocked ? showUpcoming : undefined}
          placeholder={FOLLOWUP_PLACEHOLDER}
          readOnly={view.followupLocked}
        />
        {view.followupLocked ? null : (
          <button
            className="self-start rounded-control border border-line px-3 py-1.5 text-[13px] font-medium text-ink-soft"
            onClick={handleFollowupSubmit}
            type="button"
          >
            送出追問
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5" data-report-slot={REPORT_SLOTS.subscribe}>
        <button
          className="self-start text-left text-[13px] font-medium text-ink-soft underline decoration-line underline-offset-4"
          onClick={view.followupLocked ? showUpcoming : undefined}
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
