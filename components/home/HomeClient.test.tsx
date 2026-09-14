/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISCLAIMER,
  ERROR_MESSAGES,
  HIGH_RISK_MESSAGES,
  MEMBERSHIP_CTA_UPGRADE,
  MEMBERSHIP_GRANT_NOTE,
  PREVIEW_EXAMPLE_MARK,
} from "../../lib/constants";
import advancedValid from "../../lib/generation/fixtures/advanced.valid.json";
import { HomeClient } from "./HomeClient";

const PERSIST_ID = "11111111-1111-4111-8111-111111111111";
const MASKED_POST_BODY = {
  persist_id: PERSIST_ID,
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作",
  overall: "API 原局總覽句",
  work: "API 官祿句",
  relationship: "API 夫妻句",
  action: "API 行動句",
  disclaimer: DISCLAIMER,
  status: "basic",
};
const GET_ADVANCED_BODY = {
  persist_id: PERSIST_ID,
  nickname: "小圓",
  overall: "API 原局總覽句",
  work: "API 官祿句",
  relationship: "API 夫妻句",
  action: "API 行動句",
  rationale: advancedValid.rationale,
  path_compare: advancedValid.path_compare,
  action_plan: advancedValid.action_plan,
  locked_fields: [],
  access_status: "unlocked",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const HIGH_RISK_NICKNAMES = [
  { nickname: "這筆投資會不會賺", category: "financial_risk" as const },
  { nickname: "看病怎麼辦", category: "health" as const },
  { nickname: "要找律師嗎", category: "legal" as const },
  { nickname: "懷孕安不安全", category: "pregnancy" as const },
  { nickname: "有自傷念頭", category: "self_harm" as const },
] as const;

describe("HomeClient 高風險與失敗分流", () => {
  it("keeps field validation on the form and does not show the generation-fail H1", async () => {
    const user = userEvent.setup();
    render(<HomeClient />);

    await user.clear(screen.getByLabelText("命主暱稱"));
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(screen.getByText("請填寫暱稱。")).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "這次沒有寫成報告，你可以再試一次。",
      }),
    ).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows generating copy and disables submit so a second click does not fire", async () => {
    const user = userEvent.setup();
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<HomeClient />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(
      screen.getByText("正在依生辰起紫微命盤，定局排星中…"),
    ).toBeTruthy();
    expect(screen.getByText("排盤")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "看基本分析" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    resolveFetch?.(
      new Response(JSON.stringify({ nickname: "小圓" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await screen.findByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
  });

  it("does not render 畫面 A for a real HTTP 200 HIGH_RISK payload", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse(200, {
        error_code: "HIGH_RISK",
        category: "financial_risk",
        message: HIGH_RISK_MESSAGES.financial_risk,
        disclaimer: DISCLAIMER,
      }),
    );

    render(<HomeClient />);
    await user.clear(screen.getByLabelText("命主暱稱"));
    await user.type(screen.getByLabelText("命主暱稱"), "這筆投資會不會賺");
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(
      await screen.findByRole("heading", { name: "這題我不能用命盤作答" }),
    ).toBeTruthy();
    expect(screen.getByText(HIGH_RISK_MESSAGES.financial_risk)).toBeTruthy();
    expect(screen.getByText(DISCLAIMER)).toBeTruthy();
    expect(screen.getByRole("button", { name: "回表單" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /的基本分析/ })).toBeNull();
    expect(screen.queryByText("解鎖完整報告")).toBeNull();
    expect(screen.queryByText("【 紫微原局・排盤總目 】")).toBeNull();
  });

  it.each(HIGH_RISK_NICKNAMES)(
    "keeps the same 07 shell and only swaps copy for $category",
    async ({ nickname, category }) => {
      const user = userEvent.setup();
      vi.mocked(fetch).mockResolvedValue(
        await jsonResponse(200, {
          error_code: "HIGH_RISK",
          category,
          message: HIGH_RISK_MESSAGES[category],
          disclaimer: DISCLAIMER,
        }),
      );

      render(<HomeClient />);
      await user.clear(screen.getByLabelText("命主暱稱"));
      await user.type(screen.getByLabelText("命主暱稱"), nickname);
      await user.click(screen.getByRole("button", { name: "看基本分析" }));

      expect(
        await screen.findByRole("heading", { name: "這題我不能用命盤作答" }),
      ).toBeTruthy();
      expect(screen.getByText(HIGH_RISK_MESSAGES[category])).toBeTruthy();
      expect(screen.queryByRole("button", { name: "解鎖完整報告" })).toBeNull();
    },
  );

  it.each([
    [422, ERROR_MESSAGES.SCHEMA_INVALID],
    [502, ERROR_MESSAGES.GENERATION_FAILED],
  ] as const)("shows retryable fail for HTTP %s", async (status, message) => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse(status, {
        error_code: status === 422 ? "SCHEMA_INVALID" : "GENERATION_FAILED",
        message,
      }),
    );

    render(<HomeClient />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(
      await screen.findByRole("heading", {
        name: "這次沒有寫成報告，你可以再試一次。",
      }),
    ).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByRole("button", { name: "再試一次" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /的基本分析/ })).toBeNull();
  });

  it("retries the last payload without marking the report unlocked", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        await jsonResponse(502, {
          error_code: "GENERATION_FAILED",
          message: ERROR_MESSAGES.GENERATION_FAILED,
        }),
      )
      .mockResolvedValueOnce(
        await jsonResponse(200, { nickname: "小圓", overall: "短評" }),
      );

    render(<HomeClient />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));
    await screen.findByRole("button", { name: "再試一次" });
    await user.click(screen.getByRole("button", { name: "再試一次" }));

    expect(await screen.findByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("解鎖即將開放，本版不收費。")).toBeNull();
  });

  it("returns to the form with the previous nickname after 回表單", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse(200, {
        error_code: "HIGH_RISK",
        category: "financial_risk",
        message: HIGH_RISK_MESSAGES.financial_risk,
        disclaimer: DISCLAIMER,
      }),
    );

    render(<HomeClient />);
    await user.clear(screen.getByLabelText("命主暱稱"));
    await user.type(screen.getByLabelText("命主暱稱"), "這筆投資會不會賺");
    await user.click(screen.getByRole("button", { name: "看基本分析" }));
    await user.click(await screen.findByRole("button", { name: "回表單" }));

    expect(screen.getByLabelText("命主暱稱")).toHaveProperty(
      "value",
      "這筆投資會不會賺",
    );
    expect(screen.getByRole("heading", { name: "紫微解讀" })).toBeTruthy();
  });
});

describe("HomeClient 單頁 wizard（US-022）", () => {
  it("renders 畫面 A from a 200 masked body, not canned-only copy", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse(200, {
        nickname: "小圓",
        birth_date: "1993-07-12",
        birth_time: null,
        time_unknown: true,
        focus: "工作",
        overall: "API 原局總覽句",
        work: "API 官祿句",
        relationship: "API 夫妻句",
        action: "API 行動句",
        disclaimer: DISCLAIMER,
        status: "basic",
      }),
    );

    render(<HomeClient />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(await screen.findByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.getByText("API 原局總覽句")).toBeTruthy();
    expect(screen.getByText("API 官祿句")).toBeTruthy();
    expect(screen.getByText("【 紫微原局・排盤總目 】")).toBeTruthy();
    expect(screen.getByText("解鎖完整報告")).toBeTruthy();
    expect(window.localStorage.length).toBe(0);
  });

  it("shows 畫面 A on persist 503 so mock-valid demo still works without a DB key", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      await jsonResponse(503, {
        error_code: "PERSIST_FAILED",
        message: ERROR_MESSAGES.PERSIST_FAILED,
      }),
    );

    render(<HomeClient />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(await screen.findByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.getByText("【 紫微原局・排盤總目 】")).toBeTruthy();
    expect(
      screen.queryByRole("heading", {
        name: "這次沒有寫成報告，你可以再試一次。",
      }),
    ).toBeNull();
  });
});

describe("HomeClient 會員三態", () => {
  it("GETs advanced text after POST when unlocked", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(`/api/reports/${PERSIST_ID}`)) {
        return jsonResponse(200, GET_ADVANCED_BODY);
      }
      return jsonResponse(200, MASKED_POST_BODY);
    });

    render(
      <HomeClient initialAccessStatus="unlocked" initialHasSession />,
    );
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(await screen.findByRole("heading", { name: "小圓的進階報告" })).toBeTruthy();
    expect(screen.getByText(advancedValid.rationale)).toBeTruthy();
    expect(screen.getByText(/第 1 天/)).toBeTruthy();
    expect(screen.queryByText(PREVIEW_EXAMPLE_MARK)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps locked GET failures off the card and does not open access", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(`/api/reports/${PERSIST_ID}`)) {
        return jsonResponse(403, {
          error_code: "FORBIDDEN",
          message: "尚未開通，無法讀取進階報告。",
          rationale: advancedValid.rationale,
        });
      }
      return jsonResponse(200, MASKED_POST_BODY);
    });

    render(<HomeClient initialAccessStatus="locked" initialHasSession />);
    await user.click(screen.getByRole("button", { name: "看基本分析" }));

    expect(await screen.findByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.queryByText(advancedValid.rationale)).toBeNull();
    await user.click(screen.getByRole("button", { name: MEMBERSHIP_CTA_UPGRADE }));
    expect(screen.getByRole("status").textContent).toBe(MEMBERSHIP_GRANT_NOTE);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("drops GET text when session props become guest", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(`/api/reports/${PERSIST_ID}`)) {
        return jsonResponse(200, GET_ADVANCED_BODY);
      }
      return jsonResponse(200, MASKED_POST_BODY);
    });

    const { rerender } = render(
      <HomeClient initialAccessStatus="unlocked" initialHasSession />,
    );
    await user.click(screen.getByRole("button", { name: "看基本分析" }));
    expect(await screen.findByText(advancedValid.rationale)).toBeTruthy();

    rerender(<HomeClient initialAccessStatus={null} initialHasSession={false} />);

    expect(screen.getByRole("heading", { name: "小圓的基本分析" })).toBeTruthy();
    expect(screen.queryByText(advancedValid.rationale)).toBeNull();
    expect(screen.getByText("即將開放")).toBeTruthy();
  });
});
