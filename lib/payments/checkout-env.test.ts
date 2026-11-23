import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";

const ENV_KEYS = [
  "ECPAY_MERCHANT_ID",
  "ECPAY_HASH_KEY",
  "ECPAY_HASH_IV",
  "ECPAY_CHECKOUT_URL",
  "ECPAY_RETURN_URL",
  "ECPAY_CLIENT_BACK_URL",
  "ECPAY_WEBHOOK_UNREACHABLE",
  "APP_BASE_URL",
] as const;

describe("readEcpayCheckoutEnv webhook unreachable switch", () => {
  const original = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
    process.env.ECPAY_MERCHANT_ID = "2000132";
    process.env.ECPAY_HASH_KEY = HASH_KEY;
    process.env.ECPAY_HASH_IV = HASH_IV;
    process.env.ECPAY_RETURN_URL =
      "https://example.test/api/payments/ecpay/webhook";
    process.env.ECPAY_CLIENT_BACK_URL = "https://example.test/orders/processing";
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("keeps the configured ReturnURL when the filming flag is off", async () => {
    process.env.ECPAY_WEBHOOK_UNREACHABLE = "0";
    const { readEcpayCheckoutEnv } = await import("./checkout-env");
    const env = readEcpayCheckoutEnv();
    expect(env?.returnUrl).toBe(
      "https://example.test/api/payments/ecpay/webhook",
    );
  });

  it("overrides ReturnURL to an unreachable local URL when flag is 1", async () => {
    process.env.ECPAY_WEBHOOK_UNREACHABLE = "1";
    const { readEcpayCheckoutEnv, ECPAY_UNREACHABLE_RETURN_URL } = await import(
      "./checkout-env"
    );
    const env = readEcpayCheckoutEnv();
    expect(env?.returnUrl).toBe(ECPAY_UNREACHABLE_RETURN_URL);
    expect(env?.returnUrl).toContain("127.0.0.1");
    expect(env?.clientBackUrl).toBe("https://example.test/orders/processing");
  });
});
