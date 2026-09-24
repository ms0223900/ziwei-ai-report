import { describe, expect, it } from "vitest";
import { PREVIEW_EXAMPLE_MARK, REPORT_SLOTS } from "../constants";
import advancedValid from "../generation/fixtures/advanced.valid.json";
import { resolveMembershipView } from "./view";

const REAL_ADVANCED = {
  rationale: advancedValid.rationale,
  path_compare: advancedValid.path_compare,
  action_plan: [...advancedValid.action_plan],
};

function baseInput(
  overrides: Partial<Parameters<typeof resolveMembershipView>[0]> = {},
) {
  return {
    accessStatus: null as "locked" | "unlocked" | null,
    hasSession: false,
    previewState: "A" as const,
    previewEnabled: false,
    nickname: "小圓",
    advanced: REAL_ADVANCED,
    ...overrides,
  };
}

const PAYMENT_DENIAL_COPY = [
  "即將開放",
  "解鎖即將開放，本版不收費。",
  "開通由講師受控流程處理，本版不收費",
  "升級／開通",
];

function expectNoPaymentDenialCopy(view: ReturnType<typeof resolveMembershipView>) {
  const serialized = JSON.stringify(view);
  for (const phrase of PAYMENT_DENIAL_COPY) {
    expect(serialized).not.toContain(phrase);
  }
}

describe("resolveMembershipView", () => {
  it("keeps guest on basic title, locked advanced, unlock-report CTA, and auth entry", () => {
    const view = resolveMembershipView(baseInput());

    expect(view.title).toBe("小圓的基本分析");
    expect(view.advancedLocked).toBe(true);
    expect(view.showCta).toBe(true);
    expect(view.ctaLabel).toBe("永久解鎖完整報告");
    expect(view.followupLocked).toBe(true);
    expect(view.authSlot).toBe(REPORT_SLOTS.authEntry);
    expect(view.advanced).toBeNull();
    expectNoPaymentDenialCopy(view);
  });

  it("uses unlock-report CTA for a locked member and does not unlock", () => {
    const view = resolveMembershipView(
      baseInput({
        hasSession: true,
        accessStatus: "locked",
      }),
    );

    expect(view.title).toBe("小圓的基本分析");
    expect(view.advancedLocked).toBe(true);
    expect(view.showCta).toBe(true);
    expect(view.ctaLabel).toBe("永久解鎖完整報告");
    expect(view.followupLocked).toBe(true);
    expect(view.authSlot).toBe(REPORT_SLOTS.authSession);
    expect(view.advanced).toBeNull();
    expectNoPaymentDenialCopy(view);
  });

  it("uses passed advanced text for unlocked and keeps followup locked", () => {
    const view = resolveMembershipView(
      baseInput({
        hasSession: true,
        accessStatus: "unlocked",
      }),
    );

    expect(view.title).toBe("小圓的進階報告");
    expect(view.advancedLocked).toBe(false);
    expect(view.showCta).toBe(false);
    expect(view.ctaLabel).toBe("已開通");
    expect(JSON.stringify(view)).not.toContain("永久解鎖完整報告");
    expect(view.followupLocked).toBe(true);
    expect(view.advanced?.rationale).toBe(REAL_ADVANCED.rationale);
    expect(view.advanced?.action_plan).toHaveLength(7);
    expect(view.advanced?.path_compare).toEqual(REAL_ADVANCED.path_compare);
    expect(JSON.stringify(view)).not.toContain(PREVIEW_EXAMPLE_MARK);
  });

  it("keeps real advanced when unlocked even if preview B is on", () => {
    const view = resolveMembershipView(
      baseInput({
        hasSession: true,
        accessStatus: "unlocked",
        previewEnabled: true,
        previewState: "B",
      }),
    );

    expect(view.title).toBe("小圓的進階報告");
    expect(view.advancedLocked).toBe(false);
    expect(view.advanced?.rationale).toBe(REAL_ADVANCED.rationale);
    expect(view.advanced?.action_plan?.[0]).toContain("第 1 天");
    expect(JSON.stringify(view)).not.toContain(PREVIEW_EXAMPLE_MARK);
    expect(view.followupLocked).toBe(true);
  });

  it("drops advanced payload when there is no session", () => {
    const view = resolveMembershipView(
      baseInput({
        accessStatus: "unlocked",
        hasSession: false,
        previewEnabled: true,
        previewState: "B",
      }),
    );

    expect(view.title).toBe("小圓的基本分析");
    expect(view.advancedLocked).toBe(true);
    expect(view.advanced).toBeNull();
    expect(view.authSlot).toBe(REPORT_SLOTS.authEntry);
    expect(JSON.stringify(view)).not.toContain(REAL_ADVANCED.rationale);
  });

  describe("points unlock third state (US-016)", () => {
    type ThirdStateInput = Parameters<typeof resolveMembershipView>[0];

    function view(overrides: Partial<ThirdStateInput> = {}) {
      const input: ThirdStateInput = {
        ...baseInput(),
        hasSession: true,
        accessStatus: "locked",
        pointsBalance: 0,
        unlockMode: "none",
        isOwnReport: true,
        ...overrides,
      };
      return resolveMembershipView(input);
    }

    it("shows advanced for a point-unlocked own report without lifetime CTA copy", () => {
      const result = view({ unlockMode: "points", pointsBalance: 4 });

      expect(result.title).toBe("小圓的進階報告");
      expect(result.advancedLocked).toBe(false);
      expect(result.advanced?.rationale).toBe(REAL_ADVANCED.rationale);
      expect(result.unlockMode).toBe("points");
      expect(result.ctaLabel).not.toBe("已開通");
      expect(result.showUnlockWithPoint).toBe(false);
    });

    it("hides the lifetime unlock button for lifetime members but keeps buying points", () => {
      const result = view({ accessStatus: "unlocked", unlockMode: "lifetime" });

      expect(result.advancedLocked).toBe(false);
      expect(result.showCta).toBe(false);
      expect(result.ctaLabel).toBe("已開通");
      expect(result.unlockMode).toBe("lifetime");
      expect(result.showPointsPackCta).toBe(true);
      expect(result.purchaseRequiresLogin).toBe(false);
      expect(result.showUnlockWithPoint).toBe(false);
    });

    it("treats an unlocked account as lifetime even without an explicit unlock mode", () => {
      const result = view({ accessStatus: "unlocked", unlockMode: undefined });

      expect(result.unlockMode).toBe("lifetime");
      expect(result.showPointsPackCta).toBe(true);
    });

    it("keeps buy points visible next to the lifetime CTA for a locked member", () => {
      const result = view({ pointsBalance: 0 });

      expect(result.showCta).toBe(true);
      expect(result.ctaLabel).toBe("永久解鎖完整報告");
      expect(result.showPointsPackCta).toBe(true);
      expect(result.purchaseRequiresLogin).toBe(false);
    });

    it("offers unlocking with a point when the own report is locked and balance is at least 1", () => {
      const result = view({ pointsBalance: 1 });

      expect(result.advancedLocked).toBe(true);
      expect(result.advanced).toBeNull();
      expect(result.unlockMode).toBe("none");
      expect(result.showUnlockWithPoint).toBe(true);
      expect(result.pointsInsufficient).toBe(false);
    });

    it("flags insufficient points instead of offering the unlock when balance is below 1", () => {
      const result = view({ pointsBalance: 0 });

      expect(result.advancedLocked).toBe(true);
      expect(result.advanced).toBeNull();
      expect(result.showUnlockWithPoint).toBe(false);
      expect(result.pointsInsufficient).toBe(true);
    });

    it("does not offer a point unlock on a report the member does not own", () => {
      const result = view({ pointsBalance: 3, isOwnReport: false });

      expect(result.advancedLocked).toBe(true);
      expect(result.showUnlockWithPoint).toBe(false);
      expect(result.pointsInsufficient).toBe(false);
    });

    it("sends guests to login for buying points and never offers a point unlock", () => {
      const result = view({
        hasSession: false,
        accessStatus: null,
        pointsBalance: 5,
        unlockMode: "points",
      });

      expect(result.advancedLocked).toBe(true);
      expect(result.advanced).toBeNull();
      expect(JSON.stringify(result)).not.toContain(REAL_ADVANCED.rationale);
      expect(result.showUnlockWithPoint).toBe(false);
      expect(result.showPointsPackCta).toBe(true);
      expect(result.purchaseRequiresLogin).toBe(true);
    });
  });
});
