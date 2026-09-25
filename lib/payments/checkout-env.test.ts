import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readEcpayCheckoutEnv } from "./checkout-env";

const BASE_ENV = {
  ECPAY_MERCHANT_ID: "3002607",
  ECPAY_HASH_KEY: "test-hash-key",
  ECPAY_HASH_IV: "test-hash-iv",
};

function stubEnv(values: Record<string, string>) {
  for (const key of [
    "APP_BASE_URL",
    "ECPAY_RETURN_URL",
    "ECPAY_CLIENT_BACK_URL",
    "ECPAY_PERIOD_RETURN_URL",
  ]) {
    vi.stubEnv(key, "");
  }
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...values })) {
    vi.stubEnv(key, value);
  }
}

describe("readEcpayCheckoutEnv period return url", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers ECPAY_PERIOD_RETURN_URL when set", () => {
    stubEnv({
      APP_BASE_URL: "https://app.example.com",
      ECPAY_PERIOD_RETURN_URL: "https://tunnel.example.com/period",
    });

    const env = readEcpayCheckoutEnv();

    expect(env?.periodReturnUrl).toBe("https://tunnel.example.com/period");
  });

  it("composes the period webhook path from APP_BASE_URL", () => {
    stubEnv({ APP_BASE_URL: "https://app.example.com/" });

    const env = readEcpayCheckoutEnv();

    expect(env?.periodReturnUrl).toBe(
      "https://app.example.com/api/payments/ecpay/period-webhook",
    );
  });

  it("keeps existing plans usable when only the period url is missing", () => {
    stubEnv({
      ECPAY_RETURN_URL: "https://tunnel.example.com/webhook",
      ECPAY_CLIENT_BACK_URL: "https://tunnel.example.com/orders/processing",
    });

    const env = readEcpayCheckoutEnv();

    expect(env).not.toBeNull();
    expect(env?.returnUrl).toBe("https://tunnel.example.com/webhook");
    expect(env?.periodReturnUrl).toBe("");
  });
});
