/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "yuan@example.com" } : null,
}));

function seedOrder(overrides: Partial<FakeOrder> = {}) {
  const order: FakeOrder = {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "points_pack_5",
    merchant_trade_no: "MTN1",
    amount: 49,
    currency: "TWD",
    status: "pending",
    trade_no: "T-SECRET-1",
    payment_date: null,
    created_at: "2026-09-28T00:00:00.000Z",
    ...overrides,
  };
  state.memory.orders.set(order.id, order);
}

async function renderPage(query: Record<string, string>) {
  const { default: OrdersProcessingPage } = await import("./page");
  const page = await OrdersProcessingPage({ searchParams: Promise.resolve(query) });
  return render(page);
}

function text() {
  return document.body.textContent ?? "";
}

describe("OrdersProcessingPage", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, { points_balance: 5 });
    seedFakeUser(state.memory, { id: OTHER_ID, email: "other@example.com" });
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows title, plan, amount, created time, order id, delivery, two CTAs and read time", async () => {
    seedOrder({ status: "paid" });
    state.memory.pointTransactions.set("c1", {
      id: "c1",
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("heading", { name: "已新增 5 點" })).toBeTruthy();
    expect(text()).toContain("points_pack_5");
    expect(text()).toContain("49 TWD");
    expect(text()).toContain("2026/09/28 08:00");
    expect(text()).toContain(ORDER_ID);
    expect(text()).toContain("本筆新增 5 點，目前餘額 5 點");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "返回報告" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "返回方案" }).getAttribute("href")).toBe("/");
    expect(text()).toMatch(/讀取時間 \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it("S2-1: a pending order shows no delivered wording and refreshes the same page", async () => {
    seedOrder({ status: "pending" });

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("heading", { name: "付款已受理，正在確認" })).toBeTruthy();
    expect(text()).not.toMatch(/已解鎖|已新增 5 點|訂閱有效/);
    expect(screen.getByRole("link", { name: "重新整理本頁" }).getAttribute("href")).toBe(
      `/orders/processing?order=${ORDER_ID}`,
    );
  });

  it("S2-8: payment query fields render the same page as without them", async () => {
    seedOrder({ status: "pending" });

    await renderPage({ order: ORDER_ID });
    const plain = text().replace(/讀取時間 .*/, "");
    cleanup();
    await renderPage({ order: ORDER_ID, RtnCode: "1", SimulatePaid: "1", TradeAmt: "49" });
    const tampered = text().replace(/讀取時間 .*/, "");

    expect(tampered).toBe(plain);
  });

  it("S3-1: without a session only shows 請先登入", async () => {
    state.userId = null;
    seedOrder({ status: "paid" });

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("heading", { name: "請先登入" })).toBeTruthy();
    expect(text()).not.toContain(ORDER_ID);
    expect(text()).not.toContain("49");
    expect(text()).not.toMatch(/付款已受理|付款未完成|已解鎖|已新增|訂閱有效|訂閱已失效|正在處理交付/);
  });

  it("shows 找不到訂單 without an amount for another member's or a missing order", async () => {
    seedOrder({ user_id: OTHER_ID, status: "paid" });

    await renderPage({ order: ORDER_ID });
    expect(screen.getByRole("heading", { name: "找不到訂單" })).toBeTruthy();
    expect(text()).not.toContain("49");
    cleanup();

    await renderPage({ order: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" });
    expect(screen.getByRole("heading", { name: "找不到訂單" })).toBeTruthy();
  });

  it("maps report and plans CTAs to existing routes", async () => {
    seedOrder({ plan_id: "unlock_report_lifetime", amount: 99, status: "paid" });
    const profile = state.memory.profiles.get(USER_ID)!;
    state.memory.profiles.set(USER_ID, { ...profile, access_status: "unlocked" });

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("link", { name: "查看完整報告" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "返回方案" }).getAttribute("href")).toBe("/");
  });

  it("does not render webhook payload, signature, trade number or internal errors", async () => {
    seedOrder({ status: "failed" });

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("heading", { name: "付款未完成，尚未變更權益" })).toBeTruthy();
    expect(text()).not.toMatch(/T-SECRET-1|MTN1|CheckMacValue|RtnCode|0\|Error|admin/);
  });

  it("does not fetch, query ECPay, write entitlements or poll", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    seedOrder({ status: "pending" });

    await renderPage({ order: ORDER_ID });

    expect(fetchSpy).not.toHaveBeenCalled();
    const source = readFileSync(path.join(process.cwd(), "app/orders/processing/page.tsx"), "utf8");
    expect(source).not.toContain("QueryTradeInfo");
    expect(source).not.toContain("access_status");
    expect(source).not.toMatch(/\.update\(|\.insert\(|markOrderFailed/);
    expect(source).not.toMatch(/setInterval|setTimeout|useEffect/);
  });

  it("keeps narrow screens from scrolling sideways", () => {
    const source = readFileSync(path.join(process.cwd(), "app/orders/processing/page.tsx"), "utf8");
    expect(source).toContain("min-w-0");
    expect(source).toContain("break-all");
    expect(source).toContain("minmax(0,1fr)");
  });
});
