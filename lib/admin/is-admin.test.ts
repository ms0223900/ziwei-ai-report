import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAdminUser } from "./is-admin";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("isAdminUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts ids in a comma-separated list, ignoring whitespace", () => {
    vi.stubEnv("ADMIN_USER_IDS", ` ${A} ,  ${B},`);

    expect(isAdminUser(A)).toBe(true);
    expect(isAdminUser(B)).toBe(true);
    expect(isAdminUser("cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBe(false);
  });

  it("treats an empty value as having no admins", () => {
    vi.stubEnv("ADMIN_USER_IDS", "");

    expect(isAdminUser(A)).toBe(false);
    expect(isAdminUser("")).toBe(false);
  });

  it("rejects a missing user id", () => {
    vi.stubEnv("ADMIN_USER_IDS", A);

    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('is server-only and never reads a NEXT_PUBLIC_ variant', () => {
    const source = readFileSync(join(process.cwd(), "lib/admin/is-admin.ts"), "utf8");
    expect(source).toMatch(/^import "server-only";/m);
    expect(source).not.toContain("NEXT_PUBLIC_");
  });
});
