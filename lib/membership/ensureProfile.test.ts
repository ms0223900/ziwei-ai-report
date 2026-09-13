import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureProfile } from "./ensureProfile";

const { createServiceRoleClient } = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createServiceRoleClient,
}));

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EMAIL = "yuan@example.com";

function mockProfilesClient(options: {
  existing?: Record<string, unknown> | null;
}) {
  const update = vi.fn();
  const eq = vi.fn();
  const single = vi.fn();
  const select = vi.fn().mockReturnValue({ eq, single });
  const upsert = vi.fn().mockReturnValue({ select });

  eq.mockImplementation(() => ({ single }));
  single.mockResolvedValue({
    data:
      options.existing ??
      {
        user_id: USER_ID,
        display_name: "yuan",
        access_status: "locked",
        points_balance: 0,
        subscription_status: "none",
      },
    error: null,
  });

  const from = vi.fn().mockReturnValue({ upsert, select, update });
  createServiceRoleClient.mockResolvedValue({ from });
  return { from, upsert, select, update, eq };
}

describe("ensureProfile", () => {
  beforeEach(() => {
    createServiceRoleClient.mockReset();
  });

  it("inserts locked / 0 / none and email prefix when the row is missing", async () => {
    const { from, upsert, update } = mockProfilesClient({ existing: null });

    const row = await ensureProfile({
      userId: USER_ID,
      email: EMAIL,
      access_status: "unlocked",
      points_balance: 99,
    });

    expect(from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: USER_ID,
        display_name: "yuan",
        access_status: "locked",
        points_balance: 0,
        subscription_status: "none",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    expect(update).not.toHaveBeenCalled();
    expect(row).toMatchObject({
      user_id: USER_ID,
      display_name: "yuan",
      access_status: "locked",
      points_balance: 0,
      subscription_status: "none",
    });
  });

  it("does not write an existing unlocked row back to locked", async () => {
    const existing = {
      user_id: USER_ID,
      display_name: "小圓",
      access_status: "unlocked",
      points_balance: 0,
      subscription_status: "none",
    };
    const { upsert, update } = mockProfilesClient({ existing });

    const row = await ensureProfile({ userId: USER_ID, email: EMAIL });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ access_status: "locked" }),
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    expect(update).not.toHaveBeenCalled();
    expect(row?.access_status).toBe("unlocked");
  });

  it("does not reset a customized display_name to the email prefix", async () => {
    const existing = {
      user_id: USER_ID,
      display_name: "小圓",
      access_status: "locked",
      points_balance: 0,
      subscription_status: "none",
    };
    const { update } = mockProfilesClient({ existing });

    const row = await ensureProfile({ userId: USER_ID, email: EMAIL });

    expect(update).not.toHaveBeenCalled();
    expect(row?.display_name).toBe("小圓");
    expect(row?.display_name).not.toBe("yuan");
  });
});
