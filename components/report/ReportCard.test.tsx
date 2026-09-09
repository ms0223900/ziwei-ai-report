/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DISCLAIMER, LOCK_CAPTION } from "../../lib/constants";
import { overlayCannedReport } from "./overlay";
import { ReportCard } from "./ReportCard";

afterEach(cleanup);

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
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("shows the upcoming-unlock note without changing status after CTA click", async () => {
    const user = userEvent.setup();
    render(<ReportCard report={demoReport} />);

    await user.click(screen.getByRole("button", { name: "解鎖完整報告" }));

    expect(screen.getByRole("status").textContent).toBe("解鎖即將開放，本版不收費。");
    expect(screen.getByText("即將開放")).toBeTruthy();
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
