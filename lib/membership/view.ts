import type { PreviewState } from "../commercial/preview";
import {
  MEMBERSHIP_CTA_POINT_UNLOCKED,
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
  REPORT_SLOTS,
} from "../constants";

export {
  MEMBERSHIP_CTA_POINT_UNLOCKED,
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
};

export type MembershipAccessStatus = "locked" | "unlocked";

export type MembershipUnlockMode = "lifetime" | "points" | "none";

export type MembershipAdvanced = {
  rationale: string;
  path_compare: {
    path_a: string;
    path_b: string;
    note: string;
  };
  action_plan: string[];
};

export type ResolveMembershipViewInput = {
  accessStatus: MembershipAccessStatus | null;
  hasSession: boolean;
  previewState: PreviewState;
  previewEnabled: boolean;
  nickname: string;
  advanced?: MembershipAdvanced | null;
  pointsBalance?: number;
  unlockMode?: MembershipUnlockMode;
  isOwnReport?: boolean;
};

export type MembershipView = {
  title: string;
  advancedLocked: boolean;
  showCta: boolean;
  ctaLabel: string;
  ctaNote: string | null;
  followupLocked: boolean;
  authSlot: string;
  advanced: MembershipAdvanced | null;
  unlockMode: MembershipUnlockMode;
  showPointsPackCta: boolean;
  purchaseRequiresLogin: boolean;
  showUnlockWithPoint: boolean;
  pointsInsufficient: boolean;
  pointsBalance: number;
};

export function resolveMembershipView(
  input: ResolveMembershipViewInput,
): MembershipView {
  void input.previewEnabled;
  void input.previewState;

  const basicTitle = `${input.nickname}的基本分析`;
  const pointsBalance = input.hasSession ? (input.pointsBalance ?? 0) : 0;
  const advancedTitle = `${input.nickname}的進階報告`;

  if (!input.hasSession) {
    return {
      title: basicTitle,
      advancedLocked: true,
      showCta: true,
      ctaLabel: MEMBERSHIP_CTA_UNLOCK_REPORT,
      ctaNote: null,
      followupLocked: true,
      authSlot: REPORT_SLOTS.authEntry,
      advanced: null,
      unlockMode: "none",
      showPointsPackCta: true,
      purchaseRequiresLogin: true,
      showUnlockWithPoint: false,
      pointsInsufficient: false,
      pointsBalance,
    };
  }

  const memberFlags = {
    followupLocked: true,
    ctaNote: null,
    authSlot: REPORT_SLOTS.authSession,
    showPointsPackCta: true,
    purchaseRequiresLogin: false,
    pointsBalance,
  };

  if (input.accessStatus === "unlocked") {
    return {
      ...memberFlags,
      title: advancedTitle,
      advancedLocked: false,
      showCta: false,
      ctaLabel: MEMBERSHIP_CTA_UNLOCKED,
      advanced: input.advanced ?? null,
      unlockMode: "lifetime",
      showUnlockWithPoint: false,
      pointsInsufficient: false,
    };
  }

  const isOwnReport = input.isOwnReport === true;

  if (isOwnReport && input.unlockMode === "points") {
    return {
      ...memberFlags,
      title: advancedTitle,
      advancedLocked: false,
      showCta: false,
      ctaLabel: MEMBERSHIP_CTA_POINT_UNLOCKED,
      advanced: input.advanced ?? null,
      unlockMode: "points",
      showUnlockWithPoint: false,
      pointsInsufficient: false,
    };
  }

  const hasPoint = pointsBalance >= 1;

  return {
    ...memberFlags,
    title: basicTitle,
    advancedLocked: true,
    showCta: true,
    ctaLabel: MEMBERSHIP_CTA_UNLOCK_REPORT,
    advanced: null,
    unlockMode: "none",
    showUnlockWithPoint: isOwnReport && hasPoint,
    pointsInsufficient: isOwnReport && !hasPoint,
  };
}
