import { describe, expect, it } from "vitest";
import {
  resolveProcessingScreen,
  type ProcessingEvidence,
} from "./resolve-processing-screen";

const NOW = new Date("2026-10-01T00:00:00.000Z");
const FUTURE = "2026-11-01T00:00:00.000Z";
const PAST = "2026-09-01T00:00:00.000Z";

function evidence(overrides: Partial<ProcessingEvidence> & {
  status?: string;
  planId?: string;
}): ProcessingEvidence {
  const { status = "paid", planId = "unlock_report_lifetime", ...rest } = overrides;
  return {
    order: { status, planId },
    accessStatus: "locked",
    hasOwnCredit: false,
    ownSubscription: null,
    now: NOW,
    ...rest,
  };
}

const ACTIVE_SUB = { status: "active", currentPeriodEnd: FUTURE, hasFirstSuccess: true };

describe("resolveProcessingScreen", () => {
  it.each(["unlock_report_lifetime", "points_pack_5", "subscribe_report_monthly"])(
    "S2-1: pending %s is accepted even when the account is unlocked",
    (planId) => {
      expect(
        resolveProcessingScreen(
          evidence({ status: "pending", planId, accessStatus: "unlocked", hasOwnCredit: true, ownSubscription: ACTIVE_SUB }),
        ),
      ).toBe("accepted");
    },
  );

  it.each(["unlock_report_lifetime", "points_pack_5", "subscribe_report_monthly"])(
    "S2-7: failed %s is incomplete even with unlock, credit or subscription evidence",
    (planId) => {
      expect(
        resolveProcessingScreen(
          evidence({ status: "failed", planId, accessStatus: "unlocked", hasOwnCredit: true, ownSubscription: ACTIVE_SUB }),
        ),
      ).toBe("incomplete");
    },
  );

  it("S2-3: paid lifetime + unlocked is unlock_completed", () => {
    expect(resolveProcessingScreen(evidence({ accessStatus: "unlocked" }))).toBe("unlock_completed");
  });

  it("paid lifetime still locked is needs_manual", () => {
    expect(resolveProcessingScreen(evidence({ accessStatus: "locked" }))).toBe("needs_manual");
  });

  it.each(["points_pack_5", "subscribe_report_monthly"])(
    "S2-3: paid %s on an unlocked account is never unlock_completed",
    (planId) => {
      expect(
        resolveProcessingScreen(evidence({ planId, accessStatus: "unlocked" })),
      ).not.toBe("unlock_completed");
    },
  );

  it("S2-4: paid points pack with its own credit is points_credited", () => {
    expect(
      resolveProcessingScreen(evidence({ planId: "points_pack_5", hasOwnCredit: true })),
    ).toBe("points_credited");
  });

  it("S2-2: paid points pack without its own credit is needs_manual", () => {
    expect(
      resolveProcessingScreen(evidence({ planId: "points_pack_5", hasOwnCredit: false })),
    ).toBe("needs_manual");
  });

  it("S2-5: paid monthly with own first_success inside the period is subscription_active", () => {
    expect(
      resolveProcessingScreen(evidence({ planId: "subscribe_report_monthly", ownSubscription: ACTIVE_SUB })),
    ).toBe("subscription_active");
  });

  it("S2-5: the period end itself still counts as active", () => {
    expect(
      resolveProcessingScreen(
        evidence({
          planId: "subscribe_report_monthly",
          ownSubscription: { ...ACTIVE_SUB, currentPeriodEnd: NOW.toISOString() },
        }),
      ),
    ).toBe("subscription_active");
  });

  it("S2-6: paid monthly past the period end is subscription_inactive", () => {
    expect(
      resolveProcessingScreen(
        evidence({
          planId: "subscribe_report_monthly",
          ownSubscription: { ...ACTIVE_SUB, currentPeriodEnd: PAST },
        }),
      ),
    ).toBe("subscription_inactive");
  });

  it.each(["cancelled", "expired"])(
    "S2-6: paid monthly with a %s subscription is subscription_inactive even inside the period",
    (status) => {
      expect(
        resolveProcessingScreen(
          evidence({ planId: "subscribe_report_monthly", ownSubscription: { ...ACTIVE_SUB, status } }),
        ),
      ).toBe("subscription_inactive");
    },
  );

  it("paid monthly without its own subscription (conflict) is needs_manual", () => {
    expect(
      resolveProcessingScreen(evidence({ planId: "subscribe_report_monthly", ownSubscription: null })),
    ).toBe("needs_manual");
  });

  it("paid monthly whose own subscription lacks first_success is needs_manual", () => {
    expect(
      resolveProcessingScreen(
        evidence({
          planId: "subscribe_report_monthly",
          ownSubscription: { ...ACTIVE_SUB, hasFirstSuccess: false },
        }),
      ),
    ).toBe("needs_manual");
  });

  it("paid with an unknown plan is needs_manual", () => {
    expect(resolveProcessingScreen(evidence({ planId: "mystery", accessStatus: "unlocked" }))).toBe(
      "needs_manual",
    );
  });
});
