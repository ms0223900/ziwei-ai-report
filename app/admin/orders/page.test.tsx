/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../test/fakes/supabase";

const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const state: {
  memory: FakeSupabaseMemory;
  userId: string | null;
  serviceClientCreated: number;
} = { memory: createFakeSupabaseMemory(), userId: ADMIN_ID, serviceClientCreated: 0 };

vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;403");
  },
}));

vi.mock("../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => {
    state.serviceClientCreated += 1;
    return createFakeServiceRoleClient(state.memory);
  },
}));

vi.mock("../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "admin@example.com" } : null,
}));

function seedOrder(overrides: Partial<FakeOrder> = {}) {
  state.memory.orders.set(ORDER_ID, {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "points_pack_5",
    merchant_trade_no: "MTN-SECRET",
    amount: 49,
    currency: "TWD",
    status: "paid",
    trade_no: "T-SECRET",
    payment_date: null,
    ...overrides,
  });
}

async function renderPage(query: Record<string, string>) {
  const { default: AdminOrdersPage } = await import("./page");
  return render(await AdminOrdersPage({ searchParams: Promise.resolve(query) }));
}

function text() {
  return document.body.textContent ?? "";
}

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = ADMIN_ID;
    state.serviceClientCreated = 0;
    vi.stubEnv("ADMIN_USER_IDS", ADMIN_ID);
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, { points_balance: 2 });
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("S6-4: shows only 請先登入 without a session and reads nothing", async () => {
    state.userId = null;
    seedOrder();

    await renderPage({ order: ORDER_ID });

    expect(screen.getByRole("heading", { name: "請先登入" })).toBeTruthy();
    expect(text()).not.toContain(ORDER_ID);
    expect(state.serviceClientCreated).toBe(0);
  });

  it("S6-4: calls forbidden() (HTTP 403) for a non-admin before reading anything", async () => {
    state.userId = USER_ID;
    seedOrder();

    await expect(renderPage({ order: ORDER_ID })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;403");
    expect(state.serviceClientCreated).toBe(0);
  });

  it("shows status, plan, amount, evidence, notification and the derived reason", async () => {
    seedOrder();

    await renderPage({ order: ORDER_ID });

    expect(text()).toContain("處置原因：需要補償");
    expect(text()).toContain(ORDER_ID);
    expect(text()).toContain("paid");
    expect(text()).toContain("points_pack_5");
    expect(text()).toContain("49 TWD");
    expect(text()).toMatch(/本筆加點無/);
    expect(text()).toMatch(/帳號解鎖locked/);
    expect(text()).toMatch(/訂閱首期無/);
    expect(text()).toMatch(/成功通知無/);
    expect(screen.getByLabelText("處置原因（必填）")).toBeTruthy();
    expect(screen.getByRole("button", { name: "補 5 點" })).toBeTruthy();
  });

  it("shows 人工補償完成 after an ok admin action", async () => {
    seedOrder();
    state.memory.pointTransactions.set("c1", {
      id: "c1",
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });
    state.memory.adminActions.set("a1", {
      id: "a1",
      admin_user_id: ADMIN_ID,
      action: "credit_points",
      reason: "補點",
      source_order_id: ORDER_ID,
      idempotency_key: `compensate:${ORDER_ID}:credit_points`,
      before_state: {},
      after_state: {},
      result: "ok",
    });

    await renderPage({ order: ORDER_ID });

    expect(text()).toContain("處置原因：人工補償完成");
    expect(text()).toMatch(/本筆加點有/);
    expect(text()).toMatch(/人工補償有/);
  });

  it("shows 已履約但無通知 when the credit exists without a success notification", async () => {
    seedOrder();
    state.memory.pointTransactions.set("c1", {
      id: "c1",
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });

    await renderPage({ order: ORDER_ID });

    expect(text()).toContain("處置原因：已履約但無通知");
  });

  it("shows readable Chinese hints for a missing order param or an unknown order", async () => {
    await renderPage({});
    expect(text()).toContain("請在網址加上 ?order=訂單編號 查詢。");
    cleanup();

    await renderPage({ order: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" });
    expect(screen.getByRole("alert").textContent).toBe("查無這筆訂單，請確認訂單編號。");
  });

  it("does not show webhook payload, signatures or trade numbers", async () => {
    seedOrder();

    await renderPage({ order: ORDER_ID });

    expect(text()).not.toMatch(/T-SECRET|MTN-SECRET|CheckMacValue|RtnCode/);
  });
});
