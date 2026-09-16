/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REPORT_SLOTS } from "../../lib/constants";
import { AuthSessionBar } from "./AuthSessionBar";

const signOut = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("../../lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signOut },
    from: () => ({
      update: () => ({ eq: vi.fn() }),
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

  it("does not offer inline display name editing while US-010 UI is commented out", () => {
    render(
      <AuthSessionBar
        accessStatus="locked"
        displayName="yuan"
        userId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
      />,
    );

    expect(screen.queryByLabelText("顯示名稱")).toBeNull();
    expect(screen.queryByRole("button", { name: "儲存" })).toBeNull();
    expect(screen.getByRole("button", { name: "登出" })).toBeTruthy();
  });
});
