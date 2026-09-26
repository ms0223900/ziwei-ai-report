import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeSubscription,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../test/fakes/supabase";
import { resolveReportEntitlement } from "./resolve";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REPORT_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-01-15T00:00:00.000Z");

function seedUnlock(memory: FakeSupabaseMemory) {
  memory.reportUnlocks.set(`${USER_ID}:${REPORT_ID}`, {
    id: `${USER_ID}:${REPORT_ID}`,
    user_id: USER_ID,
    report_id: REPORT_ID,
    transaction_id: "tx-1",
  });
}

describe("resolveReportEntitlement", () => {
  let memory: FakeSupabaseMemory;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    memory = createFakeSupabaseMemory();
    seedFakeUser(memory, { id: USER_ID, email: "a@example.com" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns lifetime first and does not look up subscriptions", async () => {
    seedFakeUser(memory, { id: USER_ID, email: "a@example.com" }, { access_status: "unlocked" });
    const client = createFakeServiceRoleClient(memory);
    const from = vi.spyOn(client, "from");

    const result = await resolveReportEntitlement(client, USER_ID, REPORT_ID);

    expect(result).toBe("lifetime");
    expect(from.mock.calls.map(([table]) => table)).not.toContain("subscriptions");
  });

  it("returns points for a report the member unlocked with a point", async () => {
    seedUnlock(memory);
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-02-01T00:00:00.000Z",
    });

    const result = await resolveReportEntitlement(
      createFakeServiceRoleClient(memory),
      USER_ID,
      REPORT_ID,
    );

    expect(result).toBe("points");
  });

  it("returns subscription while the period end has not passed", async () => {
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      status: "past_due",
      current_period_end: "2026-01-15T00:00:00.000Z",
    });

    const result = await resolveReportEntitlement(
      createFakeServiceRoleClient(memory),
      USER_ID,
      REPORT_ID,
    );

    expect(result).toBe("subscription");
  });

  it("ignores an active status once the period end has passed", async () => {
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      status: "active",
      current_period_end: "2026-01-14T23:59:59.000Z",
    });
    seedFakeUser(memory, { id: USER_ID, email: "a@example.com" }, { subscription_status: "active" });

    const result = await resolveReportEntitlement(
      createFakeServiceRoleClient(memory),
      USER_ID,
      REPORT_ID,
    );

    expect(result).toBe("none");
  });

  it("treats a failing subscriptions lookup as no subscription", async () => {
    const client = createFakeServiceRoleClient(memory);
    const original = client.from.bind(client);
    const failing = {
      select: () => failing,
      eq: () => failing,
      maybeSingle: async () => ({ data: null, error: { message: "relation does not exist" } }),
    };
    vi.spyOn(client, "from").mockImplementation(((table: string) =>
      table === "subscriptions" ? failing : original(table)) as typeof client.from);
    seedFakeSubscription(memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2026-02-01T00:00:00.000Z",
    });

    const result = await resolveReportEntitlement(client, USER_ID, REPORT_ID);

    expect(result).toBe("none");
  });
});
