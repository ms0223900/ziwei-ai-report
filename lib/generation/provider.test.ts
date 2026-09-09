import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";
import advancedValid from "./fixtures/advanced.valid.json";
import basicValid from "./fixtures/basic.valid.json";
import { generateLiveReport } from "./provider";

const PRIMARY = "test/primary-model";
const FALLBACK = "test/fallback-model";
const SERVER_KEY = "sk-server-only";

const completePayload = {
  ...basicValid,
  ...advancedValid,
  tier: "advanced",
  action: basicValid.action,
  locked_fields: [...LOCKED_FIELDS],
  disclaimer: DISCLAIMER,
};

function chatOk(content: unknown): Response {
  const text =
    typeof content === "string" ? content : JSON.stringify(content);
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", SERVER_KEY);
  vi.stubEnv("OPENROUTER_PRIMARY_MODEL", PRIMARY);
  vi.stubEnv("OPENROUTER_FALLBACK_MODEL", FALLBACK);
  vi.stubEnv("NEXT_PUBLIC_OPENROUTER_API_KEY", "sk-public-must-not-use");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generateLiveReport", () => {
  it("does not call OpenRouter when AI_PROVIDER is mock", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");

    await generateLiveReport();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("calls OpenRouter when AI_PROVIDER is openrouter and returns a complete object", async () => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.mocked(fetch).mockResolvedValue(chatOk(completePayload));

    const result = await generateLiveReport();

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalled();
    const authHeader = (() => {
      const headers = (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined)
        ?.headers;
      if (headers instanceof Headers) {
        return headers.get("Authorization");
      }
      if (headers && !Array.isArray(headers)) {
        const record = headers as Record<string, string>;
        return record.Authorization ?? record.authorization;
      }
      return undefined;
    })();
    expect(authHeader).toBe(`Bearer ${SERVER_KEY}`);
    expect(authHeader).not.toContain("sk-public-must-not-use");
  });
});
