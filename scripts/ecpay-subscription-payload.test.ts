import { describe, expect, it } from "vitest";
import {
  computeCheckMacValue as libComputeCheckMacValue,
  verifyCheckMacValue,
} from "../lib/ecpay/check-mac";
import {
  buildPeriodPayload,
  buildReturnPayload,
  computeCheckMacValue,
} from "./ecpay-subscription-payload.mjs";

const HASH = { hashKey: "testHashKeyFixture", hashIV: "testHashIVFixture1" };

describe("ecpay-subscription-payload script", () => {
  it("matches the app CheckMacValue for spaces, reserved symbols and Chinese", () => {
    const fields = {
      MerchantID: "3002607",
      MerchantTradeNo: "ZW TEST 01",
      ItemName: "紫微斗數月繳訂閱 (測試)!*-_.~",
      TradeDesc: "a+b c'd",
      TotalAmount: "19",
    };

    expect(computeCheckMacValue(fields, HASH.hashKey, HASH.hashIV)).toBe(
      libComputeCheckMacValue(fields, HASH.hashKey, HASH.hashIV),
    );
  });

  it("builds a signed ReturnURL payload for the first authorization", () => {
    const payload = buildReturnPayload({ mtn: "ZW20260918001" }, HASH);

    expect(payload).toMatchObject({
      MerchantTradeNo: "ZW20260918001",
      RtnCode: "1",
      TradeAmt: "19",
      SimulatePaid: "0",
    });
    expect(payload.PaymentDate).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(verifyCheckMacValue(payload, payload.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });

  it("builds a signed PeriodReturnURL payload with success count, gwsr and rtn code", () => {
    const payload = buildPeriodPayload(
      { mtn: "ZW20260918001", totalSuccessTimes: 3, rtnCode: "10100058", gwsr: "g-3" },
      HASH,
    );

    expect(payload).toMatchObject({
      MerchantTradeNo: "ZW20260918001",
      Amount: "19",
      TotalSuccessTimes: "3",
      RtnCode: "10100058",
      gwsr: "g-3",
      PeriodType: "M",
      Frequency: "1",
      ExecTimes: "12",
    });
    expect(verifyCheckMacValue(payload, payload.CheckMacValue, HASH.hashKey, HASH.hashIV)).toBe(true);
  });

  it("marks SimulatePaid=1 when asked", () => {
    expect(buildPeriodPayload({ mtn: "M1", simulate: true }, HASH).SimulatePaid).toBe("1");
    expect(buildReturnPayload({ mtn: "M1", simulate: true }, HASH).SimulatePaid).toBe("1");
  });

  it("requires a MerchantTradeNo", () => {
    expect(() => buildPeriodPayload({ mtn: "" }, HASH)).toThrow(/mtn/i);
  });
});
