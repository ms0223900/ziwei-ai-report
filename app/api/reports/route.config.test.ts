import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { maxDuration } from "./route";

describe("POST /api/reports duration config", () => {
  it("exports maxDuration of at least 60 seconds", () => {
    expect(maxDuration).toBeGreaterThanOrEqual(60);
  });

  it("sets the same floor on the Vercel function", () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as {
      functions?: Record<string, { maxDuration?: number }>;
    };
    expect(
      vercel.functions?.["app/api/reports/route.ts"]?.maxDuration,
    ).toBeGreaterThanOrEqual(60);
  });
});
