import { afterEach, describe, expect, it } from "vitest";
import {
  getSupabasePublicEnv,
  isSupabasePublicEnvMissingError,
  readSupabasePublicEnv,
  SUPABASE_PUBLIC_ENV_MISSING_ERROR,
} from "./public-env";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (ORIGINAL_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  }
  if (ORIGINAL_ANON === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_ANON;
  }
});

describe("readSupabasePublicEnv", () => {
  it("returns null when url or anon key is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(readSupabasePublicEnv()).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(readSupabasePublicEnv()).toBeNull();
  });

  it("returns url and anon key without reading the service role", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(readSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("throws a Traditional Chinese error when required public env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabasePublicEnv()).toThrow(
      SUPABASE_PUBLIC_ENV_MISSING_ERROR,
    );
    expect(
      isSupabasePublicEnvMissingError(new Error(SUPABASE_PUBLIC_ENV_MISSING_ERROR)),
    ).toBe(true);
    expect(isSupabasePublicEnvMissingError(new Error("network down"))).toBe(
      false,
    );
  });
});
