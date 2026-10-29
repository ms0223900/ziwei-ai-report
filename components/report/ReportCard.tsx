"use client";

import { useEffect, useState } from "react";
import {
  resolveCommercialPreviewPolicy,
  resolvePreviewView,
  type PreviewState,
} from "../../lib/commercial/preview";
import type { MembershipView } from "../../lib/membership/view";
import { AdvancedLockedPanel } from "./AdvancedLockedPanel";
import { ChartMatrix } from "./ChartMatrix";
import { CommercialPreviewBar } from "./CommercialPreviewBar";
import { Disclaimer } from "./Disclaimer";
import type { MaskedReportView } from "./overlay";
import { pcReportTitle } from "./pc-report-title";

const PC_LAYOUT_QUERY = "(min-width: 64rem)";

function usePcLayout() {
  const [isPc, setIsPc] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(PC_LAYOUT_QUERY);
    const sync = () => setIsPc(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isPc;
}

const SECTION_LABELS = {
  overall: "【 原局總覽 】  〔 局象：守成蓄勢 〕",
  work: "【 官祿事業 】  〔 象意：重在實證 〕",
  relationship: "【 夫妻交友 】  〔 象意：界線明晰 〕",
} as const;

export function ReportCard({
  report,
  commercialPreviewEnabled,
  membership,
  onPointUnlocked,
}: {
  report: MaskedReportView;
  commercialPreviewEnabled?: boolean;
  membership?: MembershipView;
  onPointUnlocked?: (pointsBalance: number, reason?: string) => void | Promise<void>;
}) {
  const [localState, setLocalState] = useState<PreviewState>("A");
  const policy = resolveCommercialPreviewPolicy({
    nodeEnv: process.env.NODE_ENV,
    previewRaw:
      commercialPreviewEnabled === undefined
        ? process.env.NEXT_PUBLIC_COMMERCIAL_PREVIEW
        : commercialPreviewEnabled
          ? "1"
          : "0",
    localState,
  });
  const preview = resolvePreviewView({
    state: policy.effectiveState,
    nickname: report.nickname,
  });
  const isPc = usePcLayout();
  const unlocked = membership !== undefined && !membership.advancedLocked;
  const view = unlocked
    ? {
        ...preview,
        title: membership.title,
        advancedLocked: false,
        showCta: false,
        exampleBlocks: null,
      }
    : preview;

  return (
    <article className="animate-report-enter w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6 lg:max-w-[900px]">
      {policy.showAlert ? (
        <p
          className="mb-4 text-[13px] font-medium leading-snug text-ink"
          role="alert"
        >
          {policy.alertMessage}
        </p>
      ) : null}

      {policy.overlayEnabled ? (
        <CommercialPreviewBar onChange={setLocalState} state={localState} />
      ) : null}

      <header className="mb-5 flex items-start justify-between gap-4 lg:grid lg:grid-cols-[2.375rem_minmax(0,1fr)_2.375rem] lg:items-center">
        <span aria-hidden="true" className="hidden lg:block" />
        <h1 className="font-serif text-display text-ink lg:text-center">
          {pcReportTitle(view.title, isPc)}
        </h1>
        <span
          aria-hidden="true"
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[1px] border-2 border-seal-deeper bg-seal font-serif text-[13px] font-bold leading-none text-sheet lg:justify-self-end"
        >
          定局
        </span>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12 lg:gap-y-10">
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
          <ChartMatrix
            birth_date={report.birth_date}
            focus={report.focus}
            nickname={report.nickname}
          />

          <section>
            <h2 className="mb-1.5 font-serif text-[14px] font-bold leading-snug text-ink">
              {SECTION_LABELS.overall}
            </h2>
            <p className="text-body text-ink">{report.overall}</p>
          </section>

          <div className="h-px bg-line" />

          <section>
            <h2 className="mb-1.5 font-serif text-[14px] font-bold leading-snug text-ink">
              {SECTION_LABELS.work}
            </h2>
            <p className="text-body text-ink">{report.work}</p>
          </section>

          <div className="h-px bg-line" />

          <section>
            <h2 className="mb-1.5 font-serif text-[14px] font-bold leading-snug text-ink">
              {SECTION_LABELS.relationship}
            </h2>
            <p className="text-body text-ink">{report.relationship}</p>
          </section>

          <div className="h-px bg-line" />

          <p className="text-[14px] font-medium leading-snug text-ink">
            {`【 行動指引・破局之著 】  ${report.action}`}
          </p>
        </div>

        <AdvancedLockedPanel
          membership={membership}
          onPointUnlocked={onPointUnlocked}
          persistId={report.persist_id}
          view={view}
        />

        <div className="lg:col-span-2">
          <Disclaimer text={report.disclaimer} />
        </div>
      </div>
    </article>
  );
}
