import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
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
    vi.resetModules();
  });

  afterEach(() => {
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
    const response = await postGrant(
      { email: "yuan@example.com" },
      { Authorization: `Bearer ${SECRET}` },
    );
    expect(response.status).toBe(404);
    expect(state.memory.profiles.get(USER_ID)?.access_status).toBe("locked");
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
