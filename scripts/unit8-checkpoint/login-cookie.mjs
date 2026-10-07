#!/usr/bin/env node
// 單元 8：以測試帳號登入，把 Supabase session cookie 寫成權限 600 的暫存檔，給 probe.mjs 與 curl 讀取。
// 用法：CHECKPOINT_PASSWORD=… node --env-file=.env.local scripts/unit8-checkpoint/login-cookie.mjs \
//   --email checkpoint.a@aaa.com --out /tmp/cookie-a.txt
// 只用 anon key；stdout 只印檔案路徑與 cookie 數量，不印 cookie 值或密碼。
import { writeFile as fsWriteFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createBrowserClient } from "@supabase/ssr";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--email") {
      args.email = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--out") {
      args.out = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function validate(args, env) {
  if (!args.email) {
    return "缺少 --email（例如 checkpoint.a@aaa.com）。";
  }
  if (!args.out) {
    return "缺少 --out（cookie 暫存檔路徑，例如 /tmp/cookie-a.txt）。";
  }
  if (!env.CHECKPOINT_PASSWORD) {
    return "缺少 CHECKPOINT_PASSWORD 環境變數（測試帳號密碼）。";
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "缺少 NEXT_PUBLIC_SUPABASE_URL／NEXT_PUBLIC_SUPABASE_ANON_KEY，請用 node --env-file=.env.local 執行。";
  }
  return null;
}

export async function runLogin(argv, deps) {
  const args = parseArgs(argv);
  const problem = validate(args, deps.env);
  if (problem) {
    deps.stderr(problem);
    return 1;
  }

  // 記憶體 cookie jar：登入後 @supabase/ssr 會把 session（可能切成多段）寫進來。
  const jar = new Map();
  const client = deps.createClient(
    deps.env.NEXT_PUBLIC_SUPABASE_URL,
    deps.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      isSingleton: false,
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => {
          for (const { name, value } of cookies) {
            if (value) {
              jar.set(name, value);
            } else {
              jar.delete(name);
            }
          }
        },
      },
    },
  );

  const { error } = await client.auth.signInWithPassword({
    email: args.email,
    password: deps.env.CHECKPOINT_PASSWORD,
  });
  if (error) {
    deps.stderr(`登入失敗：${error.message}`);
    return 1;
  }

  const header = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  await deps.writeFile(args.out, header, { mode: 0o600 });
  deps.stdout(`已寫入 ${args.out}（${jar.size} 個 cookie）`);
  return 0;
}

// Only run the CLI when executed directly, never when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runLogin(process.argv.slice(2), {
    env: process.env,
    createClient: createBrowserClient,
    writeFile: fsWriteFile,
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  });
  process.exit(code);
}
