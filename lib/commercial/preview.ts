import { PREVIEW_EXAMPLE_MARK } from "../constants";

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
  exampleBlocks: PreviewExampleBlocks | null;
};

const EXAMPLE_BLOCKS: PreviewExampleBlocks = {
  rationale: `${PREVIEW_EXAMPLE_MARK}：此段為依據示意，非本人命盤。`,
  pathCompare: `${PREVIEW_EXAMPLE_MARK}：路徑甲與路徑乙的比較示意，非本人命盤。`,
  actionPlan: `${PREVIEW_EXAMPLE_MARK}：七日行事方針示意，非本人命盤。`,
};

export const PRODUCTION_PREVIEW_ALERT =
  "設定錯誤：正式環境不應開啟開發預覽。此畫面不是已付款開通。";

export type CommercialPreviewPolicy = {
  overlayEnabled: boolean;
  showAlert: boolean;
  alertMessage: string | null;
  effectiveState: PreviewState;
};

export function isCommercialPreviewEnabled(
  raw: string | undefined,
): boolean {
  return raw === "1";
}

export function resolveCommercialPreviewPolicy(args: {
  nodeEnv: string | undefined;
  previewRaw: string | undefined;
  localState: PreviewState;
}): CommercialPreviewPolicy {
  const previewOn = isCommercialPreviewEnabled(args.previewRaw);
  const production = args.nodeEnv === "production";

  if (production && previewOn) {
    return {
      overlayEnabled: false,
      showAlert: true,
      alertMessage: PRODUCTION_PREVIEW_ALERT,
      effectiveState: "A",
    };
  }

  if (!previewOn || production) {
    return {
      overlayEnabled: false,
      showAlert: false,
      alertMessage: null,
      effectiveState: "A",
    };
  }

  return {
    overlayEnabled: true,
    showAlert: false,
    alertMessage: null,
    effectiveState: args.localState,
  };
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

  // B／C／D used to differ only by follow-up copy; follow-ups are gone.
  return unlocked;
}
