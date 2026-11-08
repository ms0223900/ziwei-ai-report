#!/usr/bin/env node
// 產生「付款通知」的測試資料（form-urlencoded 一行字串），給 4-3 驗證接收程式用。
// 用法：
//   node --env-file=.env.local scripts/ecpay-notify-payload.mjs --mtn <對帳編號> [選項]
// 選項：
//   --amount 99      通知上的金額（預設 99，與單次方案一致；簽章會跟著重算）
//   --rtn-code 1     結果代碼（1 成功；其他值＝不成功，例如 --rtn-code 0）
//   --trade-no X     綠界交易編號（預設固定值）
//   --simulate       標示為模擬付款（SimulatePaid=1）
//   --bad-mac        送出錯誤的檢查碼（用來測簽章錯）
// HashKey、HashIV 只從環境變數讀取，輸出只寫 stdout，不寫檔。
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// 與 lib/ecpay/check-mac.ts 同一套演算法。那支檔案有 `import "server-only"`，一般 node 腳本不能直接引用，所以在這裡重寫一份。
function ecpayUrlEncode(raw) {
  return encodeURIComponent(raw)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)
    .replace(/%20/g, "+")
    .toLowerCase()
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

export function computeCheckMacValue(params, hashKey, hashIV) {
  const query = Object.entries(params)
    .filter(([k, v]) => k.toLowerCase() !== "checkmacvalue" && v != null)
    .map(([k, v]) => [k, String(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  return createHash("sha256").update(ecpayUrlEncode(raw)).digest("hex").toUpperCase();
}

function taipeiNow() {
  const t = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}/${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}`;
}

export function buildPayload(
  { mtn, amount = "99", rtnCode = "1", tradeNo = "2611070000000001", simulate = false, badMac = false },
  { hashKey, hashIV },
) {
  if (!mtn) throw new Error("缺少 --mtn（對帳編號 MerchantTradeNo）");
  const fields = {
    MerchantID: process.env.ECPAY_MERCHANT_ID || "3002607",
    MerchantTradeNo: mtn,
    RtnCode: String(rtnCode),
    RtnMsg: String(rtnCode) === "1" ? "交易成功" : "交易失敗",
    TradeNo: tradeNo,
    TradeAmt: String(amount),
    PaymentDate: taipeiNow(),
    PaymentType: "Credit_CreditCard",
    SimulatePaid: simulate ? "1" : "0",
  };
  const CheckMacValue = badMac ? "0".repeat(64) : computeCheckMacValue(fields, hashKey, hashIV);
  return { ...fields, CheckMacValue };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === "--simulate") args.simulate = true;
    else if (k === "--bad-mac") args.badMac = true;
    else if (k === "--mtn") args.mtn = argv[++i];
    else if (k === "--amount") args.amount = argv[++i];
    else if (k === "--rtn-code") args.rtnCode = argv[++i];
    else if (k === "--trade-no") args.tradeNo = argv[++i];
  }
  return args;
}

function main() {
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIV = process.env.ECPAY_HASH_IV?.trim();
  if (!hashKey || !hashIV) {
    console.error("缺少 ECPAY_HASH_KEY／ECPAY_HASH_IV，請用 node --env-file=.env.local 執行。");
    process.exit(1);
  }
  try {
    const payload = buildPayload(parseArgs(process.argv.slice(2)), { hashKey, hashIV });
    process.stdout.write(`${new URLSearchParams(payload).toString()}\n`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

// 只在直接執行時跑 CLI；被測試 import 時不執行。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
