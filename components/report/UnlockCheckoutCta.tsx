"use client";

import Link from "next/link";
import { useState } from "react";
import { ERROR_MESSAGES, REPORT_SLOTS } from "../../lib/constants";
import { parseCheckoutClientResult } from "../../lib/payments/checkout-client-result";
import { submitEcpayTopLevelForm } from "../../lib/payments/submit-ecpay-form";

const UNLOCK_PLAN_ID = "unlock_report_lifetime";

const BUTTON_CLASS = {
  primary:
    "min-h-11 rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep disabled:opacity-60",
  secondary:
    "min-h-11 rounded-control border border-seal px-5 py-3 text-button text-seal transition-colors duration-[var(--primitive-duration-hover)] hover:bg-paper disabled:opacity-60",
} as const;

export function UnlockCheckoutCta({
  ctaLabel,
  hasSession,
  planId = UNLOCK_PLAN_ID,
  slot = REPORT_SLOTS.unlockCta,
  variant = "primary",
}: {
  ctaLabel: string;
  hasSession: boolean;
  planId?: string;
  slot?: string;
  variant?: keyof typeof BUTTON_CLASS;
}) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

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
        body: JSON.stringify({ plan_id: planId }),
      });
      let json: unknown = {};
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      const result = parseCheckoutClientResult(response.status, json);
      if (result.type === "login") {
        setLoginOpen(true);
        return;
      }
      if (result.type === "error") {
        setCheckoutError(result.message);
        return;
      }

      submitEcpayTopLevelForm(result.checkoutUrl, result.fields);
    } catch {
      setCheckoutError(ERROR_MESSAGES.PAYMENT_UNAVAILABLE);
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <>
      <div
        className="flex flex-col gap-2"
        data-report-slot={slot}
      >
        <div className="flex items-center gap-3">
          <button
            className={BUTTON_CLASS[variant]}
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

      {loginOpen ? (
        <div
          aria-labelledby={`${slot}-login-title`}
          aria-modal="true"
          className="rounded-sheet border border-line bg-sheet p-4"
          role="dialog"
        >
          <p
            className="font-serif text-[16px] font-bold text-ink"
            id={`${slot}-login-title`}
          >
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
    </>
  );
}
