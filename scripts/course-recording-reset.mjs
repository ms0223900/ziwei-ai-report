#!/usr/bin/env node
/**
 * 單元 4 錄影重置 CLI（僅 demo／本機 Supabase）。
 *
 * 用法見 --help。請以：
 *   node --env-file=.env.local scripts/course-recording-reset.mjs …
 * 或 npm run course:recording-reset -- …
 *
 * 禁止對正式專案執行；本腳本實作／驗證期間也不得對 ziwei-demo 遠端下寫入指令。
 */
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

/** 課程文件記載的 ziwei-demo project ref（見 unit1／unit3 US 驗收說明）。 */
export const ZIWEI_DEMO_PROJECT_REF = "pjwzqyaglwhtugmouwmu";

export const UNLOCK_REPORT_LIFETIME_PLAN_ID = "unlock_report_lifetime";
export const PLAN_AMOUNT = 99;
export const PLAN_CURRENCY = "TWD";

/** 與 lib/payments/checkout-env 錄影開關一致：綠界打不到的 ReturnURL。 */
export const UNREACHABLE_RETURN_URL =
  "https://127.0.0.1:9/api/payments/ecpay/webhook";

const MAX_TRADE_NO_LENGTH = 20;
const MAX_TRADE_NO_ATTEMPTS = 32;

function printHelp(stream = process.stdout) {
  stream.write(`單元 4 錄影重置（ECPay／綠界）

用法：
  node --env-file=.env.local scripts/course-recording-reset.mjs reset [選項]
  node --env-file=.env.local scripts/course-recording-reset.mjs webhook <on|off|status>
  npm run course:recording-reset -- reset [選項]
  npm run course:recording-reset -- webhook off

reset 選項：
  --email <信箱>          測試會員 email（與 --user-id 至少一個）
  --user-id <uuid>        測試會員 auth user id
  --clear-orders          刪除該會員全部 orders（預設保留）
  --seed-pending <N>      預建 N 筆 pending 訂單（金額 99 TWD；4-3b 建議 4）
  --dry-run               只顯示計畫與守衛結果，不寫入資料庫
  -h, --help              顯示說明

安全預設：
  • 預設保留既有訂單（需明確 --clear-orders 才刪）
  • 僅允許本機 Supabase 或 ziwei-demo（project ref ${ZIWEI_DEMO_PROJECT_REF}）
  • SUPABASE_SERVICE_ROLE_KEY 只從環境讀取，永不印出

webhook 子命令（不改資料庫；預設不影響正式付款）：
  off     印出課 4-2「Webhook 不可達、訂單維持 pending」設定步驟
  on      印出課 4-3b「恢復可達 ReturnURL」設定步驟
  status  依目前環境變數判斷 webhook 是否標記為不可達

必要環境變數（名稱）：
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

錄影相關（webhook 開關，預設關閉＝正常付款行為）：
  ECPAY_WEBHOOK_UNREACHABLE=1   → 建單 ReturnURL 改為本機不可達位址
  ECPAY_RETURN_URL / APP_BASE_URL → 恢復 4-3b 時請設成綠界打得到的 HTTPS

注意：
  orders 遷移刻意未 grant delete 給 service_role。若 --clear-orders 權限不足，
  腳本會失敗並印出可在 demo SQL Editor 執行的 DELETE（請自行判斷）。
`);
}

export function parseArgs(argv) {
  const args = {
    command: "reset",
    email: null,
    userId: null,
    clearOrders: false,
    seedPending: 0,
    dryRun: false,
    help: false,
    webhookMode: null,
  };

  const rest = [...argv];
  if (rest[0] === "reset" || rest[0] === "webhook") {
    args.command = rest.shift();
  }
  if (args.command === "webhook") {
    const mode = rest.shift();
    if (mode === "on" || mode === "off" || mode === "status") {
      args.webhookMode = mode;
    } else if (mode === "-h" || mode === "--help") {
      args.help = true;
    } else {
      args.webhookMode = mode ?? null;
    }
  }

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === "-h" || token === "--help") {
      args.help = true;
    } else if (token === "--clear-orders") {
      args.clearOrders = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--email") {
      args.email = rest[++i] ?? null;
    } else if (token === "--user-id") {
      args.userId = rest[++i] ?? null;
    } else if (token === "--seed-pending") {
      const raw = rest[++i];
      const n = Number.parseInt(String(raw), 10);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`--seed-pending 必須為非負整數，收到：${raw}`);
      }
      args.seedPending = n;
    } else {
      throw new Error(`未知參數：${token}`);
    }
  }
  return args;
}

export function isWebhookUnreachableFlag(env = process.env) {
  const raw = env.ECPAY_WEBHOOK_UNREACHABLE?.trim() ?? "";
  return raw === "1" || raw.toLowerCase() === "true";
}

/**
 * Fail-closed：只允許本機或 ziwei-demo。
 * @returns {"local"|"ziwei-demo"}
 */
export function assertDemoOrLocalSupabaseUrl(url) {
  if (!url || typeof url !== "string" || !url.trim()) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL，拒絕執行。");
  }
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 不是合法 URL，拒絕執行。");
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return "local";
  }

  const refMatch = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
  if (refMatch && refMatch[1] === ZIWEI_DEMO_PROJECT_REF) {
    return "ziwei-demo";
  }
  if (host.includes("ziwei-demo")) {
    return "ziwei-demo";
  }

  throw new Error(
    `拒絕執行：目標不是本機或 ziwei-demo（host=${host}）。` +
      `允許的 project ref 僅 ${ZIWEI_DEMO_PROJECT_REF}。`,
  );
}

/** 與 lib/payments/merchant-trade-no.ts 同一規則（腳本無法 import server-only）。 */
export function generateMerchantTradeNo(options = {}) {
  const taken = options.taken;
  const entropy =
    options.entropy ??
    (() => {
      const time = Date.now().toString(36);
      const rand = Math.random().toString(36).slice(2, 12);
      return `${time}${rand}`;
    });
  const seenFull = new Set();

  for (let attempt = 0; attempt < MAX_TRADE_NO_ATTEMPTS; attempt += 1) {
    const full = String(entropy()).replace(/[^A-Za-z0-9]/g, "");
    if (!full || seenFull.has(full)) {
      continue;
    }
    seenFull.add(full);
    const tradeNo = full.slice(0, MAX_TRADE_NO_LENGTH);
    if (!tradeNo) {
      continue;
    }
    if (taken?.has(tradeNo)) {
      continue;
    }
    return tradeNo;
  }
  throw new Error("無法產生唯一交易編號。");
}

export function redactSecrets(text, serviceRoleKey) {
  if (!text) return text;
  let out = String(text);
  if (serviceRoleKey && serviceRoleKey.length > 0) {
    out = out.split(serviceRoleKey).join("[REDACTED_SERVICE_ROLE_KEY]");
  }
  return out;
}

function createServiceClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function resolveMember(client, { email, userId }) {
  if (userId) {
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error) {
      throw new Error(`依 user id 查詢失敗：${error.message}`);
    }
    const user = data?.user;
    if (!user) {
      throw new Error(`找不到 user id：${userId}`);
    }
    if (email && user.email && user.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error(
        `email 與 user id 不符（id 對應 ${user.email ?? "(無 email)"}）。`,
      );
    }
    return user;
  }

  const target = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`依 email 查詢失敗：${error.message}`);
    }
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) {
      return found;
    }
    if (users.length < perPage) {
      break;
    }
  }
  throw new Error(`找不到 email：${email}`);
}

async function lockProfile(client, user, dryRun) {
  const { data: existing, error: readError } = await client
    .from("profiles")
    .select("user_id, access_status, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) {
    throw new Error(`讀取 profiles 失敗：${readError.message}`);
  }

  if (dryRun) {
    return {
      access_status: "locked",
      existed: Boolean(existing),
      previous: existing?.access_status ?? null,
    };
  }

  if (!existing) {
    const displayName = (user.email ?? "member").split("@")[0] || "member";
    const { error: insertError } = await client.from("profiles").insert({
      user_id: user.id,
      display_name: displayName,
      access_status: "locked",
      points_balance: 0,
      subscription_status: "none",
    });
    if (insertError) {
      throw new Error(`建立 profiles 失敗：${insertError.message}`);
    }
  } else {
    const { error: updateError } = await client
      .from("profiles")
      .update({ access_status: "locked" })
      .eq("user_id", user.id);
    if (updateError) {
      throw new Error(`更新 access_status 失敗：${updateError.message}`);
    }
  }

  const { data: after, error: afterError } = await client
    .from("profiles")
    .select("access_status")
    .eq("user_id", user.id)
    .single();
  if (afterError) {
    throw new Error(`確認 profiles 失敗：${afterError.message}`);
  }
  return {
    access_status: after.access_status,
    existed: Boolean(existing),
    previous: existing?.access_status ?? null,
  };
}

async function listOrders(client, userId) {
  const { data, error } = await client
    .from("orders")
    .select("id, merchant_trade_no, amount, status, plan_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`讀取 orders 失敗：${error.message}`);
  }
  return data ?? [];
}

async function clearOrders(client, userId, dryRun) {
  if (dryRun) {
    return { cleared: true, dryRun: true };
  }
  const { error } = await client.from("orders").delete().eq("user_id", userId);
  if (error) {
    const hint = `
orders 遷移未 grant DELETE 給 service_role 時會出現此錯誤。
可在「demo／本機」SQL Editor 手動執行（請自行確認目標專案）：
  delete from public.orders where user_id = '${userId}';
或一次性（僅 demo）grant：
  grant delete on table public.orders to service_role;
`;
    throw new Error(`清除 orders 失敗：${error.message}${hint}`);
  }
  return { cleared: true, dryRun: false };
}

async function seedPendingOrders(client, userId, count, dryRun) {
  if (count <= 0) {
    return [];
  }

  const existing = await listOrders(client, userId);
  const taken = new Set(existing.map((row) => row.merchant_trade_no));
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const merchantTradeNo = generateMerchantTradeNo({ taken });
    taken.add(merchantTradeNo);
    rows.push({
      user_id: userId,
      plan_id: UNLOCK_REPORT_LIFETIME_PLAN_ID,
      merchant_trade_no: merchantTradeNo,
      amount: PLAN_AMOUNT,
      currency: PLAN_CURRENCY,
      status: "pending",
      trade_no: null,
      payment_date: null,
    });
  }

  if (dryRun) {
    return rows.map((row) => ({
      merchant_trade_no: row.merchant_trade_no,
      amount: row.amount,
      status: row.status,
    }));
  }

  const { error } = await client.from("orders").insert(rows);
  if (error) {
    throw new Error(`預建 pending 訂單失敗：${error.message}`);
  }
  return rows.map((row) => ({
    merchant_trade_no: row.merchant_trade_no,
    amount: row.amount,
    status: row.status,
  }));
}

function formatAccessLabel(status) {
  if (status === "locked") return "未解鎖（locked）";
  if (status === "unlocked") return "已解鎖（unlocked）";
  return String(status ?? "未知");
}

export function formatZhSummary({
  targetLabel,
  supabaseKind,
  dryRun,
  profile,
  orders,
  clearOrders: didClear,
  seeded,
}) {
  const lines = [];
  lines.push("—— 錄影前檢查清單 ——");
  if (dryRun) {
    lines.push("模式：dry-run（未寫入）");
  }
  lines.push(`目標專案：${supabaseKind}`);
  lines.push(`會員：${targetLabel}`);
  lines.push(`權益狀態：${formatAccessLabel(profile.access_status)}`);
  if (profile.previous && profile.previous !== profile.access_status) {
    lines.push(`（先前：${formatAccessLabel(profile.previous)}）`);
  }
  if (didClear) {
    lines.push("訂單：已要求清除該會員全部 orders");
  } else {
    lines.push("訂單：保留既有（未加 --clear-orders）");
  }
  if (seeded.length > 0) {
    lines.push(`本次預建 pending：${seeded.length} 筆`);
  }
  lines.push("");
  lines.push("相關訂單：");
  if (orders.length === 0) {
    lines.push("  （無）");
  } else {
    for (const order of orders) {
      lines.push(
        `  • 編號 ${order.merchant_trade_no}｜金額 ${order.amount}｜狀態 ${order.status}`,
      );
    }
  }
  lines.push("——");
  return `${lines.join("\n")}\n`;
}

function printWebhookHelp(mode, env = process.env) {
  const unreachable = isWebhookUnreachableFlag(env);
  const returnUrl = env.ECPAY_RETURN_URL?.trim() || "(未設，將回退 APP_BASE_URL)";
  const appBase = env.APP_BASE_URL?.trim() || "(未設)";

  if (mode === "status") {
    process.stdout.write(`目前環境解讀：
  ECPAY_WEBHOOK_UNREACHABLE → ${unreachable ? "開啟（建單 ReturnURL 將不可達）" : "關閉（正常 ReturnURL）"}
  ECPAY_RETURN_URL → ${returnUrl}
  APP_BASE_URL → ${appBase}
`);
    return;
  }

  if (mode === "off") {
    process.stdout.write(`【課 4-2】讓 Webhook／ReturnURL 不可達（訂單維持 pending）

建議（不改正式預設付款行為；僅錄影環境）：
  1. 在 .env.local 設定：
       ECPAY_WEBHOOK_UNREACHABLE=1
  2. 重啟 next dev／重新部署預覽，使建單讀到新 env
  3. （可選）暫停 cloudflared／Tunnel，或暫時不要把 ECPAY_RETURN_URL 指到可達網域
  4. 建單後綠界即使付款，也打不到 webhook → orders 保持 pending、會員保持 locked

程式行為：checkout 會把 ReturnURL 設成 ${UNREACHABLE_RETURN_URL}
（僅當 ECPAY_WEBHOOK_UNREACHABLE=1；預設未設＝正式／一般開發行為不變）
`);
    return;
  }

  if (mode === "on") {
    process.stdout.write(`【課 4-3b】恢復 Webhook／ReturnURL 可達

建議：
  1. 在 .env.local 移除 ECPAY_WEBHOOK_UNREACHABLE，或設為 0
  2. 設定綠界打得到的 HTTPS，例如：
       ECPAY_RETURN_URL=https://你的網域/api/payments/ecpay/webhook
       ECPAY_CLIENT_BACK_URL=https://你的網域/orders/processing
     或只設 APP_BASE_URL=https://你的網域（後端會組路徑）
  3. 本機請用 cloudflared（禁止 ngrok），見 docs/user-stories/ziwei-unit4-ecpay-sandbox-unlock/howto-ecpay-sandbox.md
  4. 重啟 next／確認 Tunnel 仍在跑後再錄 4-3b
`);
    return;
  }

  throw new Error("webhook 子命令僅支援 on｜off｜status");
}

export async function runReset(args, env = process.env, deps = {}) {
  if (!args.email && !args.userId) {
    throw new Error("請提供 --email 與／或 --user-id。");
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!serviceRoleKey) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY，拒絕執行。");
  }

  const supabaseKind = assertDemoOrLocalSupabaseUrl(url);
  const client =
    deps.createClient?.(url, serviceRoleKey) ??
    createServiceClient(url, serviceRoleKey);

  const user = await resolveMember(client, {
    email: args.email,
    userId: args.userId,
  });
  const targetLabel = `${user.email ?? "(無 email)"} / ${user.id}`;

  if (args.dryRun) {
    process.stdout.write(
      `dry-run：將對 ${supabaseKind} 重置 ${targetLabel}` +
        `${args.clearOrders ? "（清除訂單）" : "（保留訂單）"}` +
        `${args.seedPending ? `，預建 ${args.seedPending} 筆 pending` : ""}。\n`,
    );
  }

  const profile = await lockProfile(client, user, args.dryRun);

  if (args.clearOrders) {
    await clearOrders(client, user.id, args.dryRun);
  }

  const seeded = await seedPendingOrders(
    client,
    user.id,
    args.seedPending,
    args.dryRun,
  );

  let orders;
  if (args.dryRun) {
    const current = args.clearOrders ? [] : await listOrders(client, user.id);
    orders = [
      ...current.map((row) => ({
        merchant_trade_no: row.merchant_trade_no,
        amount: row.amount,
        status: row.status,
      })),
      ...seeded,
    ];
  } else {
    orders = await listOrders(client, user.id);
  }

  return formatZhSummary({
    targetLabel,
    supabaseKind,
    dryRun: args.dryRun,
    profile,
    orders,
    clearOrders: args.clearOrders,
    seeded,
  });
}

async function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    printHelp(process.stderr);
    process.exitCode = 1;
    return;
  }

  if (args.help || argv.length === 0) {
    printHelp();
    return;
  }

  try {
    if (args.command === "webhook") {
      printWebhookHelp(args.webhookMode);
      return;
    }

    const summary = await runReset(args, process.env);
    process.stdout.write(summary);
  } catch (error) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    const message = redactSecrets(
      error instanceof Error ? error.message : String(error),
      key,
    );
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
