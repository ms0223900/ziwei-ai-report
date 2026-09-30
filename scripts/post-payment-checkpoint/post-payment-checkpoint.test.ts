import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (name: string) =>
  readFileSync(join(dir, name), "utf8").replace(/--[^\n]*/g, " ");

describe("unit 7 post-payment checkpoint scripts (US-029)", () => {
  it("fixture declares service_role inside the transaction before writing", () => {
    const sql = read("fixture-paid-no-credit.sql");
    const begin = sql.indexOf("begin;");
    const role = sql.indexOf("set_config('request.jwt.claim.role', 'service_role', true)");
    const firstWrite = sql.search(/\b(delete from|insert into)\b/);
    expect(begin).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(begin);
    expect(firstWrite).toBeGreaterThan(role);
  });

  it("fixture is a paid points pack with trade_no and payment_date and no credit", () => {
    const sql = read("fixture-paid-no-credit.sql");
    expect(sql).toMatch(/'points_pack_5', 'TESTFIXPTS0001', 49, 'TWD', 'paid', 'TESTTRADE0001', now\(\)/);
    expect(sql).not.toMatch(/insert into public\.point_transactions/);
    expect(sql).not.toMatch(/fulfill_points_pack_order|points_balance\s*=/);
  });

  it("fixture clears its previous run in foreign-key order so it can be re-run", () => {
    const sql = read("fixture-paid-no-credit.sql");
    const order = [
      "delete from public.notifications",
      "delete from public.admin_actions",
      "delete from public.point_transactions",
      "delete from public.orders",
      "insert into public.orders",
    ].map((stmt) => sql.indexOf(stmt));
    expect(order.every((pos) => pos > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("mark-failed only moves pending to failed", () => {
    const sql = read("mark-failed.sql");
    expect(sql).toMatch(/update public\.orders\s+set status = 'failed'\s+where id = '<ORDER uuid>'\s+and status = 'pending';/);
  });

  it("mark-failed writes order_failed in a separate transaction after the status commit", () => {
    const sql = read("mark-failed.sql");
    const update = sql.indexOf("update public.orders");
    const commit = sql.indexOf("commit;", update);
    const insert = sql.indexOf("insert into public.notifications");
    expect(insert).toBeGreaterThan(commit);
    expect(sql.slice(commit, insert)).toMatch(/begin;/);
    expect(sql).toMatch(/'order_failed', 'order', o\.id::text, 'order-failed:' \|\| o\.id/);
    expect(sql).toMatch(/and o\.status = 'failed'\s+on conflict \(idempotency_key\) do nothing/);
  });

  it("uses the same key and guard as lib/payments/mark-order-failed.ts", () => {
    const ts = readFileSync(join(dir, "../../lib/payments/mark-order-failed.ts"), "utf8");
    expect(ts).toContain('.eq("status", "pending")');
    expect(ts).toContain("`order-failed:${orderId}`");
  });
});
