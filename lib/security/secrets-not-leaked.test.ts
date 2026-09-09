import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const SECRET_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
] as const;

function parseEnvExample(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function walkFiles(dir: string, acc: string[]): string[] {
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".git" ||
      name === ".next" ||
      name === "coverage"
    ) {
      continue;
    }
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function collectFiles(dir: string, acc: string[]): string[] {
  if (!existsSync(dir)) {
    return acc;
  }
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

describe("secrets stay off the public surface", () => {
  it("keeps secret slots empty in .env.example and never uses NEXT_PUBLIC_ for them", () => {
    const example = parseEnvExample(
      readFileSync(path.join(ROOT, ".env.example"), "utf8"),
    );

    for (const key of SECRET_ENV_KEYS) {
      expect(example).toHaveProperty(key);
      expect(example[key]).toBe("");
      expect(example[`NEXT_PUBLIC_${key}`]).toBeUndefined();
    }

    expect(example.NEXT_PUBLIC_OPENROUTER_API_KEY).toBeUndefined();
    expect(example.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(example.NEXT_PUBLIC_ECPAY_HASH_KEY).toBeUndefined();
    expect(example.NEXT_PUBLIC_ECPAY_HASH_IV).toBeUndefined();
  });

  it("does not read secret keys from NEXT_PUBLIC_ env in app source", () => {
    const roots = ["app", "lib", "components"].map((dir) =>
      path.join(ROOT, dir),
    );
    const files = roots.flatMap((dir) =>
      existsSync(dir) ? walkFiles(dir, []) : [],
    ).filter(
      (file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"),
    );

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(
        /process\.env\.NEXT_PUBLIC_(OPENROUTER|SUPABASE_SERVICE_ROLE|ECPAY)/,
      );
    }
  });

  it("has no in-app Mock/Live provider console", () => {
    const uiRoot = path.join(ROOT, "components");
    const files = existsSync(uiRoot) ? walkFiles(uiRoot, []) : [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/AI_PROVIDER/);
      expect(text, file).not.toMatch(/openrouter\.ai/);
    }
  });

  it("does not leak secret identifiers into the client bundle when built", () => {
    const staticDir = path.join(ROOT, ".next/static");
    if (!existsSync(staticDir)) {
      return;
    }

    const files = collectFiles(staticDir, []);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain("OPENROUTER_API_KEY");
      expect(text, file).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(text, file).not.toContain("ECPAY_HASH_KEY");
      expect(text, file).not.toContain("ECPAY_HASH_IV");
    }
  });
});
