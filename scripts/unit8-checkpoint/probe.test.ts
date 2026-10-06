import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runProbe } from "./probe.mjs";

const BASE = "https://ziwei-ai-report.vercel.app";
const COOKIE = "sb-test-auth-token=secret-cookie-value";
const REPORT_ID = "11111111-2222-4333-8444-555555555555";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setup(response?: Response) {
  const fetch = vi.fn(async () => response ?? jsonResponse(200, {}));
  const out: string[] = [];
  const err: string[] = [];
  const deps = {
    fetch,
    stdout: (line: string) => out.push(line),
    stderr: (line: string) => err.push(line),
  };
  return { fetch, out, err, deps };
}

const args = (sub: string, id = REPORT_ID, extra: string[] = ["--cookie", COOKIE]) => [
  sub,
  id,
  "--base",
  BASE,
  ...extra,
];

describe("unit 8 probe.mjs (US-002)", () => {
  it("advanced sends GET /api/reports/{id} with the cookie header", async () => {
    const { fetch, deps } = setup(jsonResponse(200, { unlock_mode: "subscription" }));

    const code = await runProbe(args("advanced"), deps);

    expect(code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/reports/${REPORT_ID}`);
    expect((init.method ?? "GET").toUpperCase()).toBe("GET");
    expect(new Headers(init.headers).get("cookie")).toBe(COOKIE);
  });

  it("unlock sends POST /api/reports/unlock-with-point with report_id in the body", async () => {
    const { fetch, deps } = setup(
      jsonResponse(200, { ok: false, reason: "insufficient", points_balance: 0 }),
    );

    await runProbe(args("unlock"), deps);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/api/reports/unlock-with-point`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ report_id: REPORT_ID });
  });

  it("rejects an unknown subcommand without sending a request", async () => {
    const { fetch, err, deps } = setup();

    const code = await runProbe(args("delete"), deps);

    expect(code).not.toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(err.join("\n")).toMatch(/[一-鿿]/);
  });

  it("exits non-zero in Traditional Chinese when --cookie is missing", async () => {
    const { fetch, err, deps } = setup();

    const code = await runProbe(args("advanced", REPORT_ID, []), deps);

    expect(code).not.toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(err.join("\n")).toMatch(/Cookie|cookie/);
    expect(err.join("\n")).toMatch(/[一-鿿]/);
  });

  it("exits non-zero in Traditional Chinese when report_id is not a UUID", async () => {
    const { fetch, err, deps } = setup();

    const code = await runProbe(args("advanced", "not-a-uuid"), deps);

    expect(code).not.toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(err.join("\n")).toMatch(/[一-鿿]/);
  });

  it("prints only status and ok/reason/unlock_mode on 200, never the advanced body", async () => {
    const { out, deps } = setup(
      jsonResponse(200, {
        unlock_mode: "subscription",
        advanced: {
          rationale: "測試析理-SECRET",
          action_plan: ["第 1 天-SECRET"],
          path_compare: { path_a: "甲-SECRET" },
        },
      }),
    );

    await runProbe(args("advanced"), deps);

    const printed = out.join("\n");
    expect(printed).toContain("200");
    expect(printed).toContain("subscription");
    expect(printed).not.toMatch(/SECRET|rationale|action_plan|path_compare/);
  });

  it("prints status and error_code on 403", async () => {
    const { out, deps } = setup(
      jsonResponse(403, { error_code: "forbidden", message: "沒有權限" }),
    );

    await runProbe(args("advanced"), deps);

    const printed = out.join("\n");
    expect(printed).toContain("403");
    expect(printed).toContain("forbidden");
  });

  it("prints ok and reason for the unlock API", async () => {
    const { out, deps } = setup(
      jsonResponse(200, { ok: false, reason: "insufficient", points_balance: 0 }),
    );

    await runProbe(args("unlock"), deps);

    const printed = out.join("\n");
    expect(printed).toContain("false");
    expect(printed).toContain("insufficient");
  });

  it("never prints the cookie value", async () => {
    const { out, err, deps } = setup(jsonResponse(403, { error_code: "forbidden" }));

    await runProbe(args("advanced"), deps);
    await runProbe(args("advanced", "bad"), deps);

    expect([...out, ...err].join("\n")).not.toContain("secret-cookie-value");
  });

  it("does not import any file-writing API", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "probe.mjs"),
      "utf8",
    );

    expect(source).not.toMatch(/node:fs|from "fs"|writeFile|createWriteStream/);
  });
});
