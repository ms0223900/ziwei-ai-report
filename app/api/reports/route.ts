import { DISCLAIMER } from "../../../lib/constants";
import {
  AppError,
  generationFailedError,
  persistFailedError,
  schemaInvalidError,
} from "../../../lib/errors";
import { generateMockReport } from "../../../lib/generation/mock";
import { generateLiveReport } from "../../../lib/generation/provider";
import { buildReportResponse } from "../../../lib/masking/buildReportResponse";
import { scanHighRisk } from "../../../lib/policy/high-risk";
import { PROMPT_VERSION } from "../../../lib/prompts/zwds-v1";
import { insertReport } from "../../../lib/reports/store";
import {
  SCHEMA_VERSION,
  validateAdvanced,
  validateBasic,
  validateComplete,
} from "../../../lib/schemas/loader";
import {
  validateBirth,
  type BirthInput,
  type ValidatedBirth,
} from "../../../lib/validation/birth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASIC_PERSIST_KEYS = [
  "report_id",
  "tier",
  "nickname",
  "birth_date",
  "birth_time",
  "time_unknown",
  "focus",
  "disclaimer",
  "overall",
  "work",
  "relationship",
  "action",
  "locked_fields",
] as const;

function jsonError(error: AppError): Response {
  return Response.json(
    { error_code: error.error_code, message: error.message },
    { status: error.status },
  );
}

function readBirthInput(body: Record<string, unknown>): BirthInput {
  const input: BirthInput = {
    nickname: typeof body.nickname === "string" ? body.nickname : "",
    birth_date: typeof body.birth_date === "string" ? body.birth_date : "",
  };

  if ("birth_time" in body) {
    const time = body.birth_time;
    if (time === null || typeof time === "string") {
      input.birth_time = time;
    }
  }

  if (typeof body.focus === "string") {
    input.focus = body.focus;
  }

  return input;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function splitCompleteForPersist(complete: Record<string, unknown>): {
  basic: Record<string, unknown>;
  advanced: Record<string, unknown>;
} {
  const basic: Record<string, unknown> = {};
  for (const key of BASIC_PERSIST_KEYS) {
    if (key in complete) {
      basic[key] = complete[key];
    }
  }
  basic.tier = "basic";
  return { basic, advanced: complete };
}

async function persistMaskedReport(args: {
  birth: ValidatedBirth;
  basic: Record<string, unknown>;
  advanced: Record<string, unknown>;
  model: string;
  provider: string;
}): Promise<Response> {
  const basicForPersist = {
    ...args.basic,
    nickname: args.birth.nickname,
    birth_date: args.birth.birth_date,
    birth_time: args.birth.birth_time,
    time_unknown: args.birth.time_unknown,
    focus: args.birth.focus,
  };

  try {
    await insertReport({
      nickname: args.birth.nickname,
      birth_date: args.birth.birth_date,
      birth_time: args.birth.birth_time,
      time_unknown: args.birth.time_unknown,
      focus: args.birth.focus,
      basic_json: basicForPersist,
      advanced_json: args.advanced,
      model: args.model,
      provider: args.provider,
      prompt_version: PROMPT_VERSION,
      schema_version: String(SCHEMA_VERSION),
      request_id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonError(error);
    }
    return jsonError(persistFailedError());
  }

  return Response.json(
    buildReportResponse({
      report: basicForPersist,
      advanced_json: args.advanced,
      meta: {
        status: "basic",
        generation_status: "success",
      },
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(schemaInvalidError());
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(schemaInvalidError());
  }

  const record = body as Record<string, unknown>;
  const birthResult = validateBirth(readBirthInput(record));
  if (!birthResult.ok) {
    return Response.json(birthResult.error, { status: 400 });
  }

  const birth = birthResult.value;
  const highRisk = scanHighRisk({
    nickname: birth.nickname,
    focus: birth.focus,
  });
  if (highRisk) {
    return Response.json(
      {
        error_code: "HIGH_RISK",
        category: highRisk.category,
        message: highRisk.message,
        disclaimer: DISCLAIMER,
      },
      { status: 200 },
    );
  }

  if (process.env.AI_PROVIDER === "openrouter") {
    let live: Awaited<ReturnType<typeof generateLiveReport>>;
    try {
      live = await generateLiveReport(birth);
    } catch (error) {
      if (error instanceof AppError) {
        return jsonError(error);
      }
      return jsonError(generationFailedError());
    }

    if (!live.ok) {
      if (live.kind === "transport") {
        return jsonError(generationFailedError());
      }
      return jsonError(schemaInvalidError());
    }

    const complete = asObject(live.complete);
    if (!validateComplete(complete).ok) {
      return jsonError(schemaInvalidError());
    }

    const { basic, advanced } = splitCompleteForPersist(complete);
    if (!validateBasic(basic).ok || !validateAdvanced(advanced).ok) {
      return jsonError(schemaInvalidError());
    }

    return persistMaskedReport({
      birth,
      basic,
      advanced,
      model: live.model,
      provider: "openrouter",
    });
  }

  let generated: ReturnType<typeof generateMockReport>;
  try {
    generated = generateMockReport();
  } catch (error) {
    if (error instanceof AppError) {
      return jsonError(error);
    }
    return jsonError(generationFailedError());
  }

  if (generated.mode === "invalid-json") {
    return jsonError(schemaInvalidError());
  }

  if (generated.mode === "schema-missing-field") {
    validateBasic(generated.basic);
    validateComplete(generated.basic);
    return jsonError(schemaInvalidError());
  }

  const basic = asObject(generated.basic);
  const advanced = asObject(generated.advanced);
  const complete = { ...basic, ...advanced };
  if (
    !validateBasic(basic).ok ||
    !validateAdvanced(advanced).ok ||
    !validateComplete(complete).ok
  ) {
    return jsonError(schemaInvalidError());
  }

  return persistMaskedReport({
    birth,
    basic,
    advanced,
    model: "mock",
    provider: "mock",
  });
}
