import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  createFakeServiceRoleClient,
  createFakeSupabaseMemory,
  seedFakeReport,
  seedFakeUser,
  setFakeRpc,
} from "./supabase";

const FAKE_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "supabase.ts"),
  "utf8",
);

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REPORT_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "22222222-2222-4222-8222-222222222222";

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

  it("inserts selects and updates orders without simulating RLS", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    const inserted = await client
      .from("orders")
      .insert({
        user_id: USER_ID,
        plan_id: "unlock_report_lifetime",
        merchant_trade_no: "ABC123",
        amount: 99,
        currency: "TWD",
        status: "pending",
      })
      .select()
      .single();

    expect(inserted.error).toBeNull();
    expect(inserted.data).toMatchObject({
      user_id: USER_ID,
      merchant_trade_no: "ABC123",
      status: "pending",
      amount: 99,
    });
    expect(inserted.data?.id).toBeTruthy();

    const selected = await client
      .from("orders")
      .select()
      .eq("merchant_trade_no", "ABC123")
      .single();
    expect(selected.data?.plan_id).toBe("unlock_report_lifetime");

    const withoutSelect = await client
      .from("orders")
      .update({ status: "paid" })
      .eq("merchant_trade_no", "ABC123")
      .maybeSingle();
    expect(withoutSelect).toEqual({ data: null, error: null });
    expect(memory.orders.get(String(inserted.data?.id))?.status).toBe("paid");

    expect(FAKE_SOURCE).not.toContain("auth.uid");
    expect(FAKE_SOURCE).not.toContain("row level security");
  });

  it("rejects a duplicate merchant_trade_no insert", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    await client.from("orders").insert({
      user_id: USER_ID,
      plan_id: "unlock_report_lifetime",
      merchant_trade_no: "DUP001",
      amount: 99,
      currency: "TWD",
      status: "pending",
    });

    const duplicate = await client.from("orders").insert({
      user_id: USER_ID,
      plan_id: "unlock_report_lifetime",
      merchant_trade_no: "DUP001",
      amount: 99,
      currency: "TWD",
      status: "pending",
    });

    expect(duplicate.data).toBeNull();
    expect(duplicate.error).toMatchObject({
      message: "duplicate merchant_trade_no",
    });
    expect(memory.orders.size).toBe(1);
  });

  it("inserts point_transactions and report_unlocks without throwing", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    const credit = await client.from("point_transactions").insert({
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
      report_id: null,
    });
    expect(credit.error).toBeNull();
    expect(credit.data).toMatchObject({
      user_id: USER_ID,
      source_order_id: ORDER_ID,
      delta: 5,
    });

    const unlock = await client.from("report_unlocks").insert({
      user_id: USER_ID,
      report_id: REPORT_ID,
      transaction_id: String(
        (credit.data as { id?: string } | null)?.id ?? "tx",
      ),
    });
    expect(unlock.error).toBeNull();
    expect(unlock.data).toMatchObject({
      user_id: USER_ID,
      report_id: REPORT_ID,
    });
  });

  it("stores reports.user_id including null", async () => {
    const memory = createFakeSupabaseMemory();
    seedFakeReport(memory, {
      id: REPORT_ID,
      generation_status: "success",
      basic_json: {},
      advanced_json: null,
      user_id: null,
    });
    const client = createFakeServiceRoleClient(memory);
    const guest = await client.from("reports").select().eq("id", REPORT_ID).single();
    expect(guest.data?.user_id).toBeNull();

    await client
      .from("reports")
      .update({ user_id: USER_ID })
      .eq("id", REPORT_ID)
      .maybeSingle();
    expect(memory.reports.get(REPORT_ID)?.user_id).toBe(USER_ID);
  });

  it("rejects a duplicate credit source_order_id", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    await client.from("point_transactions").insert({
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
    });
    const duplicate = await client.from("point_transactions").insert({
      user_id: USER_ID,
      delta: 5,
      type: "credit_purchase",
      source_order_id: ORDER_ID,
    });
    expect(duplicate.data).toBeNull();
    expect(duplicate.error).toMatchObject({
      message: "duplicate source_order_id",
    });
    expect(memory.pointTransactions.size).toBe(1);
  });

  it("rejects a duplicate report_unlocks pair", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    await client.from("report_unlocks").insert({
      user_id: USER_ID,
      report_id: REPORT_ID,
      transaction_id: "tx-1",
    });
    const duplicate = await client.from("report_unlocks").insert({
      user_id: USER_ID,
      report_id: REPORT_ID,
      transaction_id: "tx-2",
    });
    expect(duplicate.data).toBeNull();
    expect(duplicate.error).toMatchObject({
      message: "duplicate id",
    });
    expect(memory.reportUnlocks.size).toBe(1);
  });

  it("exposes rpc stubs that tests can inject without throwing", async () => {
    const memory = createFakeSupabaseMemory();
    const client = createFakeServiceRoleClient(memory);
    const missing = await client.rpc("fulfill_points_pack_order", {
      order_id: ORDER_ID,
    });
    expect(missing).toEqual({ data: null, error: null });

    setFakeRpc(memory, "unlock_report_with_point", {
      data: { ok: true, reason: "unlocked", points_balance: 4 },
      error: null,
    });
    const injected = await client.rpc("unlock_report_with_point", {
      report_id: REPORT_ID,
      p_user_id: USER_ID,
    });
    expect(injected.data).toMatchObject({
      ok: true,
      reason: "unlocked",
      points_balance: 4,
    });
    expect(FAKE_SOURCE).toContain(
      "do not prove Story 4 / 5 / 8 migrations were applied",
    );
  });
});
