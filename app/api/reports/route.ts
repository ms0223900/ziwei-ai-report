import { DISCLAIMER } from "../../../lib/constants";
import {
  AppError,
  generationFailedError,
  persistFailedError,
  schemaInvalidError,
} from "../../../lib/errors";
import { generateMockReport } from "../../../lib/generation/mock";
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
} from "../../../lib/validation/birth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const basicForPersist = {
    ...basic,
    nickname: birth.nickname,
    birth_date: birth.birth_date,
    birth_time: birth.birth_time,
    time_unknown: birth.time_unknown,
    focus: birth.focus,
  };

  try {
    await insertReport({
      nickname: birth.nickname,
      birth_date: birth.birth_date,
      birth_time: birth.birth_time,
      time_unknown: birth.time_unknown,
      focus: birth.focus,
      basic_json: basicForPersist,
      advanced_json: advanced,
      model: "mock",
      provider: "mock",
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

  const masked = buildReportResponse({
    report: basicForPersist,
    advanced_json: advanced,
    meta: {
      status: "basic",
      generation_status: "success",
    },
  });

  return Response.json(masked);
}
