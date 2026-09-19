/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DISCLAIMER,
  FOLLOWUP_API_UNIMPLEMENTED,
  FOLLOWUP_PLACEHOLDER,
  LOCK_CAPTION,
  MODE_CREDIT_LINE,
  MODE_SUBSCRIBE_LINE,
  MODE_UNLOCK_LINE,
  PREVIEW_BANNER,
  PREVIEW_EXAMPLE_MARK,
  PREVIEW_MONTHLY_REMAINING,
  PREVIEW_NO_DEDUCT,
  REPORT_SLOTS,
  SUBSCRIBE_ACTIVE_PREVIEW,
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  SUBSCRIBE_LABEL,
  UPCOMING_UNLOCK_NOTE,
} from "../../lib/constants";
import advancedValid from "../../lib/generation/fixtures/advanced.valid.json";
import { resolveMembershipView } from "../../lib/membership/view";
import { overlayCannedReport } from "./overlay";
import { ReportCard } from "./ReportCard";

const unlockedMembership = resolveMembershipView({
  accessStatus: "unlocked",
  hasSession: true,
  previewEnabled: true,
  previewState: "B",
  nickname: "小圓",
  advanced: {
    rationale: advancedValid.rationale,
    path_compare: advancedValid.path_compare,
    action_plan: [...advancedValid.action_plan],
  },
});

const lockedMembership = resolveMembershipView({
  accessStatus: "locked",
  hasSession: true,
  previewEnabled: false,
  previewState: "A",
  nickname: "小圓",
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const demoReport = overlayCannedReport({
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  focus: "工作",
});

describe("ReportCard", () => {
  it("renders 畫面 A copy without advanced JSON or a gender field", () => {
    const { container } = render(<ReportCard report={demoReport} />);

    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.getByText("【 紫微原局・排盤總目 】")).toBeTruthy();
    expect(screen.getByText("水二局・暫定命盤")).toBeTruthy();
    expect(screen.getByText("命主：小圓（女命）")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /原局總覽/ })).toBeTruthy();
    expect(screen.getByText(/未知時辰，準確度較低/)).toBeTruthy();
    expect(screen.getByText(/行動指引・破局之著/)).toBeTruthy();
    expect(screen.getByText(/先完成一件能展示的小交付/)).toBeTruthy();
    expect(screen.getByText("未開封")).toBeTruthy();
    expect(screen.getByText("【 七日轉化方略 】・密批封存")).toBeTruthy();
    expect(screen.getByText("【 星曜格局析理 】・密批封存")).toBeTruthy();
    expect(screen.getByText("【 順逆兩局抉擇 】・密批封存")).toBeTruthy();
    expect(screen.getByText(LOCK_CAPTION)).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.queryByLabelText(/性別/)).toBeNull();
    expect(container.textContent).not.toContain("rationale");
    expect(container.textContent).not.toContain("path_a");
    expect(container.textContent).not.toContain("第 1 天");
    const followup = screen.getByPlaceholderText(FOLLOWUP_PLACEHOLDER);
    expect(followup).toBeTruthy();
    expect(followup).toHaveProperty("readOnly", true);
    expect(followup).not.toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: SUBSCRIBE_LABEL })).toBeTruthy();
    expect(screen.getByText(MODE_UNLOCK_LINE)).toBeTruthy();
    expect(screen.getByText(MODE_CREDIT_LINE)).toBeTruthy();
    expect(screen.getByText(MODE_SUBSCRIBE_LINE)).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.followup}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.subscribe}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.lockActionPlan}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.lockRationale}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.lockPathCompare}"]`),
    ).toBeTruthy();
    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.unlockCta}"]`),
    ).toBeTruthy();
    const delivery = container.querySelector(
      `[data-report-slot="${REPORT_SLOTS.delivery}"]`,
    );
    expect(delivery).toBeTruthy();
    expect(
      delivery?.querySelector(`[data-report-slot="${REPORT_SLOTS.lockActionPlan}"]`),
    ).toBeTruthy();
    expect(container.querySelector('[data-report-slot="advanced"]')).toBeNull();
    expect(screen.queryByText(PREVIEW_BANNER)).toBeNull();
  });

  it("hides the preview bar when commercial preview is off", () => {
    render(
      <ReportCard commercialPreviewEnabled={false} report={demoReport} />,
    );

    expect(screen.queryByText(PREVIEW_BANNER)).toBeNull();
    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
  });

  it("switches preview B to example copy and keeps followup locked", async () => {
    const user = userEvent.setup();
    render(<ReportCard commercialPreviewEnabled report={demoReport} />);

    expect(screen.getByText(PREVIEW_BANNER)).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "預覽態" }), "B");

    expect(screen.getByRole("heading", { name: "小圓的進階報告" })).toBeTruthy();
    expect(screen.getAllByText(new RegExp(PREVIEW_EXAMPLE_MARK)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "解鎖完整報告" })).toBeNull();
    expect(screen.getByPlaceholderText(FOLLOWUP_PLACEHOLDER)).toHaveProperty(
      "readOnly",
      true,
    );
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("does not persist or fetch when submitting followup in preview C", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReportCard commercialPreviewEnabled report={demoReport} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "預覽態" }), "C");
    expect(screen.getByText(PREVIEW_NO_DEDUCT)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "送出追問" }));

    expect(screen.getByRole("status").textContent).toBe(FOLLOWUP_API_UNIMPLEMENTED);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("shows subscription preview captions in state D", async () => {
    const user = userEvent.setup();
    render(<ReportCard commercialPreviewEnabled report={demoReport} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "預覽態" }), "D");
    expect(screen.getByText(PREVIEW_MONTHLY_REMAINING)).toBeTruthy();
    expect(screen.getByRole("button", { name: SUBSCRIBE_ACTIVE_PREVIEW })).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
  });

  it("keeps unlock-report CTA from changing access after click", async () => {
    const user = userEvent.setup();
    render(<ReportCard report={demoReport} />);

    await user.click(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    );

    expect(screen.getByRole("dialog", { name: "請先登入" })).toBeTruthy();
    expect(screen.queryByText("解鎖即將開放，本版不收費。")).toBeNull();
    expect(screen.queryByText("即將開放")).toBeNull();
    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
  });

  it("shows the upcoming note from the locked followup and subscribe entry", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<ReportCard report={demoReport} />);

    await user.click(screen.getByPlaceholderText(FOLLOWUP_PLACEHOLDER));
    expect(screen.getByRole("status").textContent).toBe(UPCOMING_UNLOCK_NOTE);
    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: SUBSCRIBE_LABEL }));
    expect(screen.getAllByRole("status")[0].textContent).toBe(UPCOMING_UNLOCK_NOTE);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders unlocked GET text instead of preview examples", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ReportCard
        commercialPreviewEnabled
        membership={unlockedMembership}
        report={demoReport}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "預覽態" }), "B");

    expect(screen.getByRole("heading", { name: "小圓的進階報告" })).toBeTruthy();
    expect(screen.getByText(advancedValid.rationale)).toBeTruthy();
    expect(screen.getByText(advancedValid.path_compare.path_a)).toBeTruthy();
    expect(screen.getByText(/第 1 天/)).toBeTruthy();
    expect(container.textContent).not.toContain(PREVIEW_EXAMPLE_MARK);
    expect(screen.getByText("已開通")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "解鎖完整報告" })).toBeNull();
    expect(screen.getByPlaceholderText(FOLLOWUP_PLACEHOLDER)).toHaveProperty(
      "readOnly",
      true,
    );
  });

  it("shows unlock-report CTA for a locked member without instructor-fee copy", async () => {
    const user = userEvent.setup();
    HTMLFormElement.prototype.submit = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          checkout_url:
            "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
          fields: { MerchantID: "3002607", TotalAmount: "99" },
        }),
      })),
    );
    render(<ReportCard membership={lockedMembership} report={demoReport} />);

    await user.click(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    );

    expect(screen.queryByText("開通由講師受控流程處理，本版不收費")).toBeNull();
    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.queryByText(advancedValid.rationale)).toBeNull();
  });

  it("alerts in production when preview stays on and keeps the unlock CTA", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(
      <ReportCard commercialPreviewEnabled membership={lockedMembership} report={demoReport} />,
    );

    expect(screen.getByRole("alert").textContent).toBe(
      "設定錯誤：正式環境不應開啟開發預覽。此畫面不是已付款開通。",
    );
    expect(screen.queryByText(PREVIEW_BANNER)).toBeNull();
    expect(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
  });

  it("omits 女命 for a non-demo nickname", () => {
    const { container } = render(
      <ReportCard
        report={overlayCannedReport({
          nickname: "阿明",
          birth_date: "1990-01-02",
          birth_time: null,
          focus: "整體",
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "阿明的基本分析" })).toBeTruthy();
    expect(screen.getByText("命主：阿明")).toBeTruthy();
    expect(container.textContent).not.toContain("女命");
  });
});
