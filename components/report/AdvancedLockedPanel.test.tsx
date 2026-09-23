/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
  POINTS_BACK_TO_REPORT,
  POINTS_INSUFFICIENT_NOTE,
  POINTS_PACK_CTA,
  UNLOCK_WITH_POINT_CTA,
} from "../../lib/constants";
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

const PERSIST_ID = "11111111-1111-4111-8111-111111111111";

function memberView(
  overrides: Partial<Parameters<typeof resolveMembershipView>[0]> = {},
) {
  return resolveMembershipView({
    accessStatus: "locked",
    hasSession: true,
    previewEnabled: false,
    previewState: "A",
    nickname: "小圓",
    isOwnReport: true,
    pointsBalance: 0,
    ...overrides,
  });
}

function jsonReply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AdvancedLockedPanel points pack and point unlock (US-018)", () => {
  it("shows buy points but no lifetime unlock button for a lifetime member", () => {
    render(
      <AdvancedLockedPanel
        membership={memberView({ accessStatus: "unlocked" })}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );

    expect(screen.getByRole("button", { name: POINTS_PACK_CTA })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    ).toBeNull();
    expect(screen.getByText(MEMBERSHIP_CTA_UNLOCKED)).toBeTruthy();
  });

  it("shows both the lifetime CTA and buy points for a locked member", () => {
    render(
      <AdvancedLockedPanel
        membership={memberView()}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );

    expect(
      screen.getByRole("button", { name: MEMBERSHIP_CTA_UNLOCK_REPORT }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: POINTS_PACK_CTA })).toBeTruthy();
  });

  it("opens login for a guest buying points and does not call checkout", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdvancedLockedPanel membership={guestMembership} view={preview} />);
    await user.click(screen.getByRole("button", { name: POINTS_PACK_CTA }));

    expect(screen.getByRole("dialog", { name: "請先登入" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: UNLOCK_WITH_POINT_CTA })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("buys points with only the points_pack_5 plan id", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn(async () =>
      jsonReply(503, { error_code: "PAYMENT_UNAVAILABLE", message: "x" }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <AdvancedLockedPanel
        membership={memberView({ accessStatus: "unlocked" })}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );
    await user.click(screen.getByRole("button", { name: POINTS_PACK_CTA }));

    const calls = fetchSpy.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toBe("/api/payments/checkout");
    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual({
      plan_id: "points_pack_5",
    });
  });

  it("unlocks the own report with a point using the persist_id and reports the balance", async () => {
    const user = userEvent.setup();
    const onPointUnlocked = vi.fn();
    const fetchSpy = vi.fn(async () =>
      jsonReply(200, { ok: true, reason: "unlocked", points_balance: 4 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <AdvancedLockedPanel
        membership={memberView({ pointsBalance: 5 })}
        onPointUnlocked={onPointUnlocked}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );
    await user.click(screen.getByRole("button", { name: UNLOCK_WITH_POINT_CTA }));

    const calls = fetchSpy.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toBe("/api/reports/unlock-with-point");
    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual({
      report_id: PERSIST_ID,
    });
    expect(onPointUnlocked).toHaveBeenCalledWith(4);
  });

  it("tells a member with no points before they click, without the unlock button", () => {
    render(
      <AdvancedLockedPanel
        membership={memberView({ pointsBalance: 0 })}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );

    expect(screen.getByText(POINTS_INSUFFICIENT_NOTE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: UNLOCK_WITH_POINT_CTA })).toBeNull();
    expect(screen.getByRole("button", { name: POINTS_PACK_CTA })).toBeTruthy();
    expect(screen.queryByText(MEMBERSHIP_CTA_UNLOCKED)).toBeNull();
  });

  it("shows buy points and back to report when the API says insufficient", async () => {
    const user = userEvent.setup();
    const onPointUnlocked = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonReply(200, { ok: false, reason: "insufficient", points_balance: 0 }),
      ),
    );

    render(
      <AdvancedLockedPanel
        membership={memberView({ pointsBalance: 1 })}
        onPointUnlocked={onPointUnlocked}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );
    await user.click(screen.getByRole("button", { name: UNLOCK_WITH_POINT_CTA }));

    expect(await screen.findByText(POINTS_INSUFFICIENT_NOTE)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: POINTS_PACK_CTA })).toHaveLength(2);
    expect(screen.queryByText(MEMBERSHIP_CTA_UNLOCKED)).toBeNull();
    expect(onPointUnlocked).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: POINTS_BACK_TO_REPORT }));
    expect(screen.getByRole("button", { name: UNLOCK_WITH_POINT_CTA })).toBeTruthy();
  });

  it("does not show the old points-only-buy-followups copy", () => {
    render(
      <AdvancedLockedPanel
        membership={memberView({ pointsBalance: 1 })}
        persistId={PERSIST_ID}
        view={preview}
      />,
    );

    expect(document.body.textContent).not.toContain("不解鎖報告");
  });
});
