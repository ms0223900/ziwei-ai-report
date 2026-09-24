"use client";

import {
  HOME_POINTS_BALANCE_LABEL,
  POINTS_PACK_CLIENT_PLAN_ID,
  POINTS_PACK_CTA,
  REPORT_SLOTS,
} from "../../lib/constants";
import { UnlockCheckoutCta } from "../report/UnlockCheckoutCta";

export function HomePointsBar({ pointsBalance }: { pointsBalance: number }) {
  return (
    <section
      aria-label="點數"
      className="flex w-full max-w-[350px] flex-wrap items-center justify-between gap-3 rounded-sheet border border-line bg-sheet px-4 py-3 md:max-w-[576px]"
      data-report-slot={REPORT_SLOTS.homePointsPack}
    >
      <p className="text-[14px] font-medium text-ink">
        {`${HOME_POINTS_BALANCE_LABEL}：${pointsBalance} 點`}
      </p>
      <UnlockCheckoutCta
        ctaLabel={POINTS_PACK_CTA}
        hasSession
        planId={POINTS_PACK_CLIENT_PLAN_ID}
        slot={`${REPORT_SLOTS.homePointsPack}-cta`}
        variant="secondary"
      />
    </section>
  );
}
