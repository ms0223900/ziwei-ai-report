"use client";

import Link from "next/link";
import { useState } from "react";
import { ERROR_MESSAGES, REPORT_SLOTS } from "../../lib/constants";
import {
  parseCheckoutFields,
  submitEcpayTopLevelForm,
} from "../../lib/payments/submit-ecpay-form";

const UNLOCK_PLAN_ID = "unlock_report_lifetime";

export function UnlockCheckoutCta({
  ctaLabel,
  hasSession,
}: {
  ctaLabel: string;
  hasSession: boolean;
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

  return (
    <>
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

      {loginOpen ? (
        <div
          aria-labelledby="unlock-login-title"
          aria-modal="true"
          className="rounded-sheet border border-line bg-sheet p-4"
          role="dialog"
        >
          <p
            className="font-serif text-[16px] font-bold text-ink"
            id="unlock-login-title"
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
