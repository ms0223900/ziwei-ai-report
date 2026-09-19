"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ERROR_MESSAGES,
  LOCK_CAPTION,
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
  REPORT_SLOTS,
} from "../../lib/constants";
import type { PreviewView } from "../../lib/commercial/preview";
import type { MembershipAdvanced, MembershipView } from "../../lib/membership/view";
import {
  parseCheckoutFields,
  submitEcpayTopLevelForm,
} from "../../lib/payments/submit-ecpay-form";
import { CommercialSecondaryZone } from "./CommercialSecondaryZone";

const UNLOCK_PLAN_ID = "unlock_report_lifetime";

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

function RealAdvancedBody({
  field,
  advanced,
}: {
  field: (typeof LOCKED_BLOCKS)[number]["field"];
  advanced: MembershipAdvanced;
}) {
  if (field === "actionPlan") {
    return (
      <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-[13px] font-medium leading-snug text-sheet">
        {advanced.action_plan.map((day) => (
          <li key={day}>{day}</li>
        ))}
      </ol>
    );
  }

  if (field === "rationale") {
    return (
      <p className="text-[13px] font-medium leading-snug text-sheet">
        {advanced.rationale}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 text-[13px] font-medium leading-snug text-sheet">
      <p>{advanced.path_compare.path_a}</p>
      <p>{advanced.path_compare.path_b}</p>
      <p>{advanced.path_compare.note}</p>
    </div>
  );
}

export function AdvancedLockedPanel({
  membership,
  view,
}: {
  membership?: MembershipView;
  view: PreviewView;
}) {
  const realAdvanced =
    membership && !membership.advancedLocked ? membership.advanced : null;
  const showCta = membership ? membership.showCta : view.showCta;
  const ctaLabel = membership?.ctaLabel ?? MEMBERSHIP_CTA_UNLOCK_REPORT;
  const [loginOpen, setLoginOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const hasSession = membership?.authSlot === REPORT_SLOTS.authSession;
  const showUnlockedLabel =
    membership && !membership.advancedLocked && !membership.showCta;

  async function handleUnlockClick() {
    setCheckoutError(null);
    if (!hasSession) {
      setLoginOpen(true);
      return;
    }

    setCheckoutBusy(true);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: UNLOCK_PLAN_ID }),
      });
      let json: unknown = {};
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      if (response.status === 401) {
        setLoginOpen(true);
        return;
      }

      if (!response.ok) {
        const message =
          json &&
          typeof json === "object" &&
          "message" in json &&
          typeof json.message === "string"
            ? json.message
            : ERROR_MESSAGES.PAYMENT_UNAVAILABLE;
        setCheckoutError(message);
        return;
      }

      const checkoutUrl =
        json &&
        typeof json === "object" &&
        "checkout_url" in json &&
        typeof json.checkout_url === "string"
          ? json.checkout_url
          : "";
      const fields =
        json && typeof json === "object" && "fields" in json
          ? parseCheckoutFields(json.fields)
          : null;
      if (!checkoutUrl || !fields) {
        setCheckoutError(ERROR_MESSAGES.PAYMENT_UNAVAILABLE);
        return;
      }

      submitEcpayTopLevelForm(checkoutUrl, fields);
    } catch {
      setCheckoutError(ERROR_MESSAGES.PAYMENT_UNAVAILABLE);
    } finally {
      setCheckoutBusy(false);
    }
  }
    membership && !membership.advancedLocked && !membership.showCta;

  return (
    <div className="flex flex-col gap-5">
      {view.advancedLocked && !realAdvanced ? (
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
            {realAdvanced ? (
              <RealAdvancedBody advanced={realAdvanced} field={block.field} />
            ) : view.advancedLocked || !view.exampleBlocks ? (
              <PlaceholderBars />
            ) : (
              <p className="text-[13px] font-medium leading-snug text-sheet">
                {view.exampleBlocks[block.field]}
              </p>
            )}
          </section>
        ))}
      </div>

      {showUnlockedLabel ? (
        <p className="text-[13px] font-medium text-ink-soft">
          {MEMBERSHIP_CTA_UNLOCKED}
        </p>
      ) : null}

      {showCta ? (
        <div
          className="flex flex-col gap-2"
          data-report-slot={REPORT_SLOTS.unlockCta}
        >
          <div className="flex items-center gap-3">
            <button
              className="min-h-11 rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep disabled:opacity-60"
              disabled={checkoutBusy}
              onClick={() => {
                void handleUnlockClick();
              }}
              type="button"
            >
              {ctaLabel}
            </button>
          </div>
          {checkoutError ? (
            <p className="text-[13px] font-medium text-ink" role="status">
              {checkoutError}
            </p>
          ) : null}
        </div>
      ) : null}

      {loginOpen ? (
        <div
          aria-labelledby="unlock-login-title"
          aria-modal="true"
          className="rounded-sheet border border-line bg-sheet p-4"
          role="dialog"
        >
          <p className="font-serif text-[16px] font-bold text-ink" id="unlock-login-title">
            請先登入
          </p>
          <p className="mt-2 text-[13px] font-medium leading-snug text-ink-soft">
            未登入不會建立付款訂單。
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-seal underline decoration-line underline-offset-4"
            href="/login"
          >
            前往登入
          </Link>
        </div>
      ) : null}

      <CommercialSecondaryZone view={view} />
    </div>
  );
}
