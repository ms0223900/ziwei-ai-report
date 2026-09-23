/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrdersProcessingPage from "./page";

describe("OrdersProcessingPage", () => {
  it("shows processing copy, ignores ECPay query, and does not fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const page = await OrdersProcessingPage({
      searchParams: Promise.resolve({
        RtnCode: "1",
        SimulatePaid: "1",
        TradeAmt: "99",
      }),
    });
    render(page);

    expect(screen.getByRole("heading", { name: "付款處理中" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "返回解讀" })).toHaveProperty(
      "href",
      expect.stringMatching(/\/$/),
    );
    expect(screen.getByText(/以伺服器通知為準/)).toBeTruthy();
    expect(screen.getByText(/查看點數餘額與解鎖狀態/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/再送出同一生辰|同一生辰|persist_id/);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("does not implement QueryTradeInfo or entitlement writes in the page module", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/orders/processing/page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("QueryTradeInfo");
    expect(source).not.toContain("access_status");
    expect(source).not.toContain("from(\"orders\")");
    expect(source).not.toContain("user_id");
    expect(source).not.toMatch(/setInterval|setTimeout|useEffect/);
  });
});
