"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ERROR_MESSAGES,
  REPORT_UNLOCKS_OPEN_FAILED,
} from "../../lib/constants";
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
import {
  ReportUnlocksMenu,
  reportUnlocksFromApi,
  type ReportUnlockMenuItem,
} from "./ReportUnlocksMenu";

type HomeView = "form" | "generating" | "report" | "fail" | "high-risk";

type HighRiskView = {
  message: string;
  disclaimer: string;
};

const MIN_GENERATING_MS = 500;

export type HomeClientProps = {
  initialAccessStatus?: MembershipAccessStatus | null;
  initialHasSession?: boolean;
  initialPointsBalance?: number;
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
  initialPointsBalance = 0,
}: HomeClientProps = {}) {
  const [view, setView] = useState<HomeView>("form");
  const [formKey, setFormKey] = useState(0);
  const [lastBody, setLastBody] = useState<BirthRequestBody | null>(null);
  const [report, setReport] = useState<MaskedReportView | null>(null);
  const [loadedAdvanced, setLoadedAdvanced] = useState<MembershipAdvanced | null>(
    null,
  );
  const [pointsBalance, setPointsBalance] = useState(initialPointsBalance);
  const [pointUnlocked, setPointUnlocked] = useState(false);
  const hasSession = initialHasSession;
  const accessStatus = initialAccessStatus;
  const advanced = hasSession ? loadedAdvanced : null;
  const [failMessage, setFailMessage] = useState<string>(
    ERROR_MESSAGES.GENERATION_FAILED,
  );
  const [highRisk, setHighRisk] = useState<HighRiskView | null>(null);
  const [unlockItems, setUnlockItems] = useState<ReportUnlockMenuItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);

  const refreshUnlockItems = useCallback(async () => {
    if (!hasSession) {
      return;
    }
    try {
      const response = await fetch("/api/report-unlocks");
      if (!response.ok) {
        return;
      }
      const items = reportUnlocksFromApi(await response.json());
      setUnlockItems(items);
    } catch {
      // 選單讀不到時保留原清單，不擋主畫面。
    }
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    let cancelled = false;
    fetch("/api/report-unlocks")
      .then(async (response) => {
        if (!response.ok) {
          return;
        }
        const items = reportUnlocksFromApi(await response.json());
        if (!cancelled) {
          setUnlockItems(items);
        }
      })
      .catch(() => {
        // 選單讀不到時不擋主畫面。
      });
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  async function fetchAdvancedBody(persistId: string): Promise<unknown | null> {
    const response = await fetch(`/api/reports/${persistId}`);
    let json: unknown = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }
    return response.ok ? json : null;
  }

  async function loadAdvanced(
    persistId: string | undefined,
    { afterPointUnlock = false }: { afterPointUnlock?: boolean } = {},
  ): Promise<boolean> {
    // A point unlock grants this one report while the account stays locked.
    if (
      !persistId ||
      !hasSession ||
      (accessStatus !== "unlocked" && !afterPointUnlock)
    ) {
      setLoadedAdvanced(null);
      return false;
    }

    const json = await fetchAdvancedBody(persistId);
    if (json === null) {
      setLoadedAdvanced(null);
      return false;
    }

    setLoadedAdvanced(advancedFromGetApi(json));
    return true;
  }

  // Menu items are point unlocks, so opening one goes through the same
  // owner-checked GET as a fresh point unlock.
  async function openUnlockedReport(persistId: string) {
    setMenuError(null);
    setOpeningId(persistId);
    try {
      const json = await fetchAdvancedBody(persistId);
      const item = unlockItems.find((entry) => entry.report_id === persistId);
      const nextReport =
        json === null
          ? null
          : maskedReportFromApi(json, {
              nickname: item?.nickname ?? "",
              birth_date: "",
              birth_time: null,
            });
      if (!nextReport || nextReport.persist_id !== persistId) {
        setMenuError(REPORT_UNLOCKS_OPEN_FAILED);
        return;
      }
      setReport(nextReport);
      setLoadedAdvanced(advancedFromGetApi(json));
      setPointUnlocked(true);
      setHighRisk(null);
      setView("report");
    } catch {
      setMenuError(REPORT_UNLOCKS_OPEN_FAILED);
    } finally {
      setOpeningId(null);
    }
  }

  async function handlePointUnlocked(nextBalance: number) {
    setPointsBalance(nextBalance);
    const loaded = await loadAdvanced(report?.persist_id, {
      afterPointUnlock: true,
    });
    setPointUnlocked(loaded);
    if (loaded) {
      await refreshUnlockItems();
    }
  }

  async function requestReport(body: BirthRequestBody) {
    setLastBody(body);
    setView("generating");
    setReport(null);
    setLoadedAdvanced(null);
    setPointUnlocked(false);
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
    setPointUnlocked(false);
    setHighRisk(null);
  }

  function handleRetry() {
    if (!lastBody) {
      handleBackToForm();
      return;
    }
    void requestReport(lastBody);
  }

  const menu = (
    <ReportUnlocksMenu
      activeId={view === "report" ? report?.persist_id : undefined}
      busyId={openingId}
      error={menuError}
      items={hasSession ? unlockItems : []}
      onOpen={(persistId) => {
        void openUnlockedReport(persistId);
      }}
    />
  );

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {renderView()}
      {menu}
    </div>
  );

  function renderView() {
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
        pointsBalance,
        unlockMode: pointUnlocked ? "points" : "none",
        isOwnReport: hasSession && Boolean(report.persist_id),
      });
      return (
        <ReportCard
          membership={membership}
          onPointUnlocked={handlePointUnlocked}
          report={report}
        />
      );
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
}
