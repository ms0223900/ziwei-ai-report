import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function matcherStringLiterals(source: string): string[] {
  const block = source.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const withoutComments = block
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return [...withoutComments.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) => m[1]);
}

describe("SSR session wiring", () => {
  it("writes cookies with getAll/setAll and authorizes with getUser", () => {
    const session = readSource("lib/supabase/session.ts");
    const update = readSource("lib/supabase/update-session.ts");

    expect(session).toContain("getAll");
    expect(session).toContain("setAll");
    expect(session).toContain("getUser");
    expect(session).not.toMatch(/auth\.getSession\(/);

    expect(update).toContain("getAll");
    expect(update).toContain("setAll");
    expect(update).toContain("getUser");
    expect(update).not.toMatch(/redirect\(/);
    expect(update).not.toMatch(/auth\.getSession\(/);
  });

  it("keeps the browser client off the service-role env module", () => {
    const client = readSource("lib/supabase/client.ts");
    expect(client).toContain("createBrowserClient");
    expect(client).not.toContain("./env");
    expect(client).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(client).not.toContain("createServiceRoleClient");
  });

  it("does not force login on /", () => {
    const proxy = readSource("proxy.ts");
    expect(proxy).toContain("updateSession");
    expect(proxy).not.toMatch(/redirect\(/);
  });

  it("excludes the live ECPay webhook path from matcher literals", () => {
    const literals = matcherStringLiterals(readSource("proxy.ts"));
    expect(literals.some((pattern) => pattern.includes("api/payments/ecpay/webhook"))).toBe(
      true,
    );
  });
});
