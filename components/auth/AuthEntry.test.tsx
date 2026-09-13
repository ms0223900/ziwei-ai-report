/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { REPORT_SLOTS } from "../../lib/constants";
import { AuthEntry } from "./AuthEntry";

afterEach(cleanup);

describe("AuthEntry", () => {
  it("exposes login and register links on the named slot", () => {
    const { container } = render(<AuthEntry />);
    const slot = container.querySelector(
      `[data-report-slot="${REPORT_SLOTS.authEntry}"]`,
    );
    expect(slot).toBeTruthy();
    expect(screen.getByRole("link", { name: "登入" }).getAttribute("href")).toBe(
      "/login",
    );
    expect(screen.getByRole("link", { name: "註冊" }).getAttribute("href")).toBe(
      "/register",
    );
  });
});
