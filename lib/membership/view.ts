import type { PreviewState } from "../commercial/preview";
import {
  MEMBERSHIP_CTA_UNLOCKED,
  MEMBERSHIP_CTA_UPGRADE,
  MEMBERSHIP_GRANT_NOTE,
  REPORT_SLOTS,
  UPCOMING_UNLOCK_NOTE,
} from "../constants";

export const MEMBERSHIP_CTA_UPCOMING = "即將開放";
export {
  MEMBERSHIP_CTA_UNLOCKED,
  MEMBERSHIP_CTA_UPGRADE,
  MEMBERSHIP_GRANT_NOTE,
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
      ctaLabel: MEMBERSHIP_CTA_UPCOMING,
      ctaNote: UPCOMING_UNLOCK_NOTE,
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
      ctaLabel: MEMBERSHIP_CTA_UPGRADE,
      ctaNote: MEMBERSHIP_GRANT_NOTE,
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
