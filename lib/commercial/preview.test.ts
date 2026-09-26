import { describe, expect, it } from "vitest";
import { PREVIEW_EXAMPLE_MARK } from "../constants";
import {
  isCommercialPreviewEnabled,
  resolveEffectivePreviewState,
  resolvePreviewView,
} from "./preview";

describe("isCommercialPreviewEnabled", () => {
  it("is true only for the string 1", () => {
    expect(isCommercialPreviewEnabled("1")).toBe(true);
  });

  it("is false for missing, empty, zero, or other values", () => {
    expect(isCommercialPreviewEnabled(undefined)).toBe(false);
    expect(isCommercialPreviewEnabled("")).toBe(false);
    expect(isCommercialPreviewEnabled("0")).toBe(false);
    expect(isCommercialPreviewEnabled("true")).toBe(false);
  });
});

describe("resolveEffectivePreviewState", () => {
  it("falls back to A when preview is disabled even if local state is B", () => {
    expect(
      resolveEffectivePreviewState({
        enabled: false,
        localState: "B",
        searchParams: new URLSearchParams("preview=B&tier=advanced&status=advanced"),
      }),
    ).toBe("A");
  });

  it("ignores preview, tier, and status query when enabled", () => {
    expect(
      resolveEffectivePreviewState({
        enabled: true,
        localState: "A",
        searchParams: new URLSearchParams("preview=B&tier=advanced&status=advanced"),
      }),
    ).toBe("A");
  });

  it("returns the local state when enabled", () => {
    expect(
      resolveEffectivePreviewState({
        enabled: true,
        localState: "C",
        searchParams: new URLSearchParams("preview=B"),
      }),
    ).toBe("C");
  });
});

describe("resolvePreviewView", () => {
  it("keeps 畫面 A title, locks, and visible CTA", () => {
    const view = resolvePreviewView({ state: "A", nickname: "小圓" });

    expect(view.title).toBe("小圓的基本分析");
    expect(view.advancedLocked).toBe(true);
    expect(view.showCta).toBe(true);
    expect(view.exampleBlocks).toBeNull();
  });

  it("unlocks example blocks for B", () => {
    const view = resolvePreviewView({
      state: "B",
      nickname: "小圓",
      advancedSource: {
        rationale: "真文 rationale 不該被採用",
        path_compare: { path_a: "真文", path_b: "真文", note: "真文" },
        action_plan: ["第 1 天：真文"],
      },
    });

    expect(view.title).toBe("小圓的進階報告");
    expect(view.advancedLocked).toBe(false);
    expect(view.showCta).toBe(false);
    expect(view.exampleBlocks?.rationale).toContain(PREVIEW_EXAMPLE_MARK);
    expect(view.exampleBlocks?.pathCompare).toContain(PREVIEW_EXAMPLE_MARK);
    expect(view.exampleBlocks?.actionPlan).toContain(PREVIEW_EXAMPLE_MARK);
    expect(view.exampleBlocks?.rationale).not.toContain("真文 rationale");
  });

  it("renders C and D the same as B now that follow-ups are removed", () => {
    const b = resolvePreviewView({ state: "B", nickname: "小圓" });
    const c = resolvePreviewView({ state: "C", nickname: "小圓" });
    const d = resolvePreviewView({ state: "D", nickname: "小圓" });
    expect(c).toEqual(b);
    expect(d).toEqual(b);
    expect(JSON.stringify(d)).not.toContain("追問");
  });

});
