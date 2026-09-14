import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import advancedValid from "../../../../lib/generation/fixtures/advanced.valid.json";
import basicValid from "../../../../lib/generation/fixtures/basic.valid.json";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeUser,
  type FakeSupabaseMemory,
} from "../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PERSIST_ID = "11111111-1111-4111-8111-111111111111";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
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

const FORBIDDEN_BODY_KEYS = [
  "advanced_json",
  "rationale",
  "path_compare",
  "action_plan",
] as const;

async function getReport(persistId: string) {
  const { GET } = await import("./route");
  return GET(new Request(`http://localhost/api/reports/${persistId}`), {
    params: Promise.resolve({ persistId }),
  });
}

describe("GET /api/reports/[persistId]", () => {
  beforeEach(() => {
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
    });
    seedFakeReport(state.memory, {
      id: PERSIST_ID,
      generation_status: "success",
      basic_json: basicValid,
      advanced_json: advancedValid,
    });
    vi.resetModules();
  });

  afterEach(() => {
    state.userId = USER_ID;
  });

  it("returns 401 without a session and omits advanced fields", async () => {
    state.userId = null;
    const response = await getReport(PERSIST_ID);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      error_code: "UNAUTHENTICATED",
      message: "請先登入。",
    });
    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it("returns 403 for a locked member and omits advanced fields", async () => {
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "locked",
    });
    const response = await getReport(PERSIST_ID);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error_code: "FORBIDDEN",
      message: "尚未開通，無法讀取進階報告。",
    });
    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it("returns 404 for a non-uuid persist id instead of 500", async () => {
    const response = await getReport("rpt_demo_001");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error_code).toBe("NOT_FOUND");
    for (const key of FORBIDDEN_BODY_KEYS) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it("returns assembled advanced fields and action from basic_json", async () => {
    const response = await getReport(PERSIST_ID);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tier).toBe("advanced");
    expect(body.persist_id).toBe(PERSIST_ID);
    expect(body.action).toBe(basicValid.action);
    expect(body.overall).toBe(basicValid.overall);
    expect(body.rationale).toBe(advancedValid.rationale);
    expect(body.path_compare).toEqual(advancedValid.path_compare);
    expect(body.action_plan).toHaveLength(7);
    expect(body.action_plan[0]).toContain("第 1 天");
    expect(body).not.toHaveProperty("advanced_json");
    expect(body.locked_fields).toEqual([]);
    expect(body.access_status).toBe("unlocked");
  });
});
