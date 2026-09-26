#!/usr/bin/env node
// 產生可直接 curl 的綠界固定 Payload（ReturnURL／PeriodReturnURL），供課堂重播。
// 用法：node --env-file=.env.local scripts/ecpay-subscription-payload.mjs \
//   --kind period --mtn ZW20260918001 [--total-success-times 2] [--rtn-code 1] [--gwsr G1] [--simulate]
//   [--amount 19]   金額（簽章會跟著重算，用來測「金額不符」）
//   [--bad-mac]     送出錯誤的 CheckMacValue（用來測「簽章錯誤」）
// HashKey／HashIV 只從環境變數讀取；輸出只寫 stdout，不寫檔。
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

// lib/ecpay/check-mac.ts 有 `import "server-only"`，node 直接 import 會丟錯，所以在此重寫同一套演算法；
// scripts/ecpay-subscription-payload.test.ts 會與正式版逐字比對。
function ecpayUrlEncode(raw) {
  const encoded = encodeURIComponent(raw)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)
    .replace(/%20/g, "+")
    .toLowerCase();
  return encoded
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

export function computeCheckMacValue(params, hashKey, hashIV) {
  const entries = Object.entries(params).filter(
    ([key, value]) =>
      key.toLowerCase() !== "checkmacvalue" && value !== null && value !== undefined,
  );
  const query = entries
    .map(([key, value]) => [key, String(value)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  return createHash("sha256").update(ecpayUrlEncode(raw)).digest("hex").toUpperCase();
}

const MONTHLY_AMOUNT = "19";

function pad2(value) {
  return String(value).padStart(2, "0");
}

// ECPay dates are Asia/Taipei "yyyy/MM/dd HH:mm:ss".
function taipeiNow() {
  const local = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}/${pad2(local.getUTCMonth() + 1)}/${pad2(local.getUTCDate())} ${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}:${pad2(local.getUTCSeconds())}`;
}

function requireMtn(mtn) {
  if (!mtn) {
    throw new Error("缺少 --mtn（MerchantTradeNo）");
  }
}

const BAD_CHECK_MAC_VALUE = "0".repeat(64);

function sign(fields, hash, badMac) {
  return {
    ...fields,
    CheckMacValue: badMac
      ? BAD_CHECK_MAC_VALUE
      : computeCheckMacValue(fields, hash.hashKey, hash.hashIV),
  };
}

export function buildReturnPayload(
  {
    mtn,
    rtnCode = "1",
    simulate = false,
    paymentDate = taipeiNow(),
    tradeNo = "2609180000000001",
    amount = MONTHLY_AMOUNT,
    badMac = false,
  },
  hash,
) {
  requireMtn(mtn);
  return sign(
    {
      MerchantID: process.env.ECPAY_MERCHANT_ID || "3002607",
      MerchantTradeNo: mtn,
      RtnCode: String(rtnCode),
      RtnMsg: String(rtnCode) === "1" ? "交易成功" : "交易失敗",
      TradeNo: tradeNo,
      TradeAmt: String(amount),
      PaymentDate: paymentDate,
      PaymentType: "Credit_CreditCard",
      SimulatePaid: simulate ? "1" : "0",
    },
    hash,
    badMac,
  );
}

export function buildPeriodPayload(
  {
    mtn,
    totalSuccessTimes = 2,
    rtnCode = "1",
    gwsr = `G${Date.now()}`,
    simulate = false,
    processDate = taipeiNow(),
    amount = MONTHLY_AMOUNT,
    badMac = false,
  },
  hash,
) {
  requireMtn(mtn);
  return sign(
    {
      MerchantID: process.env.ECPAY_MERCHANT_ID || "3002607",
      MerchantTradeNo: mtn,
      RtnCode: String(rtnCode),
      RtnMsg: String(rtnCode) === "1" ? "交易成功" : "交易失敗",
      PeriodType: "M",
      Frequency: "1",
      ExecTimes: "12",
      Amount: String(amount),
      gwsr,
      ProcessDate: processDate,
      AuthCode: "777777",
      FirstAuthAmount: MONTHLY_AMOUNT,
      TotalSuccessTimes: String(totalSuccessTimes),
      SimulatePaid: simulate ? "1" : "0",
    },
    hash,
    badMac,
  );
}

function parseArgs(argv) {
  const args = { kind: "period", simulate: false, badMac: false };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--simulate") {
      args.simulate = true;
    } else if (key === "--bad-mac") {
      args.badMac = true;
    } else if (key === "--amount") {
      args.amount = next;
      i += 1;
    } else if (key === "--kind") {
      args.kind = next;
      i += 1;
    } else if (key === "--mtn") {
      args.mtn = next;
      i += 1;
    } else if (key === "--total-success-times") {
      args.totalSuccessTimes = Number(next);
      i += 1;
    } else if (key === "--rtn-code") {
      args.rtnCode = next;
      i += 1;
    } else if (key === "--gwsr") {
      args.gwsr = next;
      i += 1;
    }
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
  const args = parseArgs(process.argv.slice(2));
  try {
    const hash = { hashKey, hashIV };
    const payload =
      args.kind === "return" ? buildReturnPayload(args, hash) : buildPeriodPayload(args, hash);
    process.stdout.write(`${new URLSearchParams(payload).toString()}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Only run the CLI when executed directly, never when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
