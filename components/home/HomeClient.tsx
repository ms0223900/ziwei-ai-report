"use client";

import { useState } from "react";
import { BirthForm } from "../birth-form/BirthForm";
import type { BirthRequestBody } from "../birth-form/payload";
import { overlayCannedReport, type MaskedReportView } from "../report/overlay";
import { ReportCard } from "../report/ReportCard";

export function HomeClient() {
  const [report, setReport] = useState<MaskedReportView | null>(null);

  function handleValidSubmit(body: BirthRequestBody) {
    setReport(overlayCannedReport(body));
  }

  return report ? (
    <ReportCard report={report} />
  ) : (
    <BirthForm onValidSubmit={handleValidSubmit} />
  );
}
