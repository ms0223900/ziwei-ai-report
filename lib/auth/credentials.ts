import {
  AUTH_MESSAGES,
  AUTH_PASSWORD_MIN_LENGTH,
} from "../constants";
import { isSupabasePublicEnvMissingError } from "../supabase/public-env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthFieldError = {
  ok: false;
  field: "email" | "password";
  message: string;
};

export function validateAuthFields(input: {
  email: string;
  password: string;
}): AuthFieldError | { ok: true; email: string; password: string } {
  const email = input.email.trim();
  if (!email || !EMAIL_RE.test(email)) {
    return {
      ok: false,
      field: "email",
      message: AUTH_MESSAGES.INVALID_EMAIL,
    };
  }
  if (!input.password || input.password.length < AUTH_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      field: "password",
      message: AUTH_MESSAGES.PASSWORD_TOO_SHORT,
    };
  }
  return { ok: true, email, password: input.password };
}

export function mapRegisterAuthError(message: string | undefined): string {
  const lower = (message ?? "").toLowerCase();
  if (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists")
  ) {
    return AUTH_MESSAGES.EMAIL_TAKEN;
  }
  return AUTH_MESSAGES.REGISTER_FAILED;
}

export function mapLoginAuthError(): string {
  return AUTH_MESSAGES.INVALID_CREDENTIALS;
}

export function mapAuthClientStartError(
  mode: "login" | "register",
  error: unknown,
): string {
  if (isSupabasePublicEnvMissingError(error)) {
    return AUTH_MESSAGES.PUBLIC_ENV_MISSING;
  }
  return mode === "register"
    ? AUTH_MESSAGES.REGISTER_FAILED
    : AUTH_MESSAGES.INVALID_CREDENTIALS;
}

export function validateDisplayName(
  raw: string,
): { ok: false; message: string } | { ok: true; value: string } {
  const value = raw.trim();
  if (value.length < 1) {
    return { ok: false, message: AUTH_MESSAGES.DISPLAY_NAME_BLANK };
  }
  return { ok: true, value };
}
