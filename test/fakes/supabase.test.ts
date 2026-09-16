import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeUser,
} from "./supabase";

const FAKE_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "supabase.ts"),
  "utf8",
);

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REPORT_ID = "11111111-1111-4111-8111-111111111111";

describe("fake supabase memory", () => {
  it("seeds a locked profile and finds the user by email", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeUser(memory, { id: USER_ID, email: "yuan@example.com" });
    const client = createFakeServiceRoleClient(memory);

    const listed = await client.auth.admin.listUsers();
    expect(listed.data.users).toEqual([
      { id: USER_ID, email: "yuan@example.com" },
    ]);

    const { data } = await client
      .from("profiles")
      .select()
      .eq("user_id", USER_ID)
      .single();
    expect(data).toMatchObject({
      user_id: USER_ID,
      display_name: "yuan",
      access_status: "locked",
      points_balance: 0,
      subscription_status: "none",
    });
  });

  it("updates access_status in memory and keeps it after a second read", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeUser(memory, { id: USER_ID, email: "yuan@example.com" });
    const client = createFakeServiceRoleClient(memory);

    await client
      .from("profiles")
      .update({ access_status: "unlocked" })
      .eq("user_id", USER_ID)
      .maybeSingle();

    const { data } = await client
      .from("profiles")
      .select()
      .eq("user_id", USER_ID)
      .single();
    expect(data?.access_status).toBe("unlocked");
  });

  it("returns no row from update unless select is chained", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeUser(memory, { id: USER_ID, email: "yuan@example.com" });
    const client = createFakeServiceRoleClient(memory);

    const withoutSelect = await client
      .from("profiles")
      .update({ access_status: "unlocked" })
      .eq("user_id", USER_ID)
      .maybeSingle();
    expect(withoutSelect).toEqual({ data: null, error: null });
    expect(memory.profiles.get(USER_ID)?.access_status).toBe("unlocked");

    seedFakeUser(memory, { id: USER_ID, email: "yuan@example.com" });
    const withSelect = await client
      .from("profiles")
      .update({ access_status: "unlocked" })
      .eq("user_id", USER_ID)
      .select()
      .maybeSingle();
    expect(withSelect.data?.access_status).toBe("unlocked");
    expect(withSelect.error).toBeNull();
  });

  it("returns a seeded report by id for GET assembly", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeReport(memory, {
      id: REPORT_ID,
      generation_status: "success",
      basic_json: { action: "先完成一件能展示的小交付。" },
      advanced_json: { rationale: "真文" },
    });
    const client = createFakeServiceRoleClient(memory);

    const { data } = await client
      .from("reports")
      .select()
      .eq("id", REPORT_ID)
      .single();
    expect(data?.advanced_json).toEqual({ rationale: "真文" });
    expect(data?.basic_json).toEqual({ action: "先完成一件能展示的小交付。" });
  });

  it("does not overwrite an existing profile on ignoreDuplicates upsert", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeUser(memory, { id: USER_ID, email: "yuan@example.com" }, {
      access_status: "unlocked",
      display_name: "小園",
    });
    const client = createFakeServiceRoleClient(memory);

    await client
      .from("profiles")
      .upsert(
        {
          user_id: USER_ID,
          display_name: "yuan",
          access_status: "locked",
          points_balance: 0,
          subscription_status: "none",
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      )
      .maybeSingle();

    const { data } = await client
      .from("profiles")
      .select()
      .eq("user_id", USER_ID)
      .single();
    expect(data).toMatchObject({
      display_name: "小園",
      access_status: "unlocked",
    });
  });

  it("does not read remote env or the service role key", () => {
    expect(FAKE_SOURCE).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(FAKE_SOURCE).not.toContain("process.env");
    expect(FAKE_SOURCE).not.toContain("createClient");
  });
});
