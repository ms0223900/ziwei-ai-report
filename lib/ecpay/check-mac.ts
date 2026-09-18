/**
 * 綠界 CheckMacValue：建單與 Webhook 共用。Hash 由呼叫端傳入（應來自 server env）。
 */
import "server-only";
import { createHash, timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";

export type CheckMacParams = Record<string, string | number | null | undefined>;

function asParamMap(params: CheckMacParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.toLowerCase() === "checkmacvalue") {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    out[key] = String(value);
  }
  return out;
}

/** 綠界 .NET／官方 PHP：urlencode 後小寫，再還原 -_.!*() */
export function ecpayUrlEncode(raw: string): string {
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

export function computeCheckMacValue(
  params: CheckMacParams,
  hashKey: string,
  hashIV: string,
): string {
  const map = asParamMap(params);
  const query = Object.keys(map)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => `${key}=${map[key]}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${query}&HashIV=${hashIV}`;
  const encoded = ecpayUrlEncode(raw);
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export function verifyCheckMacValue(
  params: CheckMacParams,
  checkMacValue: string,
  hashKey: string,
  hashIV: string,
): boolean {
  const expected = computeCheckMacValue(params, hashKey, hashIV);
  const actual = checkMacValue.trim().toUpperCase();
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqualUtf8(expected, actual);
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return cryptoTimingSafeEqual(left, right);
}

export function readEcpayHashFromEnv(): { hashKey: string; hashIV: string } | null {
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIV = process.env.ECPAY_HASH_IV?.trim();
  if (!hashKey || !hashIV) {
    return null;
  }
  return { hashKey, hashIV };
}
