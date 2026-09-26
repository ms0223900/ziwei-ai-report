import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeSubscription,
  seedFakeUser,
  setFakeRpc,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REPORT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FIXTURE_REPORT_ID = "rpt_demo_001";

const state: {
  memory: FakeSupabaseMemory;
  userId: string | null;
  rpcCalls: Array<Record<string, unknown> | undefined>;
} = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
  rpcCalls: [],
};

vi.mock("../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () =>
    createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId
      ? { id: state.userId, email: "yuan@example.com" }
      : null,
}));

function debitsFor(reportId: string) {
  return [...state.memory.pointTransactions.values()].filter(
    (row) => row.type === "debit_unlock" && row.report_id === reportId,
  );
}

function unlocksFor(reportId: string) {
  return [...state.memory.reportUnlocks.values()].filter(
    (row) => row.report_id === reportId && row.user_id === USER_ID,
  );
}

function installUnlockRpc() {
  setFakeRpc(state.memory, "unlock_report_with_point", (args) => {
    state.rpcCalls.push(args);
    const reportId = String(args?.report_id ?? "");
    const userId = String(args?.p_user_id ?? "");
    const report = state.memory.reports.get(reportId);
    const profile = state.memory.profiles.get(userId);
    const balance = profile?.points_balance ?? 0;
    if (!report || report.user_id == null || report.user_id !== userId || !profile) {
      return {
        data: [{ ok: false, reason: "forbidden", points_balance: balance }],
        error: null,
      };
    }
    if (profile.access_status === "unlocked") {
      return {
        data: [{ ok: true, reason: "lifetime", points_balance: balance }],
        error: null,
      };
    }
    const existing = [...state.memory.reportUnlocks.values()].find(
      (row) => row.user_id === userId && row.report_id === reportId,
    );
    if (existing) {
      return {
        data: [{ ok: true, reason: "already_unlocked", points_balance: balance }],
        error: null,
      };
    }
    if (profile.points_balance < 1) {
      return {
        data: [{ ok: false, reason: "insufficient", points_balance: profile.points_balance }],
        error: null,
      };
    }
    profile.points_balance -= 1;
    const txId = `debit-${reportId}-${state.memory.pointTransactions.size + 1}`;
    state.memory.pointTransactions.set(txId, {
      id: txId,
      user_id: userId,
      delta: -1,
      type: "debit_unlock",
      source_order_id: null,
      report_id: reportId,
    });
    state.memory.reportUnlocks.set(`${userId}:${reportId}`, {
      id: `${userId}:${reportId}`,
      user_id: userId,
      report_id: reportId,
      transaction_id: txId,
    });
    return {
      data: [{ ok: true, reason: "unlocked", points_balance: profile.points_balance }],
      error: null,
    };
  });
}

function seedOwnedReport(userId: string | null = USER_ID) {
  seedFakeReport(state.memory, {
    id: REPORT_ID,
    generation_status: "success",
    basic_json: { report_id: FIXTURE_REPORT_ID },
    advanced_json: { rationale: "secret" },
    user_id: userId,
  });
}

async function postUnlock(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/reports/unlock-with-point", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/reports/unlock-with-point", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    state.rpcCalls = [];
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "locked", points_balance: 5 },
    );
    seedOwnedReport();
    installUnlockRpc();
    vi.resetModules();
  });

  it("returns 401 without a session and does not call the rpc", async () => {
    state.userId = null;

    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.message).toBe("請先登入。");
    expect(state.rpcCalls).toHaveLength(0);
    expect(state.memory.profiles.get(USER_ID)?.points_balance).toBe(5);
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
  });

  it("unlocks the caller's report and debits one point", async () => {
    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reason: "unlocked",
      points_balance: 4,
    });
    expect(state.rpcCalls[0]).toEqual({
      report_id: REPORT_ID,
      p_user_id: USER_ID,
    });
    expect(debitsFor(REPORT_ID)).toEqual([
      expect.objectContaining({ delta: -1, report_id: REPORT_ID }),
    ]);
    expect(unlocksFor(REPORT_ID)).toHaveLength(1);
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("locked");
  });

  it("returns already_unlocked without a second debit", async () => {
    await postUnlock({ report_id: REPORT_ID });
    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reason: "already_unlocked",
      points_balance: 4,
    });
    expect(debitsFor(REPORT_ID)).toHaveLength(1);
    expect(unlocksFor(REPORT_ID)).toHaveLength(1);
  });

  it("returns lifetime without debiting or writing an unlock row", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "unlocked", points_balance: 5 },
    );

    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reason: "lifetime",
      points_balance: 5,
    });
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
    expect(unlocksFor(REPORT_ID)).toHaveLength(0);
  });

  it("returns forbidden for another member's report without debiting", async () => {
    seedOwnedReport(OTHER_ID);

    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      reason: "forbidden",
      points_balance: 5,
    });
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
    expect(state.memory.reportUnlocks.size).toBe(0);
  });

  it("returns forbidden when the report user_id is null", async () => {
    seedOwnedReport(null);

    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(body).toMatchObject({
      ok: false,
      reason: "forbidden",
    });
    expect(state.memory.profiles.get(USER_ID)?.points_balance).toBe(5);
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
  });

  it("does not treat basic_json.report_id as the entitlement key", async () => {
    const response = await postUnlock({ report_id: FIXTURE_REPORT_ID });
    const body = await readJson(response);

    expect(body).toMatchObject({
      ok: false,
      reason: "forbidden",
      points_balance: 5,
    });
    expect(
      state.rpcCalls.every((call) => call?.report_id !== REPORT_ID),
    ).toBe(true);
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
    expect(unlocksFor(REPORT_ID)).toHaveLength(0);
  });

  it("ignores body user_id, delta, and points_balance", async () => {
    const response = await postUnlock({
      report_id: REPORT_ID,
      user_id: OTHER_ID,
      delta: -99,
      points_balance: 0,
    });
    const body = await readJson(response);

    expect(body).toMatchObject({
      ok: true,
      reason: "unlocked",
      points_balance: 4,
    });
    expect(state.rpcCalls[0]).toEqual({
      report_id: REPORT_ID,
      p_user_id: USER_ID,
    });
  });

  it("returns insufficient twice without a negative balance or fake rows", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "locked", points_balance: 0 },
    );

    const first = await postUnlock({ report_id: REPORT_ID });
    const second = await postUnlock({ report_id: REPORT_ID });
    const firstBody = await readJson(first);
    const secondBody = await readJson(second);

    expect(firstBody).toMatchObject({
      ok: false,
      reason: "insufficient",
      points_balance: 0,
    });
    expect(secondBody).toMatchObject({
      ok: false,
      reason: "insufficient",
      points_balance: 0,
    });
    expect(state.memory.profiles.get(USER_ID)?.points_balance).toBe(0);
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
    expect(unlocksFor(REPORT_ID)).toHaveLength(0);
  });

  it("maps a unique conflict to already_unlocked instead of 500", async () => {
    setFakeRpc(state.memory, "unlock_report_with_point", (args) => {
      state.rpcCalls.push(args);
      return {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint",
        },
      };
    });

    const response = await postUnlock({ report_id: REPORT_ID });
    const body = await readJson(response);

    expect(response.status).not.toBe(500);
    expect(body).toMatchObject({
      ok: true,
      reason: "already_unlocked",
    });
    expect(state.memory.profiles.get(USER_ID)?.points_balance).toBeGreaterThanOrEqual(0);
  });
});

// Regression only: the route forwards the RPC reason; the SQL branch is
// verified by the unit 6 migration and the fake's built-in RPC.
describe("POST /api/reports/unlock-with-point — subscription (unit 6 US-014)", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "locked", points_balance: 3 },
    );
    seedOwnedReport();
    vi.resetModules();
  });

  it("returns subscription without debiting while the period is active", async () => {
    seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2999-01-01T00:00:00.000Z",
    });

    const body = await readJson(await postUnlock({ report_id: REPORT_ID }));

    expect(body).toEqual({ ok: true, reason: "subscription", points_balance: 3 });
    expect(debitsFor(REPORT_ID)).toHaveLength(0);
    expect(unlocksFor(REPORT_ID)).toHaveLength(0);
  });

  it("keeps lifetime ahead of an active subscription", async () => {
    seedFakeUser(
      state.memory,
      { id: USER_ID, email: "yuan@example.com" },
      { access_status: "unlocked", points_balance: 3 },
    );
    seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2999-01-01T00:00:00.000Z",
    });

    const body = await readJson(await postUnlock({ report_id: REPORT_ID }));

    expect(body.reason).toBe("lifetime");
  });

  it("debits a point again once the subscription has expired", async () => {
    seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2020-01-01T00:00:00.000Z",
    });

    const body = await readJson(await postUnlock({ report_id: REPORT_ID }));

    expect(body).toEqual({ ok: true, reason: "unlocked", points_balance: 2 });
  });

  it("stays forbidden for another member's report while subscribed", async () => {
    seedFakeSubscription(state.memory, {
      user_id: USER_ID,
      merchant_trade_no: "MTN1",
      current_period_end: "2999-01-01T00:00:00.000Z",
    });
    seedFakeReport(state.memory, {
      id: REPORT_ID,
      generation_status: "success",
      basic_json: {},
      advanced_json: {},
      user_id: OTHER_ID,
    });

    const body = await readJson(await postUnlock({ report_id: REPORT_ID }));

    expect(body).toMatchObject({ ok: false, reason: "forbidden", points_balance: 3 });
  });
});
