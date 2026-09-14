"use client";

import { useState } from "react";
import { ERROR_MESSAGES } from "../../lib/constants";
import {
  resolveMembershipView,
  type MembershipAccessStatus,
  type MembershipAdvanced,
} from "../../lib/membership/view";
import { BirthForm } from "../birth-form/BirthForm";
import type { BirthRequestBody } from "../birth-form/payload";
import {
  advancedFromGetApi,
  isPersistFailedBody,
  maskedReportFromApi,
  overlayCannedReport,
  type MaskedReportView,
} from "../report/overlay";
import { ReportCard } from "../report/ReportCard";
import { FailSheet } from "./FailSheet";
import { HighRiskSheet } from "./HighRiskSheet";
import { interpretReportsResponse } from "./interpret-reports-response";

type HomeView = "form" | "generating" | "report" | "fail" | "high-risk";

type HighRiskView = {
  message: string;
  disclaimer: string;
};

const MIN_GENERATING_MS = 500;

export type HomeClientProps = {
  initialAccessStatus?: MembershipAccessStatus | null;
  initialHasSession?: boolean;
};

async function holdGenerating(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_GENERATING_MS) {
    await new Promise((resolve) => {
      setTimeout(resolve, MIN_GENERATING_MS - elapsed);
    });
  }
}

export function HomeClient({
  initialAccessStatus = null,
  initialHasSession = false,
}: HomeClientProps = {}) {
  const [view, setView] = useState<HomeView>("form");
  const [formKey, setFormKey] = useState(0);
  const [lastBody, setLastBody] = useState<BirthRequestBody | null>(null);
  const [report, setReport] = useState<MaskedReportView | null>(null);
  const [loadedAdvanced, setLoadedAdvanced] = useState<MembershipAdvanced | null>(
    null,
  );
  const hasSession = initialHasSession;
  const accessStatus = initialAccessStatus;
  const advanced = hasSession ? loadedAdvanced : null;
  const [failMessage, setFailMessage] = useState<string>(
    ERROR_MESSAGES.GENERATION_FAILED,
  );
  const [highRisk, setHighRisk] = useState<HighRiskView | null>(null);

  async function loadAdvanced(persistId: string | undefined) {
    if (!persistId || !hasSession || accessStatus !== "unlocked") {
      setLoadedAdvanced(null);
      return;
    }

    const response = await fetch(`/api/reports/${persistId}`);
    let json: unknown = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }

    if (!response.ok) {
      setLoadedAdvanced(null);
      return;
    }

    setLoadedAdvanced(advancedFromGetApi(json));
  }

  async function requestReport(body: BirthRequestBody) {
    setLastBody(body);
    setView("generating");
    setReport(null);
    setLoadedAdvanced(null);
    setHighRisk(null);
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let json: unknown = {};
      try {
        json = await response.json();
      } catch {
        json = {};
      }

      await holdGenerating(startedAt);

      const decision = interpretReportsResponse(response.status, json);

      if (decision.kind === "high_risk") {
        setHighRisk({
          message: decision.message,
          disclaimer: decision.disclaimer,
        });
        setView("high-risk");
        return;
      }

      if (decision.kind === "fail") {
        if (isPersistFailedBody(json)) {
          setReport(overlayCannedReport(body));
          setView("report");
          return;
        }
        setFailMessage(decision.message);
        setView("fail");
        return;
      }

      if (decision.kind === "validation") {
        setView("form");
        return;
      }

      const nextReport = maskedReportFromApi(json, body);
      setReport(nextReport);
      await loadAdvanced(nextReport.persist_id);
      setView("report");
    } catch {
      await holdGenerating(startedAt);
      setFailMessage(ERROR_MESSAGES.GENERATION_FAILED);
      setView("fail");
    }
  }

  function handleBackToForm() {
    setView("form");
    setFormKey((current) => current + 1);
    setReport(null);
    setLoadedAdvanced(null);
    setHighRisk(null);
  }

  function handleRetry() {
    if (!lastBody) {
      handleBackToForm();
      return;
    }
    void requestReport(lastBody);
  }

  if (view === "fail") {
    return (
      <FailSheet
        message={failMessage}
        onBack={handleBackToForm}
        onRetry={handleRetry}
      />
    );
  }

  if (view === "high-risk" && highRisk) {
    return (
      <HighRiskSheet
        disclaimer={highRisk.disclaimer}
        message={highRisk.message}
        onBack={handleBackToForm}
      />
    );
  }

  if (view === "report" && report) {
    const membership = resolveMembershipView({
      accessStatus,
      hasSession,
      previewState: "A",
      previewEnabled: false,
      nickname: report.nickname,
      advanced,
    });
    return <ReportCard membership={membership} report={report} />;
  }

  return (
    <BirthForm
      busy={view === "generating"}
      initialValues={lastBody ?? undefined}
      key={formKey}
      onValidSubmit={(body) => {
        void requestReport(body);
      }}
    />
  );
}
