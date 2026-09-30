import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeUser,
  type FakeNotification,
  type FakeSupabaseMemory,
} from "../../../../../test/fakes/supabase";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OWN_ID = "11111111-1111-4111-8111-111111111111";
const OTHERS_ID = "22222222-2222-4222-8222-222222222222";
const MISSING_ID = "33333333-3333-4333-8333-333333333333";

const state: { memory: FakeSupabaseMemory; userId: string | null } = {
  memory: createFakeSupabaseMemory(),
  userId: USER_ID,
};

vi.mock("../../../../../lib/supabase/server", () => ({
  createServiceRoleClient: async () => createFakeServiceRoleClient(state.memory),
}));

vi.mock("../../../../../lib/supabase/session", () => ({
  createSessionClient: async () => createFakeServiceRoleClient(state.memory),
  getSessionUser: async () =>
    state.userId ? { id: state.userId, email: "yuan@example.com" } : null,
}));

function seedNotification(id: string, userId: string): FakeNotification {
  const row: FakeNotification = {
    id,
    user_id: userId,
    type: "order_pending",
    source_type: "order",
    source_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    idempotency_key: `k-${id}`,
    created_at: "2026-09-28T00:00:00.000Z",
    read_at: null,
  };
  state.memory.notifications.set(id, row);
  return row;
}

async function postRead(id: string) {
  const { POST } = await import("./route");
  return POST(new Request(`http://localhost/api/notifications/${id}/read`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
}

describe("POST /api/notifications/[id]/read", () => {
  beforeEach(() => {
    vi.useRealTimers();
    state.memory = createFakeSupabaseMemory();
    state.userId = USER_ID;
    seedFakeUser(state.memory, { id: USER_ID, email: "yuan@example.com" });
    seedFakeUser(state.memory, { id: OTHER_ID, email: "other@example.com" });
    seedNotification(OWN_ID, USER_ID);
    seedNotification(OTHERS_ID, OTHER_ID);
    vi.resetModules();
  });

  it("returns 401 { error } without a session", async () => {
    state.userId = null;

    const response = await postRead(OWN_ID);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "請先登入" });
    expect(state.memory.notifications.get(OWN_ID)?.read_at).toBeNull();
  });

  it("S5-6: sets read_at on the user's own row and keeps it on a second call", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T00:00:00.000Z"));
    const first = await postRead(OWN_ID);
    const firstReadAt = state.memory.notifications.get(OWN_ID)?.read_at;

    vi.setSystemTime(new Date("2026-10-02T00:00:00.000Z"));
    const second = await postRead(OWN_ID);

    expect(first.status).toBe(200);
    expect(firstReadAt).toBe("2026-10-01T00:00:00.000Z");
    expect(second.status).toBe(200);
    expect(state.memory.notifications.get(OWN_ID)?.read_at).toBe(firstReadAt);
    vi.useRealTimers();
  });

  it("S5-6: returns 404 for another member's row and leaves it unread", async () => {
    const response = await postRead(OTHERS_ID);

    expect(response.status).toBe(404);
    expect(state.memory.notifications.get(OTHERS_ID)?.read_at).toBeNull();
  });

  it("S5-6: returns 404 for a missing id", async () => {
    const response = await postRead(MISSING_ID);

    expect(response.status).toBe(404);
  });

  it("does not change type or any other column", async () => {
    const before = { ...state.memory.notifications.get(OWN_ID)! };

    await postRead(OWN_ID);

    const after = state.memory.notifications.get(OWN_ID)!;
    expect({ ...after, read_at: null }).toEqual({ ...before, read_at: null });
  });
});
