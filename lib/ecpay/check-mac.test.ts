import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeCheckMacValue, verifyCheckMacValue } from "./check-mac";

/** Fixture hashes for tests only — not live ECPay values, not git secrets. */
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";

const checkoutParams: Record<string, string> = {
  MerchantID: "2000132",
  MerchantTradeNo: "TEST20260918001",
  MerchantTradeDate: "2026/09/18 12:00:00",
  PaymentType: "aio",
  TotalAmount: "99",
  TradeDesc: "ziwei unlock demo",
  ItemName: "ziwei unlock demo",
  ReturnURL: "https://example.test/api/payments/ecpay/webhook",
  ChoosePayment: "Credit",
  EncryptType: "1",
  CheckMacValue: "SHOULD_BE_STRIPPED",
};

function rawCheckMacSource(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .filter((key) => key.toLowerCase() !== "checkmacvalue")
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`;
}

function naiveEncodeUriComponentMac(params: Record<string, string>): string {
  const encoded = encodeURIComponent(rawCheckMacSource(params)).toLowerCase();
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

describe("ECPay CheckMacValue", () => {
  it("produces a stable uppercase SHA256 for the same params and hash", () => {
    const first = computeCheckMacValue(checkoutParams, HASH_KEY, HASH_IV);
    const second = computeCheckMacValue(
      { ...checkoutParams },
      HASH_KEY,
      HASH_IV,
    );

    expect(first).toMatch(/^[A-F0-9]{64}$/);
    expect(second).toBe(first);
  });

  it("fails verification when any field changes", () => {
    const mac = computeCheckMacValue(checkoutParams, HASH_KEY, HASH_IV);

    expect(
      verifyCheckMacValue(checkoutParams, mac, HASH_KEY, HASH_IV),
    ).toBe(true);

    expect(
      verifyCheckMacValue(
        { ...checkoutParams, TotalAmount: "1" },
        mac,
        HASH_KEY,
        HASH_IV,
      ),
    ).toBe(false);
  });

  it("does not use a bare encodeURIComponent string before SHA256", () => {
    const mac = computeCheckMacValue(checkoutParams, HASH_KEY, HASH_IV);
    const naive = naiveEncodeUriComponentMac(checkoutParams);

    expect(checkoutParams.TradeDesc).toContain(" ");
    expect(naive).toMatch(/^[A-F0-9]{64}$/);
    expect(mac).not.toBe(naive);
  });
});
