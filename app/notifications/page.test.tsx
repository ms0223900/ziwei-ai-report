/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const state: { memory: FakeSupabaseMemory; userId: string | null; failSession: boolean } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
  failSession: false,
};

vi.mock("../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../lib/supabase/session", () => ({
  createSessionClient: async () => {
    if (state.failSession) {
      throw new Error("session client down");
    }
    return createFakeServiceRoleClient(state.memory);
  },
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "yuan@example.com" } : null,
}));

async function renderPage() {
  const { default: NotificationsPage } = await import("./page");
  return render(await NotificationsPage());
}

describe("NotificationsPage", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    state.failSession = false;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows only 請先登入 without a session", async () => {
    state.userId = null;
    state.memory.notifications.set("n-1", {
      id: "n-1",
      user_id: USER_ID,
      type: "order_pending",
      source_type: "order",
      source_id: "o-1",
      idempotency_key: "k1",
      created_at: "2026-09-28T00:00:00.000Z",
      read_at: null,
    });

    await renderPage();

    expect(screen.getByRole("heading", { name: "請先登入" })).toBeTruthy();
    expect(document.body.textContent).not.toContain("付款已受理");
  });

  it("renders the user's notifications", async () => {
    state.memory.notifications.set("n-1", {
      id: "n-1",
      user_id: USER_ID,
      type: "order_pending",
      source_type: "order",
      source_id: "o-1",
      idempotency_key: "k1",
      created_at: "2026-09-28T00:00:00.000Z",
      read_at: null,
    });

    await renderPage();

    expect(screen.getByRole("heading", { name: "通知" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "付款已受理，正在確認中" }).getAttribute("href")).toBe(
      "/orders/processing?order=o-1",
    );
  });

  it("shows the empty state when there are no notifications", async () => {
    await renderPage();

    expect(screen.getByText(/目前沒有通知/)).toBeTruthy();
  });

  it("shows a readable message instead of crashing when loading fails", async () => {
    state.failSession = true;

    await renderPage();

    expect(screen.getByRole("alert").textContent).toBe("通知暫時讀不到，請稍後重新整理。");
  });
});
