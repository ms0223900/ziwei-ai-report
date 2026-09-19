import { describe, expect, it } from "vitest";
import { PREVIEW_EXAMPLE_MARK } from "../constants";
import {
  PRODUCTION_PREVIEW_ALERT,
  resolveCommercialPreviewPolicy,
  resolvePreviewView,
} from "./preview";

describe("resolveCommercialPreviewPolicy — Story 13", () => {
  it("keeps production without preview=1 free of overlay and alert", () => {
    const policy = resolveCommercialPreviewPolicy({
      nodeEnv: "production",
      previewRaw: "0",
      localState: "B",
    });

    expect(policy.overlayEnabled).toBe(false);
    expect(policy.showAlert).toBe(false);
    expect(policy.alertMessage).toBeNull();
    expect(policy.effectiveState).toBe("A");
  });

  it("warns and blocks overlay when production still has preview=1", () => {
    const policy = resolveCommercialPreviewPolicy({
      nodeEnv: "production",
      previewRaw: "1",
      localState: "B",
    });

    expect(policy.overlayEnabled).toBe(false);
    expect(policy.showAlert).toBe(true);
    expect(policy.alertMessage).toBe(
      "設定錯誤：正式環境不應開啟開發預覽。此畫面不是已付款開通。",
    );
    expect(policy.alertMessage).toBe(PRODUCTION_PREVIEW_ALERT);
    expect(policy.effectiveState).toBe("A");
  });

  it("keeps locked placeholders when production preview is mis-set", () => {
    const policy = resolveCommercialPreviewPolicy({
      nodeEnv: "production",
      previewRaw: "1",
      localState: "B",
    });
    const view = resolvePreviewView({
      state: policy.effectiveState,
      nickname: "小圓",
    });

    expect(view.title).toBe("小圓的基本分析");
    expect(view.advancedLocked).toBe(true);
    expect(view.showCta).toBe(true);
    expect(view.exampleBlocks).toBeNull();
    expect(policy.showAlert).toBe(true);
  });

  it("does not paint an unlocked title from preview overlay unless access is unlocked", () => {
    const policy = resolveCommercialPreviewPolicy({
      nodeEnv: "production",
      previewRaw: "1",
      localState: "B",
    });
    const previewView = resolvePreviewView({
      state: policy.effectiveState,
      nickname: "小圓",
    });

    expect(policy.overlayEnabled).toBe(false);
    expect(previewView.title).not.toBe("小圓的進階報告");
    expect(previewView.exampleBlocks).toBeNull();
    expect(JSON.stringify(previewView)).not.toContain(PREVIEW_EXAMPLE_MARK);
  });

  it("allows unit2 overlay in non-production when preview=1 and skips the prod alert", () => {
    const policy = resolveCommercialPreviewPolicy({
      nodeEnv: "development",
      previewRaw: "1",
      localState: "C",
    });
    const view = resolvePreviewView({
      state: policy.effectiveState,
      nickname: "阿明",
    });

    expect(policy.overlayEnabled).toBe(true);
    expect(policy.showAlert).toBe(false);
    expect(policy.alertMessage).toBeNull();
    expect(policy.effectiveState).toBe("C");
    expect(view.exampleBlocks?.rationale).toContain(PREVIEW_EXAMPLE_MARK);
  });
});
