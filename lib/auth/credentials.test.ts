import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES } from "../constants";
import {
  mapLoginAuthError,
  mapRegisterAuthError,
  validateAuthFields,
  validateDisplayName,
} from "./credentials";

describe("validateAuthFields", () => {
  it("rejects blank or invalid email with the spec sentence", () => {
    expect(validateAuthFields({ email: "", password: "abcdef" })).toEqual({
      ok: false,
      field: "email",
      message: AUTH_MESSAGES.INVALID_EMAIL,
    });
    expect(
      validateAuthFields({ email: "not-an-email", password: "abcdef" }),
    ).toEqual({
      ok: false,
      field: "email",
      message: AUTH_MESSAGES.INVALID_EMAIL,
    });
  });

  it("rejects a short password with the spec sentence", () => {
    expect(
      validateAuthFields({ email: "yuan@example.com", password: "123" }),
    ).toEqual({
      ok: false,
      field: "password",
      message: AUTH_MESSAGES.PASSWORD_TOO_SHORT,
    });
  });

  it("accepts a trimmed email and a long enough password", () => {
    expect(
      validateAuthFields({ email: " yuan@example.com ", password: "abcdef" }),
    ).toEqual({
      ok: true,
      email: "yuan@example.com",
      password: "abcdef",
    });
  });
});

describe("auth error mapping", () => {
  it("maps duplicate signup to the login hint and never says the mailbox is missing", () => {
    expect(mapRegisterAuthError("User already registered")).toBe(
      AUTH_MESSAGES.EMAIL_TAKEN,
    );
    expect(mapLoginAuthError()).toBe(AUTH_MESSAGES.INVALID_CREDENTIALS);
    expect(mapLoginAuthError()).not.toContain("不存在");
  });
});

describe("validateDisplayName", () => {
  it("rejects blank names and keeps trimmed values", () => {
    expect(validateDisplayName("   ")).toEqual({
      ok: false,
      message: AUTH_MESSAGES.DISPLAY_NAME_BLANK,
    });
    expect(validateDisplayName(" 小園 ")).toEqual({
      ok: true,
      value: "小園",
    });
  });
});
