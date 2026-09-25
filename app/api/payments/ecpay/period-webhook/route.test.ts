import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeCheckMacValue } from "../../../../../lib/ecpay/check-mac";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeSubscription,
  seedFakeUser,
  type FakeSubscription,
  type FakeSupabaseMemory,
} from "../../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HASH_KEY = "testHashKeyFixture";
const HASH_IV = "testHashIVFixture1";
const MTN = "ZW20260918001";
const PERIOD_END = "2026-10-18T04:00:00.000Z";

const state: { memory: FakeSupabaseMemory } = {
  memory: createFakeSupabaseMemory(),
};

vi.mock("../../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

const PAYMENT_ENV_KEYS = ["ECPAY_HASH_KEY", "ECPAY_HASH_IV"] as const;

function periodFields(overrides: Record<string, string | undefined> = {}) {
  const fields: Record<string, string> = {
    MerchantID: "2000132",
    MerchantTradeNo: MTN,
    RtnCode: "1",
    RtnMsg: "交易成功",
    PeriodType: "M",
    Frequency: "1",
    ExecTimes: "12",
    Amount: "19",
    gwsr: "12345678",
    ProcessDate: "2026/10/18 12:00:00",
    AuthCode: "777777",
    FirstAuthAmount: "19",
    TotalSuccessTimes: "2",
    SimulatePaid: "0",
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete fields[key];
    } else {
      fields[key] = value;
    }
  }
  return { ...fields, CheckMacValue: computeCheckMacValue(fields, HASH_KEY, HASH_IV) };
}

async function postPeriod(fields: Record<string, string>) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/payments/ecpay/period-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

function subscription(): FakeSubscription | undefined {
  return [...state.memory.subscriptions.values()][0];
}

function events() {
  return [...state.memory.subscriptionEvents.values()];
}

describe("POST /api/payments/ecpay/period-webhook", () => {
  const originalEnv = Object.fromEntries(
    PAYMENT_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof PAYMENT_ENV_KEYS)[number], string | undefined>;

  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      subscription_status: "active",
    });
    seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: MTN,
      current_period_end: PERIOD_END,
    });
    process.env.ECPAY_HASH_KEY = HASH_KEY;
    process.env.ECPAY_HASH_IV = HASH_IV;
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of PAYMENT_ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("extends one Taipei month on renewal and replies plain 1|OK", async () => {
    const response = await postPeriod(periodFields());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toBe("1|OK");
    expect(subscription()).toMatchObject({
      status: "active",
      current_period_end: "2026-11-18T04:00:00.000Z",
    });
    expect(events()).toEqual([
      expect.objectContaining({
        event_type: "renewal_success",
        idempotency_key: `period:${MTN}:2`,
        total_success_times: 2,
        gwsr: "12345678",
        rtn_code: "1",
      }),
    ]);
  });

  it("does not extend again when the same renewal is resent", async () => {
    await postPeriod(periodFields());

    const response = await postPeriod(periodFields());

    expect(await response.text()).toBe("1|OK");
    expect(subscription()?.current_period_end).toBe("2026-11-18T04:00:00.000Z");
    expect(events()).toHaveLength(1);
  });

  it("records TotalSuccessTimes=1 as a duplicate of the first payment without extending", async () => {
    const response = await postPeriod(periodFields({ TotalSuccessTimes: "1" }));

    expect(await response.text()).toBe("1|OK");
    expect(subscription()?.current_period_end).toBe(PERIOD_END);
    expect(events()[0]).toMatchObject({
      event_type: "first_duplicate",
      idempotency_key: `period:${MTN}:1`,
    });
  });

  it("rejects a bad CheckMacValue without writing events", async () => {
    const response = await postPeriod({ ...periodFields(), CheckMacValue: "BAD" });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("0|Error");
    expect(events()).toHaveLength(0);
    expect(subscription()?.current_period_end).toBe(PERIOD_END);
  });

  it("rejects an unknown MerchantTradeNo", async () => {
    const response = await postPeriod(periodFields({ MerchantTradeNo: "ZW_UNKNOWN" }));

    expect(response.status).toBe(400);
    expect(events()).toHaveLength(0);
  });

  it("rejects an Amount other than 19 without extending", async () => {
    const response = await postPeriod(periodFields({ Amount: "1" }));

    expect(response.status).toBe(400);
    expect(subscription()?.current_period_end).toBe(PERIOD_END);
    expect(events()).toHaveLength(0);
  });

  it("acks SimulatePaid=1 without writing events or extending", async () => {
    const response = await postPeriod(periodFields({ SimulatePaid: "1" }));

    expect(await response.text()).toBe("1|OK");
    expect(subscription()?.current_period_end).toBe(PERIOD_END);
    expect(events()).toHaveLength(0);
  });

  it("records a renewal on a cancelled subscription without reviving it", async () => {
    state.memory.subscriptions.set(subscription()!.id, {
      ...subscription()!,
      status: "cancelled",
      current_period_end: "2026-10-01T00:00:00.000Z",
    });

    const response = await postPeriod(periodFields({ TotalSuccessTimes: "3" }));

    expect(await response.text()).toBe("1|OK");
    expect(subscription()).toMatchObject({
      status: "cancelled",
      current_period_end: "2026-10-01T00:00:00.000Z",
    });
    expect(events()).toHaveLength(1);
  });

  it("stores the authorization number whether ECPay sends gwsr or Gwsr", async () => {
    await postPeriod(periodFields({ gwsr: undefined, Gwsr: "87654321" }));

    expect(events()[0]?.gwsr).toBe("87654321");
  });

  it("marks past_due on payment failure, keeps the period end and acks", async () => {
    const response = await postPeriod(periodFields({ RtnCode: "10100058", gwsr: "g-fail" }));

    expect(await response.text()).toBe("1|OK");
    expect(subscription()).toMatchObject({ status: "past_due", current_period_end: PERIOD_END });
    expect(events()[0]).toMatchObject({
      event_type: "payment_failed",
      idempotency_key: `failed:${MTN}:g-fail`,
      rtn_code: "10100058",
    });
    expect(state.memory.profiles.get(USER_ID)?.subscription_status).toBe("past_due");
  });

  it("keys a failure without gwsr by the raw ProcessDate so resends stay idempotent", async () => {
    const failure = periodFields({ RtnCode: "10100058", gwsr: undefined, ProcessDate: "not a date" });

    await postPeriod(failure);
    await postPeriod(failure);

    expect(events()).toHaveLength(1);
    expect(events()[0]?.idempotency_key).toBe(`failed:${MTN}:not a date`);
    expect(events()[0]?.processed_at).toEqual(expect.any(String));
  });

  it("keeps a cancelled subscription cancelled on payment failure", async () => {
    state.memory.subscriptions.set(subscription()!.id, {
      ...subscription()!,
      status: "cancelled",
    });

    await postPeriod(periodFields({ RtnCode: "10100058" }));

    expect(subscription()?.status).toBe("cancelled");
  });
});
