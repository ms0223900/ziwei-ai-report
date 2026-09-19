import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeOrder,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const state: { memory: FakeSupabaseMemory } = {
  memory: createFakeSupabaseMemory(),
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () =>
    createFakeServiceRoleClient(state.memory),
}));

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECRET = "grant-secret-for-tests";
const ORDER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ECPAY_CHECKOUT_URL =
  "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

function seedOrder(overrides: Partial<FakeOrder> = {}): FakeOrder {
  const order: FakeOrder = {
    id: ORDER_ID,
    user_id: USER_ID,
    plan_id: "unlock_report_lifetime",
    merchant_trade_no: "ZW20260919001",
    amount: 99,
    currency: "TWD",
    status: "pending",
    trade_no: null,
    payment_date: null,
    ...overrides,
  };
  state.memory.orders.set(order.id, { ...order });
  return order;
}

function snapshotOrders() {
  return [...state.memory.orders.entries()].map(([id, row]) => [
    id,
    { ...row },
  ]);
}

async function postGrant(body: unknown, headers: HeadersInit = {}) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/dev/grant-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/dev/grant-access", () => {
  const originalEnabled = process.env.MEMBERSHIP_GRANT_ENABLED;
  const originalSecret = process.env.MEMBERSHIP_GRANT_SECRET;

  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    process.env.MEMBERSHIP_GRANT_ENABLED = "1";
    process.env.MEMBERSHIP_GRANT_SECRET = SECRET;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnabled === undefined) {
      delete process.env.MEMBERSHIP_GRANT_ENABLED;
    } else {
      process.env.MEMBERSHIP_GRANT_ENABLED = originalEnabled;
    }
    if (originalSecret === undefined) {
      delete process.env.MEMBERSHIP_GRANT_SECRET;
    } else {
      process.env.MEMBERSHIP_GRANT_SECRET = originalSecret;
    }
  });

  it("writes unlocked and stays unlocked on a second call", async () => {
    const first = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      user_id: USER_ID,
      access_status: "unlocked",
    });
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("unlocked");

    const second = await postGrant(
      { user_id: USER_ID, email: "ignored@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      user_id: USER_ID,
      access_status: "unlocked",
    });
  });

  it("returns 200 when the profile is already unlocked", async () => {
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
    });
    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: USER_ID,
      access_status: "unlocked",
    });
  });

  it("returns 401 when the secret is wrong and keeps the row locked", async () => {
    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: "Bearer wrong" },
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error_code: "UNAUTHENTICATED",
      message: "未授權。",
    });
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("locked");
  });

  it("returns 404 when the switch is not 1", async () => {
    process.env.MEMBERSHIP_GRANT_ENABLED = "0";
    seedOrder();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );

    expect(response.status).toBe(404);
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("locked");
    expect(state.memory.orders.size).toBe(1);
    expect(state.memory.orders.get(ORDER_ID)?.status).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("unlocks without inserting or mutating orders", async () => {
    seedOrder({ status: "pending" });
    const before = snapshotOrders();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user_id: USER_ID,
      access_status: "unlocked",
    });
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("unlocked");
    expect(state.memory.orders.size).toBe(before.length);
    expect(snapshotOrders()).toEqual(before);
    expect(state.memory.orders.get(ORDER_ID)?.status).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not call an ECPay checkout URL", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error(`unexpected fetch to ${ECPAY_CHECKOUT_URL}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stays 200 after a paid order and does not change points", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      {
        access_status: "unlocked",
        points_balance: 5,
        subscription_status: "none",
      },
    );
    seedOrder({
      status: "paid",
      trade_no: "2609180000000001",
      payment_date: "2026-09-18T04:00:00.000Z",
    });
    const before = snapshotOrders();

    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );

    expect(response.status).toBe(200);
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("unlocked");
    expect(state.memory.profiles.get(USER_ID)?.points_balance).toBe(5);
    expect(state.memory.profiles.get(USER_ID)?.subscription_status).toBe(
      "none",
    );
    expect(snapshotOrders()).toEqual(before);
  });

  it("returns 400 when email and user_id are missing", async () => {
    const response = await postGrant(
      {},
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error_code: "VALIDATION_ERROR",
      message: "請提供 email 或 user_id。",
    });
  });
});
