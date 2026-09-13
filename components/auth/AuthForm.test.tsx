/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_MESSAGES } from "../../lib/constants";
import { AuthForm } from "./AuthForm";

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../../lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signUp, signInWithPassword },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  signUp.mockResolvedValue({
    data: { session: { access_token: "tok" }, user: { id: "u1" } },
    error: null,
  });
  signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
});

describe("AuthForm", () => {
  it("shows the spec email sentence and does not call Auth", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("密碼"), "abcdef");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(screen.getByRole("alert").textContent).toBe(
      AUTH_MESSAGES.INVALID_EMAIL,
    );
    expect(signUp).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/性別/)).toBeNull();
    expect(screen.queryByLabelText(/出生地/)).toBeNull();
  });

  it("registers with email/password only and then goes home", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("電子信箱"), "yuan@example.com");
    await user.type(screen.getByLabelText("密碼"), "abcdef");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(signUp).toHaveBeenCalledWith({
      email: "yuan@example.com",
      password: "abcdef",
    });
    expect(signUp.mock.calls[0]?.[0]).not.toHaveProperty("access_status");
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("maps a duplicate mailbox to the login hint", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    });
    render(<AuthForm mode="register" />);

    await user.type(screen.getByLabelText("電子信箱"), "yuan@example.com");
    await user.type(screen.getByLabelText("密碼"), "abcdef");
    await user.click(screen.getByRole("button", { name: "建立帳號" }));

    expect(screen.getByRole("alert").textContent).toBe(AUTH_MESSAGES.EMAIL_TAKEN);
    expect(push).not.toHaveBeenCalled();
  });

  it("uses one login failure sentence and never says the mailbox is missing", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText("電子信箱"), "yuan@example.com");
    await user.type(screen.getByLabelText("密碼"), "wrongpw");
    await user.click(screen.getByRole("button", { name: "登入" }));

    expect(screen.getByRole("alert").textContent).toBe(
      AUTH_MESSAGES.INVALID_CREDENTIALS,
    );
    expect(screen.getByRole("alert").textContent).not.toContain("不存在");
    expect(push).not.toHaveBeenCalled();
  });
});
