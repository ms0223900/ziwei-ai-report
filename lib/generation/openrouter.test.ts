import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISCLAIMER, LOCKED_FIELDS } from "../constants";
import { validateComplete } from "../schemas/loader";
import advancedValid from "./fixtures/advanced.valid.json";
import basicValid from "./fixtures/basic.valid.json";
import { generateOpenRouterReport } from "./openrouter";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
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

function httpError(status: number): Response {
  return new Response("upstream error", { status });
}

function requestUrl(call: unknown[]): string {
  return String(call[0]);
}

function requestInit(call: unknown[]): RequestInit | undefined {
  return call[1] as RequestInit | undefined;
}

function requestModel(call: unknown[]): string | undefined {
  const body = requestInit(call)?.body;
  if (typeof body !== "string") {
    return undefined;
  }
  return JSON.parse(body).model;
}

function requestAuthorization(call: unknown[]): string | undefined {
  const headers = requestInit(call)?.headers;
  if (!headers) {
    return undefined;
  }
  if (headers instanceof Headers) {
    return headers.get("Authorization") ?? undefined;
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([name]) => name.toLowerCase() === "authorization");
    return found?.[1];
  }
  const record = headers as Record<string, string>;
  return record.Authorization ?? record.authorization;
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

describe("generateOpenRouterReport", () => {
  it("uses a complete fixture that already passes report.complete.v1", () => {
    expect(validateComplete(completePayload).ok).toBe(true);
  });

  it("posts to OpenRouter with the server key and primary model, and does not call fallback on success", async () => {
    vi.mocked(fetch).mockResolvedValue(chatOk(completePayload));

    const result = await generateOpenRouterReport();

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success");
    }
    expect(validateComplete(result.complete).ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(requestUrl(call)).toBe(OPENROUTER_URL);
    expect(requestInit(call)?.method).toBe("POST");
    expect(requestAuthorization(call)).toBe(`Bearer ${SERVER_KEY}`);
    expect(requestAuthorization(call)).not.toContain("sk-public-must-not-use");
    expect(requestModel(call)).toBe(PRIMARY);
    expect(requestModel(call)).not.toBe(FALLBACK);
  });

  it("retries the same primary model once on transport failure, then uses the fallback model", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(httpError(500))
      .mockResolvedValueOnce(httpError(502))
      .mockResolvedValueOnce(chatOk(completePayload));

    const result = await generateOpenRouterReport();

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(fetch).mock.calls;
    expect(requestModel(calls[0])).toBe(PRIMARY);
    expect(requestModel(calls[1])).toBe(PRIMARY);
    expect(requestModel(calls[2])).toBe(FALLBACK);
  });

  it("treats timeout as a request failure and retries the primary model before fallback", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(chatOk(completePayload));

    const result = await generateOpenRouterReport();

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(fetch).mock.calls;
    expect(requestModel(calls[0])).toBe(PRIMARY);
    expect(requestModel(calls[1])).toBe(PRIMARY);
    expect(requestModel(calls[2])).toBe(FALLBACK);
  });

  it("retries on invalid JSON as a validation failure, not as transport 502", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(chatOk("not-json: mock SCHEMA_INVALID payload"))
      .mockResolvedValueOnce(chatOk(completePayload));

    const result = await generateOpenRouterReport();

    expect(result.ok).toBe(true);
    expect(result.ok && result.kind).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetch).mock.calls;
    expect(requestModel(calls[0])).toBe(PRIMARY);
    expect(requestModel(calls[1])).toBe(PRIMARY);
  });

  it("retries on a missing-field JSON body as validation failure, then falls back", async () => {
    const { overall: _overall, ...missingOverall } = completePayload;
    vi.mocked(fetch)
      .mockResolvedValueOnce(chatOk(missingOverall))
      .mockResolvedValueOnce(chatOk(missingOverall))
      .mockResolvedValueOnce(chatOk(completePayload));

    const result = await generateOpenRouterReport();

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(fetch).mock.calls;
    expect(requestModel(calls[0])).toBe(PRIMARY);
    expect(requestModel(calls[1])).toBe(PRIMARY);
    expect(requestModel(calls[2])).toBe(FALLBACK);
  });

  it("returns kind transport after primary, retry, and fallback all fail with non-2xx", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(httpError(500))
      .mockResolvedValueOnce(httpError(500))
      .mockResolvedValueOnce(httpError(503));

    const result = await generateOpenRouterReport();

    expect(result).toEqual({ ok: false, kind: "transport" });
  });

  it("returns kind schema when the model replies but never passes complete schema", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(chatOk("not-json"))
      .mockResolvedValueOnce(chatOk("not-json"))
      .mockResolvedValueOnce(chatOk("not-json"));

    const result = await generateOpenRouterReport();

    expect(result).toEqual({ ok: false, kind: "schema" });
  });
});
