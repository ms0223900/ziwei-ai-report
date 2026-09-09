/**
 * OpenRouter Live 生成：主模型失敗才同模型重試一次，再切備援。
 * 模型名與 API key 只讀 server env，永不讀 NEXT_PUBLIC_OPENROUTER_API_KEY。
 */
import "server-only";
import { ZWDS_SYSTEM_PROMPT } from "../prompts/zwds-v1";
import { validateComplete } from "../schemas/loader";
import type { ValidatedBirth } from "../validation/birth";

export const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const FETCH_TIMEOUT_MS = 20_000;

export type GenerateReportSuccess = {
  ok: true;
  complete: Record<string, unknown>;
  model: string;
};

export type GenerateReportFailure = {
  ok: false;
  kind: "transport" | "schema";
};

export type GenerateReportResult = GenerateReportSuccess | GenerateReportFailure;

type ChatAttempt =
  | { ok: true; complete: Record<string, unknown> }
  | { ok: false; kind: "transport" | "schema" };

function readApiKey(): string {
  return process.env.OPENROUTER_API_KEY ?? "";
}

function readPrimaryModel(): string {
  return process.env.OPENROUTER_PRIMARY_MODEL ?? "";
}

function readFallbackModel(): string {
  return process.env.OPENROUTER_FALLBACK_MODEL ?? "";
}

function readMessageContent(envelope: unknown): unknown {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return undefined;
  }
  const choices = (envelope as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }
  const first = choices[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) {
    return undefined;
  }
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return undefined;
  }
  return (message as { content?: unknown }).content;
}

function parseCompleteContent(content: unknown): ChatAttempt {
  let parsed: unknown;
  if (typeof content === "string") {
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, kind: "schema" };
    }
  } else if (content && typeof content === "object") {
    parsed = content;
  } else {
    return { ok: false, kind: "schema" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, kind: "schema" };
  }

  if (!validateComplete(parsed).ok) {
    return { ok: false, kind: "schema" };
  }

  return { ok: true, complete: parsed as Record<string, unknown> };
}

function userPrompt(birth?: ValidatedBirth): string {
  return JSON.stringify({
    nickname: birth?.nickname ?? "",
    birth_date: birth?.birth_date ?? "",
    birth_time: birth?.birth_time ?? null,
    time_unknown: birth?.time_unknown ?? true,
    focus: birth?.focus ?? "整體",
  });
}

async function callOpenRouter(
  model: string,
  birth?: ValidatedBirth,
): Promise<ChatAttempt> {
  let response: Response;
  try {
    response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${readApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: ZWDS_SYSTEM_PROMPT },
          { role: "user", content: userPrompt(birth) },
        ],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, kind: "transport" };
  }

  if (!response.ok) {
    return { ok: false, kind: "transport" };
  }

  let envelope: unknown;
  try {
    envelope = await response.json();
  } catch {
    return { ok: false, kind: "schema" };
  }

  return parseCompleteContent(readMessageContent(envelope));
}

export async function generateOpenRouterReport(
  birth?: ValidatedBirth,
): Promise<GenerateReportResult> {
  const primary = readPrimaryModel();
  const fallback = readFallbackModel();
  const sequence = [primary, primary, fallback];
  let lastKind: GenerateReportFailure["kind"] = "transport";

  for (const model of sequence) {
    const attempt = await callOpenRouter(model, birth);
    if (attempt.ok) {
      return { ok: true, complete: attempt.complete, model };
    }
    lastKind = attempt.kind;
  }

  return { ok: false, kind: lastKind };
}
