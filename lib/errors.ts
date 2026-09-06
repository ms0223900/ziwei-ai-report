import { ERROR_MESSAGES } from "./constants";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "SCHEMA_INVALID"
  | "GENERATION_FAILED"
  | "PERSIST_FAILED"
  | "HIGH_RISK";

export class AppError extends Error {
  readonly error_code: ErrorCode;
  readonly status: number;

  constructor(error_code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.error_code = error_code;
    this.status = status;
  }
}

export function validationError(message: string): AppError {
  return new AppError("VALIDATION_ERROR", message, 400);
}

export function schemaInvalidError(): AppError {
  return new AppError("SCHEMA_INVALID", ERROR_MESSAGES.SCHEMA_INVALID, 422);
}

export function generationFailedError(): AppError {
  return new AppError("GENERATION_FAILED", ERROR_MESSAGES.GENERATION_FAILED, 502);
}

export function persistFailedError(): AppError {
  return new AppError("PERSIST_FAILED", ERROR_MESSAGES.PERSIST_FAILED, 503);
}
