"use client";

import { useState } from "react";
import {
  LOCK_CAPTION,
  REPORT_SLOTS,
  UPCOMING_UNLOCK_NOTE,
} from "../../lib/constants";
import type { PreviewView } from "../../lib/commercial/preview";
import { CommercialSecondaryZone } from "./CommercialSecondaryZone";

const LOCKED_BLOCKS = [
  {
    slot: REPORT_SLOTS.lockActionPlan,
    title: "【 七日轉化方略 】・密批封存",
    field: "actionPlan",
  },
  {
    slot: REPORT_SLOTS.lockRationale,
    title: "【 星曜格局析理 】・密批封存",
    field: "rationale",
  },
  {
    slot: REPORT_SLOTS.lockPathCompare,
    title: "【 順逆兩局抉擇 】・密批封存",
    field: "pathCompare",
  },
] as const;

function PlaceholderBars() {
  return (
    <>
      <div aria-hidden="true" className="h-2.5 rounded-control bg-night-bar" />
      <div aria-hidden="true" className="h-2.5 rounded-control bg-night-bar" />
      <div
        aria-hidden="true"
        className="h-2.5 w-[70%] rounded-control bg-night-bar"
      />
    </>
  );
}

export function AdvancedLockedPanel({ view }: { view: PreviewView }) {
  const [ctaClicked, setCtaClicked] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {view.advancedLocked ? (
        <div className="flex h-14 items-center justify-center">
          <div
            aria-hidden="true"
            className="-rotate-2 bg-seal px-6 py-1.5 text-center font-serif text-[13px] font-bold text-sheet"
          >
            未開封
          </div>
        </div>
      ) : null}

      <p className="text-[13px] font-medium leading-snug text-ink-soft">
        {LOCK_CAPTION}
      </p>

      <div className="flex flex-col gap-5" data-report-slot={REPORT_SLOTS.delivery}>
        {LOCKED_BLOCKS.map((block) => (
          <section
            aria-label={block.title}
            className="flex flex-col gap-2.5 rounded-sheet bg-night p-4"
            data-report-slot={block.slot}
            key={block.slot}
          >
            <h3 className="text-[13px] font-medium leading-snug text-sheet">
              {block.title}
            </h3>
            {view.advancedLocked || !view.exampleBlocks ? (
              <PlaceholderBars />
            ) : (
              <p className="text-[13px] font-medium leading-snug text-sheet">
                {view.exampleBlocks[block.field]}
              </p>
            )}
          </section>
        ))}
      </div>

      {view.showCta ? (
        <div
          className="flex flex-col gap-2"
          data-report-slot={REPORT_SLOTS.unlockCta}
        >
          <div className="flex items-center gap-3">
            <button
              className="min-h-11 rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep"
              onClick={() => setCtaClicked(true)}
              type="button"
            >
              解鎖完整報告
            </button>
            <span className="text-[13px] font-medium text-ink-soft">即將開放</span>
          </div>
          {ctaClicked ? (
            <p className="text-[13px] font-medium text-ink" role="status">
              {UPCOMING_UNLOCK_NOTE}
            </p>
          ) : null}
        </div>
      ) : null}

      <CommercialSecondaryZone view={view} />
    </div>
  );
}
