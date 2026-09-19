import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "../constants";
import { parseCheckoutClientResult } from "./checkout-client-result";

const fields = {
  MerchantID: "3002607",
  TotalAmount: "99",
  CheckMacValue: "ABC",
};

describe("parseCheckoutClientResult", () => {
  it("returns login for 401 and ignores the JSON message", () => {
    expect(
      parseCheckoutClientResult(401, { message: ERROR_MESSAGES.LOGIN_REQUIRED }),
    ).toEqual({ type: "login" });
  });

  it("returns the server message when the status is not ok", () => {
    expect(
      parseCheckoutClientResult(409, {
        message: ERROR_MESSAGES.ALREADY_UNLOCKED,
      }),
    ).toEqual({
      type: "error",
      message: ERROR_MESSAGES.ALREADY_UNLOCKED,
    });
  });

  it("falls back when a non-ok body has no string message", () => {
    expect(parseCheckoutClientResult(500, { message: 1 })).toEqual({
      type: "error",
      message: ERROR_MESSAGES.PAYMENT_UNAVAILABLE,
    });
  });

  it("returns submit when checkout_url and string fields are present", () => {
    expect(
      parseCheckoutClientResult(200, {
        checkout_url: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
        fields,
      }),
    ).toEqual({
      type: "submit",
      checkoutUrl: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
      fields,
    });
  });

  it("returns an error when a 200 body is missing checkout_url", () => {
    expect(parseCheckoutClientResult(200, { fields })).toEqual({
      type: "error",
      message: ERROR_MESSAGES.PAYMENT_UNAVAILABLE,
    });
  });

  it("returns an error when fields contain a non-string value", () => {
    expect(
      parseCheckoutClientResult(200, {
        checkout_url: "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
        fields: { TotalAmount: 99 },
      }),
    ).toEqual({
      type: "error",
      message: ERROR_MESSAGES.PAYMENT_UNAVAILABLE,
    });
  });
});
