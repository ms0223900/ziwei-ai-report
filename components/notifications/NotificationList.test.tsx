/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationList, type NotificationListItem } from "./NotificationList";

const UNREAD: NotificationListItem = {
  id: "n-1",
  type: "order_pending",
  text: "付款已受理，正在確認中",
  href: "/orders/processing?order=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  createdAt: "2026-09-28T00:00:00.000Z",
  readAt: null,
};

const READ: NotificationListItem = {
  id: "n-2",
  type: "credit_completed",
  text: "付款成功：已新增 5 點",
  href: "/",
  createdAt: "2026-09-27T00:00:00.000Z",
  readAt: "2026-09-27T01:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("NotificationList", () => {
  it("lists text, created time, read state and links to href", () => {
    render(<NotificationList initialItems={[UNREAD, READ]} />);

    expect(screen.getByRole("link", { name: UNREAD.text }).getAttribute("href")).toBe(UNREAD.href);
    expect(screen.getByRole("link", { name: READ.text }).getAttribute("href")).toBe("/");
    expect(screen.getByText(/2026\/09\/28 08:00 · 未讀/)).toBeTruthy();
    expect(screen.getByText(/2026\/09\/27 08:00 · 已讀/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "標為已讀" })).toHaveLength(1);
  });

  it("posts mark-as-read and shows the row as read", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ id: "n-1", readAt: "2026-10-01T00:00:00.000Z" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(<NotificationList initialItems={[UNREAD]} />);

    await user.click(screen.getByRole("button", { name: "標為已讀" }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/notifications/n-1/read", { method: "POST" });
    expect(screen.queryByRole("button", { name: "標為已讀" })).toBeNull();
    expect(screen.getByText(/· 已讀/)).toBeTruthy();
  });

  it("shows a readable message and keeps the row unread when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const user = userEvent.setup();
    render(<NotificationList initialItems={[UNREAD]} />);

    await user.click(screen.getByRole("button", { name: "標為已讀" }));

    expect(screen.getByRole("alert").textContent).toBe("標為已讀失敗，請稍後再試。");
    expect(screen.getByRole("button", { name: "標為已讀" })).toBeTruthy();
  });

  it("shows a readable message when the network throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    const user = userEvent.setup();
    render(<NotificationList initialItems={[UNREAD]} />);

    await user.click(screen.getByRole("button", { name: "標為已讀" }));

    expect(screen.getByRole("alert").textContent).toContain("標為已讀失敗");
  });

  it("shows a Chinese empty state", () => {
    render(<NotificationList initialItems={[]} />);

    expect(screen.getByText(/目前沒有通知/)).toBeTruthy();
  });
});
