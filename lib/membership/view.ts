import type { PreviewState } from "../commercial/preview";
import {
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
  REPORT_SLOTS,
} from "../constants";

export {
  MEMBERSHIP_CTA_UNLOCK_REPORT,
  MEMBERSHIP_CTA_UNLOCKED,
};

export type MembershipAccessStatus = "locked" | "unlocked";

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
};

export function resolveMembershipView(
  input: ResolveMembershipViewInput,
): MembershipView {
  void input.previewEnabled;
  void input.previewState;

  if (!input.hasSession) {
    return {
      title: `${input.nickname}的基本分析`,
      advancedLocked: true,
      showCta: true,
      ctaLabel: MEMBERSHIP_CTA_UNLOCK_REPORT,
      ctaNote: null,
      followupLocked: true,
      authSlot: REPORT_SLOTS.authEntry,
      advanced: null,
    };
  }

  if (input.accessStatus !== "unlocked") {
    return {
      title: `${input.nickname}的基本分析`,
      advancedLocked: true,
      showCta: true,
      ctaLabel: MEMBERSHIP_CTA_UNLOCK_REPORT,
      ctaNote: null,
      followupLocked: true,
      authSlot: REPORT_SLOTS.authSession,
      advanced: null,
    };
  }

  return {
    title: `${input.nickname}的進階報告`,
    advancedLocked: false,
    showCta: false,
    ctaLabel: MEMBERSHIP_CTA_UNLOCKED,
    ctaNote: null,
    followupLocked: true,
    authSlot: REPORT_SLOTS.authSession,
    advanced: input.advanced ?? null,
  };
}
