import { beforeEach, describe, expect, it, vi } from "vitest";
import advancedValid from "../../../lib/generation/fixtures/advanced.valid.json";
import basicValid from "../../../lib/generation/fixtures/basic.valid.json";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const REPORT_A = "11111111-1111-4111-8111-111111111111";
const REPORT_B = "22222222-2222-4222-8222-222222222222";
const REPORT_OTHER = "33333333-3333-4333-8333-333333333333";
const REPORT_LEGACY = "44444444-4444-4444-8444-444444444444";
const REPORT_LOCKED = "55555555-5555-4555-8555-555555555555";
const FIXTURE_REPORT_ID = "rpt_demo_001";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () =>
    createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../lib/supabase/session", () => ({
  getSessionUser: async () =>
    state.userId
      ? { id: state.userId, email: "yuan@example.com" }
      : null,
}));

function seedReport(id: string, userId: string | null, nickname: string) {
  seedFakeReport(state.memory, {
    id,
    generation_status: "success",
    basic_json: { ...basicValid, nickname, report_id: FIXTURE_REPORT_ID },
    advanced_json: advancedValid,
    nickname,
    user_id: userId,
  });
}

function seedUnlock(userId: string, reportId: string, createdAt: string) {
  state.memory.reportUnlocks.set(`${userId}:${reportId}`, {
    id: `${userId}:${reportId}`,
    user_id: userId,
    report_id: reportId,
    transaction_id: `tx-${reportId}`,
    created_at: createdAt,
  });
}

async function getUnlocks() {
  const { GET } = await import("./route");
  return GET(new Request("http://localhost/api/report-unlocks"));
}

describe("GET /api/report-unlocks", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedFakeUser(state.memory, { id: OTHER_ID, email: "other@example.com" });
    seedReport(REPORT_A, USER_ID, "小圓");
    seedReport(REPORT_B, USER_ID, "阿星");
    seedReport(REPORT_OTHER, OTHER_ID, "別人");
    seedReport(REPORT_LEGACY, null, "舊訪客");
    seedReport(REPORT_LOCKED, USER_ID, "還沒解鎖");
    seedUnlock(USER_ID, REPORT_A, "2026-09-20T08:00:00.000Z");
    seedUnlock(USER_ID, REPORT_B, "2026-09-22T08:00:00.000Z");
    seedUnlock(OTHER_ID, REPORT_OTHER, "2026-09-21T08:00:00.000Z");
    vi.resetModules();
  });

  it("returns 401 without a session", async () => {
    state.userId = null;

    const response = await getUnlocks();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error_code: "UNAUTHENTICATED",
      message: "請先登入。",
    });
  });

  it("lists only the caller's unlocks, newest first, with nickname and created_at", async () => {
    const response = await getUnlocks();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        report_id: REPORT_B,
        nickname: "阿星",
        created_at: "2026-09-22T08:00:00.000Z",
      },
      {
        report_id: REPORT_A,
        nickname: "小圓",
        created_at: "2026-09-20T08:00:00.000Z",
      },
    ]);
  });

  it("keys items by the uuid persist_id, never basic_json.report_id", async () => {
    const response = await getUnlocks();

    const body = (await response.json()) as { report_id: string }[];
    expect(body.length).toBeGreaterThan(0);
    for (const item of body) {
      expect(item.report_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(item.report_id).not.toBe(FIXTURE_REPORT_ID);
    }
  });

  it("does not pour every report into the menu for a lifetime account", async () => {
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
    });

    const response = await getUnlocks();

    const ids = ((await response.json()) as { report_id: string }[]).map(
      (item) => item.report_id,
    );
    expect(ids).toEqual([REPORT_B, REPORT_A]);
    expect(ids).not.toContain(REPORT_LOCKED);
  });

  it("drops unlock rows whose report has a null or foreign user_id", async () => {
    seedUnlock(USER_ID, REPORT_LEGACY, "2026-09-23T08:00:00.000Z");
    seedUnlock(USER_ID, REPORT_OTHER, "2026-09-23T09:00:00.000Z");

    const response = await getUnlocks();

    const ids = ((await response.json()) as { report_id: string }[]).map(
      (item) => item.report_id,
    );
    expect(ids).toEqual([REPORT_B, REPORT_A]);
  });

  it("returns an empty list when the caller has no unlocks", async () => {
    state.userId = OTHER_ID;
    state.memory.reportUnlocks.clear();

    const response = await getUnlocks();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
