#!/usr/bin/env node
// 單元 8 探測小工具：以會員本人的 Cookie 呼叫既有 API，只印狀態碼與判讀欄位，留下 403／insufficient 等畫面看不到的證據。
// 用法：node scripts/unit8-checkpoint/probe.mjs <advanced|unlock> <report_id> --base $BASE --cookie "<瀏覽器複製的 Cookie 標頭>"
//   advanced → GET  /api/reports/{report_id}
//   unlock   → POST /api/reports/unlock-with-point（會真的扣點，只對 0 點帳號使用）
// 不讀 .env.local、不用 service role、不印進階內容本文與 Cookie、不寫檔。
import { pathToFileURL } from "node:url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBCOMMANDS = new Set(["advanced", "unlock"]);
// 回應裡只取這幾個欄位；進階內容本文（rationale 等）一律不印。
const PRINTED_FIELDS = ["ok", "reason", "unlock_mode", "error_code"];

function parseArgs(argv) {
  const args = { sub: argv[0], reportId: argv[1] };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--base") {
      args.base = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--cookie") {
      args.cookie = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function validate(args) {
  if (!SUBCOMMANDS.has(args.sub)) {
    return "子命令只能是 advanced 或 unlock。";
  }
  if (!args.reportId || !UUID_RE.test(args.reportId)) {
    return "report_id 必須是 UUID（取自 SQL 結尾的 SELECT）。";
  }
  if (!args.base) {
    return "缺少 --base（例如 https://ziwei-ai-report.vercel.app）。";
  }
  if (!args.cookie) {
    return "缺少 --cookie：請從瀏覽器開發者工具複製該會員請求的 Cookie 標頭。";
  }
  return null;
}

function buildRequest(args) {
  const base = args.base.replace(/\/+$/, "");
  if (args.sub === "advanced") {
    return {
      url: `${base}/api/reports/${args.reportId}`,
      init: { method: "GET", headers: { cookie: args.cookie } },
    };
  }
  return {
    url: `${base}/api/reports/unlock-with-point`,
    init: {
      method: "POST",
      headers: { cookie: args.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: args.reportId }),
    },
  };
}

async function readJson(response) {
  try {
    const body = await response.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export async function runProbe(argv, deps) {
  const args = parseArgs(argv);
  const problem = validate(args);
  if (problem) {
    deps.stderr(problem);
    return 1;
  }

  const { url, init } = buildRequest(args);
  let response;
  try {
    response = await deps.fetch(url, init);
  } catch (error) {
    deps.stderr(`請求失敗：${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const body = await readJson(response);
  deps.stdout(`status: ${response.status}`);
  for (const field of PRINTED_FIELDS) {
    if (field in body) {
      deps.stdout(`${field}: ${String(body[field])}`);
    }
  }
  return 0;
}

// Only run the CLI when executed directly, never when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runProbe(process.argv.slice(2), {
    fetch: globalThis.fetch,
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
  process.exit(code);
}
