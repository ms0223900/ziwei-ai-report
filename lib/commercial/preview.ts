import {
  FOLLOWUP_HINT,
  PREVIEW_EXAMPLE_MARK,
  PREVIEW_MONTHLY_REMAINING,
  PREVIEW_NO_DEDUCT,
  SUBSCRIBE_ACTIVE_PREVIEW,
  SUBSCRIBE_LABEL,
} from "../constants";

export type PreviewState = "A" | "B" | "C" | "D";

export type PreviewExampleBlocks = {
  rationale: string;
  pathCompare: string;
  actionPlan: string;
};

export type PreviewView = {
  title: string;
  advancedLocked: boolean;
  showCta: boolean;
  followupLocked: boolean;
  followupCaption: string;
  subscribeLabel: string;
  exampleBlocks: PreviewExampleBlocks | null;
};

const EXAMPLE_BLOCKS: PreviewExampleBlocks = {
  rationale: `${PREVIEW_EXAMPLE_MARK}：此段為依據示意，非本人命盤。`,
  pathCompare: `${PREVIEW_EXAMPLE_MARK}：路徑甲與路徑乙的比較示意，非本人命盤。`,
  actionPlan: `${PREVIEW_EXAMPLE_MARK}：七日行事方針示意，非本人命盤。`,
};

export function isCommercialPreviewEnabled(
  raw: string | undefined,
): boolean {
  return raw === "1";
}

export function resolveEffectivePreviewState(args: {
  enabled: boolean;
  localState: PreviewState;
  searchParams?: URLSearchParams | null;
}): PreviewState {
  if (!args.enabled) {
    return "A";
  }

  return args.localState;
}

export function resolvePreviewView(args: {
  state: PreviewState;
  nickname: string;
  advancedSource?: unknown;
}): PreviewView {
  void args.advancedSource;

  const base: PreviewView = {
    title: `${args.nickname}的基本分析`,
    advancedLocked: true,
    showCta: true,
    followupLocked: true,
    followupCaption: FOLLOWUP_HINT,
    subscribeLabel: SUBSCRIBE_LABEL,
    exampleBlocks: null,
  };

  if (args.state === "A") {
    return base;
  }

  const unlocked: PreviewView = {
    ...base,
    title: `${args.nickname}的進階報告`,
    advancedLocked: false,
    showCta: false,
    exampleBlocks: EXAMPLE_BLOCKS,
  };

  if (args.state === "B") {
    return unlocked;
  }

  if (args.state === "C") {
    return {
      ...unlocked,
      followupLocked: false,
      followupCaption: PREVIEW_NO_DEDUCT,
    };
  }

  return {
    ...unlocked,
    followupLocked: false,
    followupCaption: PREVIEW_MONTHLY_REMAINING,
    subscribeLabel: SUBSCRIBE_ACTIVE_PREVIEW,
  };
}
