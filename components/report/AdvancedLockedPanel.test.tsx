/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MEMBERSHIP_CTA_UNLOCK_REPORT } from "../../lib/constants";
import { resolvePreviewView } from "../../lib/commercial/preview";
import { resolveMembershipView } from "../../lib/membership/view";
import { AdvancedLockedPanel } from "./AdvancedLockedPanel";

const preview = resolvePreviewView({ state: "A", nickname: "小圓" });

const guestMembership = resolveMembershipView({
  accessStatus: null,
  hasSession: false,
  previewEnabled: false,
  previewState: "A",
  nickname: "小圓",
});

const lockedMembership = resolveMembershipView({
  accessStatus: "locked",
  hasSession: true,
  previewEnabled: false,
  previewState: "A",
  nickname: "小圓",
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AdvancedLockedPanel unlock CTA", () => {
  it("opens a login dialog for guests and does not call checkout", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdvancedLockedPanel membership={guestMembership} view={preview} />);
    await user.click(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    );

    expect(screen.getByRole("dialog", { name: "請先登入" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "前往登入" })).toHaveProperty(
      "href",
      expect.stringContaining("/login"),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("submits a top-level ECPay form after locked checkout and never calls grant", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    HTMLFormElement.prototype.submit = submit;
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).not.toContain("/api/dev/grant-access");
      expect(JSON.parse(String(init?.body))).toEqual({
        plan_id: "unlock_report_lifetime",
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          checkout_url:
            "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
          fields: {
            MerchantID: "3002607",
            TotalAmount: "99",
            CheckMacValue: "ABC",
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdvancedLockedPanel membership={lockedMembership} view={preview} />);
    await user.click(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    );

    const form = document.querySelector("form");
    expect(form?.target).toBe("_top");
    expect(form?.method).toMatch(/post/i);
    expect(document.querySelector("iframe")).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe("/api/payments/checkout");
  });
});
