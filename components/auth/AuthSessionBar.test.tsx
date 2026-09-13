/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_MESSAGES, REPORT_SLOTS } from "../../lib/constants";
import { AuthSessionBar } from "./AuthSessionBar";

const signOut = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("../../lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signOut },
    from: () => ({
      update: (...args: unknown[]) => {
        update(...args);
        return { eq };
      },
    }),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AuthSessionBar", () => {
  it("shows the display name on the session slot and logs out", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AuthSessionBar
        accessStatus="locked"
        displayName="yuan"
        userId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      />,
    );

    expect(
      container.querySelector(`[data-report-slot="${REPORT_SLOTS.authSession}"]`),
    ).toBeTruthy();
    expect(screen.getByText("yuan")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "登出" }));
    expect(signOut).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("rejects a blank display name and only updates display_name", async () => {
    const user = userEvent.setup();
    eq.mockResolvedValue({ error: null });
    render(
      <AuthSessionBar
        accessStatus="locked"
        displayName="yuan"
        userId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      />,
    );

    await user.clear(screen.getByLabelText("顯示名稱"));
    await user.click(screen.getByRole("button", { name: "儲存" }));
    expect(screen.getByRole("alert").textContent).toBe(
      AUTH_MESSAGES.DISPLAY_NAME_BLANK,
    );
    expect(update).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("顯示名稱"), "小園");
    await user.click(screen.getByRole("button", { name: "儲存" }));
    expect(update).toHaveBeenCalledWith({ display_name: "小園" });
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("access_status");
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("points_balance");
    expect(update.mock.calls[0]?.[0]).not.toHaveProperty("subscription_status");
    expect(eq).toHaveBeenCalledWith("user_id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(screen.getByText("小園")).toBeTruthy();
  });
});
