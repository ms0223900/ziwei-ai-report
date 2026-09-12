"use client";

import { useState } from "react";
import {
  isCommercialPreviewEnabled,
  resolveEffectivePreviewState,
  resolvePreviewView,
  type PreviewState,
} from "../../lib/commercial/preview";
import { AdvancedLockedPanel } from "./AdvancedLockedPanel";
import { ChartMatrix } from "./ChartMatrix";
import { CommercialPreviewBar } from "./CommercialPreviewBar";
import { Disclaimer } from "./Disclaimer";
import type { MaskedReportView } from "./overlay";

const SECTION_LABELS = {
  overall: "【 原局總覽 】  〔 局象：守成蓄勢 〕",
  work: "【 官祿事業 】  〔 象意：重在實證 〕",
  relationship: "【 夫妻交友 】  〔 象意：界線明晰 〕",
} as const;

export function ReportCard({
  report,
  commercialPreviewEnabled,
}: {
  report: MaskedReportView;
  commercialPreviewEnabled?: boolean;
}) {
  const enabled =
    commercialPreviewEnabled ??
    isCommercialPreviewEnabled(process.env.NEXT_PUBLIC_COMMERCIAL_PREVIEW);
  const [localState, setLocalState] = useState<PreviewState>("A");
  const effectiveState = resolveEffectivePreviewState({
    enabled,
    localState,
    searchParams: null,
  });
  const view = resolvePreviewView({
    state: effectiveState,
    nickname: report.nickname,
  });

  return (
    <article className="animate-report-enter w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
      {enabled ? (
        <CommercialPreviewBar onChange={setLocalState} state={localState} />
      ) : null}

      <header className="mb-5 flex items-start justify-between gap-4">
        <h1 className="font-serif text-display text-ink">{view.title}</h1>
        <span
          aria-hidden="true"
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[1px] border-2 border-seal-deeper bg-seal font-serif text-[13px] font-bold leading-none text-sheet"
        >
          定局
        </span>
      </header>

      <div className="flex flex-col gap-5">
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

        <AdvancedLockedPanel view={view} />

        <Disclaimer text={report.disclaimer} />
      </div>
    </article>
  );
}
