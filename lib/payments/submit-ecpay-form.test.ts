/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseCheckoutFields,
  submitEcpayTopLevelForm,
} from "./submit-ecpay-form";

describe("parseCheckoutFields", () => {
  it("keeps string fields and rejects non-string values", () => {
    expect(parseCheckoutFields({ TotalAmount: "99", MerchantID: "3002607" })).toEqual(
      {
        TotalAmount: "99",
        MerchantID: "3002607",
      },
    );
    expect(parseCheckoutFields({ TotalAmount: 99 })).toBeNull();
  });
});

describe("submitEcpayTopLevelForm", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("posts a top-level form without an iframe", () => {
    const submit = vi.fn();
    HTMLFormElement.prototype.submit = submit;

    submitEcpayTopLevelForm("https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5", {
      TotalAmount: "1",
      MerchantID: "3002607",
    });

    const form = document.querySelector("form");
    expect(form?.method).toMatch(/post/i);
    expect(form?.target).toBe("_top");
    expect(form?.action).toContain("payment-stage.ecpay.com.tw");
    expect(document.querySelector("iframe")).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
