import "server-only";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import basicSchema from "./report.basic.v1.json";
import advancedSchema from "./report.advanced.v1.json";
import completeSchema from "./report.complete.v1.json";

export const SCHEMA_VERSION = 1;

export type SchemaValidationResult =
  | { ok: true; data: unknown }
  | { ok: false; errors: ErrorObject[] };

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});

const validateBasicFn: ValidateFunction = ajv.compile(basicSchema);
const validateAdvancedFn: ValidateFunction = ajv.compile(advancedSchema);
const validateCompleteFn: ValidateFunction = ajv.compile(completeSchema);

function run(
  validate: ValidateFunction,
  data: unknown,
): SchemaValidationResult {
  if (validate(data)) {
    return { ok: true, data };
  }

  return { ok: false, errors: validate.errors ?? [] };
}

export function validateBasic(data: unknown): SchemaValidationResult {
  return run(validateBasicFn, data);
}

export function validateAdvanced(data: unknown): SchemaValidationResult {
  return run(validateAdvancedFn, data);
}

export function validateComplete(data: unknown): SchemaValidationResult {
  return run(validateCompleteFn, data);
}
