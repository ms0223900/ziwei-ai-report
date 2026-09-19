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
    expect(view.ctaLabel).toBe("解鎖完整報告");
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
    expect(view.ctaLabel).toBe("解鎖完整報告");
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
    expect(JSON.stringify(view)).not.toContain("解鎖完整報告");
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
});
