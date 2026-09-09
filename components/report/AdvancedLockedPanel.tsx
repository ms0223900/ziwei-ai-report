"use client";

import { useState } from "react";
import { LOCK_CAPTION } from "../../lib/constants";

const LOCKED_BLOCKS = [
  "【 七日轉化方略 】・密批封存",
  "【 星曜格局析理 】・密批封存",
  "【 順逆兩局抉擇 】・密批封存",
] as const;

const CTA_NOTE = "解鎖即將開放，本版不收費。";

export function AdvancedLockedPanel() {
  const [ctaClicked, setCtaClicked] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex h-14 items-center justify-center">
        <div
          aria-hidden="true"
          className="-rotate-2 bg-seal px-6 py-1.5 text-center font-serif text-[13px] font-bold text-sheet"
        >
          未開封
        </div>
      </div>

      <p className="text-[13px] font-medium leading-snug text-ink-soft">{LOCK_CAPTION}</p>

      {LOCKED_BLOCKS.map((title) => (
        <section
          aria-label={title}
          className="flex flex-col gap-2.5 rounded-sheet bg-night p-4"
          key={title}
        >
          <h3 className="text-[13px] font-medium leading-snug text-sheet">{title}</h3>
          <div aria-hidden="true" className="h-2.5 rounded-control bg-night-bar" />
          <div aria-hidden="true" className="h-2.5 rounded-control bg-night-bar" />
          <div aria-hidden="true" className="h-2.5 w-[70%] rounded-control bg-night-bar" />
        </section>
      ))}

      <div data-report-slot="advanced" hidden />

      <div className="flex flex-col gap-2">
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
            {CTA_NOTE}
          </p>
        ) : null}
      </div>
    </div>
  );
}
