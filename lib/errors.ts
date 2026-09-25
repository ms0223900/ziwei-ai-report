import { ERROR_MESSAGES } from "./constants";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "SCHEMA_INVALID"
  | "GENERATION_FAILED"
  | "PERSIST_FAILED"
  | "HIGH_RISK"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_UNAVAILABLE";

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

export function updateFailedError(): AppError {
  return new AppError("PERSIST_FAILED", ERROR_MESSAGES.UPDATE_FAILED, 503);
}

export function unauthorizedError(): AppError {
  return new AppError("UNAUTHENTICATED", ERROR_MESSAGES.UNAUTHORIZED, 401);
}

export function loginRequiredError(): AppError {
  return new AppError("UNAUTHENTICATED", ERROR_MESSAGES.LOGIN_REQUIRED, 401);
}

export function forbiddenLockedError(): AppError {
  return new AppError("FORBIDDEN", ERROR_MESSAGES.ADVANCED_LOCKED, 403);
}

export function memberNotFoundError(): AppError {
  return new AppError("NOT_FOUND", ERROR_MESSAGES.MEMBER_NOT_FOUND, 404);
}

export function reportNotFoundError(): AppError {
  return new AppError("NOT_FOUND", ERROR_MESSAGES.REPORT_NOT_FOUND, 404);
}

export function alreadyUnlockedError(): AppError {
  return new AppError("CONFLICT", ERROR_MESSAGES.ALREADY_UNLOCKED, 409);
}

export function subscriptionInProgressError(): AppError {
  return new AppError("CONFLICT", ERROR_MESSAGES.SUBSCRIPTION_IN_PROGRESS, 409);
}

export function paymentUnavailableError(): AppError {
  return new AppError(
    "PAYMENT_UNAVAILABLE",
    ERROR_MESSAGES.PAYMENT_UNAVAILABLE,
    500,
  );
}

export function jsonError(error: AppError): Response {
  return Response.json(
    { error_code: error.error_code, message: error.message },
    { status: error.status },
  );
}
