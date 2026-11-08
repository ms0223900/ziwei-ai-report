import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeCheckMacValue as libComputeCheckMacValue,
  verifyCheckMacValue,
} from "../lib/ecpay/check-mac";
import { buildPayload, computeCheckMacValue } from "./ecpay-notify-payload.mjs";

const HASH = { hashKey: "testHashKeyFixture", hashIV: "testHashIVFixture1" };

describe("ecpay-notify-payload script", () => {
  it("matches the app CheckMacValue for spaces, reserved symbols and Chinese", () => {
    const fields = {
      MerchantID: "3002607",
      MerchantTradeNo: "ZW TEST 01",
      ItemName: "紫微斗數完整解讀 (測試)!*-_.~",
      TradeDesc: "a+b c'd",
      TotalAmount: "99",
    };

    expect(computeCheckMacValue(fields, HASH.hashKey, HASH.hashIV)).toBe(
      libComputeCheckMacValue(fields, HASH.hashKey, HASH.hashIV),
    );
  });

  it("builds a signed success notification for the one-time plan (99, RtnCode 1)", () => {
    const payload = buildPayload({ mtn: "ZW20261108A1" }, HASH);

    expect(payload).toMatchObject({
      MerchantTradeNo: "ZW20261108A1",
      RtnCode: "1",
      TradeAmt: "99",
      SimulatePaid: "0",
    });
    expect(payload.PaymentDate).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(verifyCheckMacValue(payload, payload.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });

  it("re-signs after the amount changes so only the amount check can reject it", () => {
    const payload = buildPayload({ mtn: "ZW20261108A1", amount: "1" }, HASH);

    expect(payload.TradeAmt).toBe("1");
    expect(verifyCheckMacValue(payload, payload.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });

  it("supports a failed result and a simulated payment", () => {
    const failed = buildPayload({ mtn: "ZW20261108B1", rtnCode: "0" }, HASH);
    expect(failed.RtnCode).toBe("0");
    expect(verifyCheckMacValue(failed, failed.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);

    const simulated = buildPayload({ mtn: "ZW20261108B1", simulate: true }, HASH);
    expect(simulated.SimulatePaid).toBe("1");
    expect(verifyCheckMacValue(simulated, simulated.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });

  it("emits a CheckMacValue that fails verification with --bad-mac", () => {
    const payload = buildPayload({ mtn: "ZW20261108A1", badMac: true }, HASH);

    expect(payload.CheckMacValue).toBe("0".repeat(64));
    expect(verifyCheckMacValue(payload, payload.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(false);
  });

  it("requires --mtn", () => {
    expect(() => buildPayload({}, HASH)).toThrow(/--mtn/);
  });

  it("prints a form-urlencoded payload from the CLI and reads the hash from env only", () => {
    const script = path.resolve(import.meta.dirname, "ecpay-notify-payload.mjs");
    const out = execFileSync("node", [script, "--mtn", "ZW20261108A1", "--amount", "99"], {
      env: { ...process.env, ECPAY_HASH_KEY: HASH.hashKey, ECPAY_HASH_IV: HASH.hashIV },
    })
      .toString()
      .trim();
    const fields = Object.fromEntries(new URLSearchParams(out));

    expect(fields.MerchantTradeNo).toBe("ZW20261108A1");
    const { CheckMacValue, ...rest } = fields;
    expect(verifyCheckMacValue(rest, CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });
});
