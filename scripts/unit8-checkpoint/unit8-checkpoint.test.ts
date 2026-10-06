import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const raw = (name: string) => readFileSync(join(dir, name), "utf8");
const read = (name: string) => raw(name).replace(/--[^\n]*/g, " ");

const D = "fc5f35a3-8e99-416b-a422-cb645feb0031";
const FIXTURES = [
  "fixture-lifetime-pending.sql",
  "fixture-points-zero.sql",
  "fixture-points-replay.sql",
  "fixture-notification-missing.sql",
];

function expectInOrder(sql: string, statements: string[]) {
  const positions = statements.map((stmt) => sql.indexOf(stmt));
  expect(positions.every((pos) => pos > -1)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
}

describe("unit 8 checkpoint fixtures (US-004～US-006)", () => {
  it.each(FIXTURES)("%s is marked checkpoint-only and declares service_role before writing", (name) => {
    expect(raw(name)).toContain("只給 Checkpoint 使用，不改 Webhook 分派");
    const sql = read(name);
    const begin = sql.indexOf("begin;");
    const role = sql.indexOf("set_config('request.jwt.claim.role', 'service_role', true)");
    const claims = sql.indexOf(`set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
    const firstWrite = sql.search(/\b(delete from|insert into|update public)\b|fulfill_points_pack_order/);
    expect(begin).toBeGreaterThan(-1);
    expect(role).toBeGreaterThan(begin);
    expect(claims).toBeGreaterThan(begin);
    expect(firstWrite).toBeGreaterThan(Math.max(role, claims));
  });

  it.each(FIXTURES)("%s targets account D and never moves orders.status", (name) => {
    const sql = read(name);
    expect(sql).toContain(D);
    expect(sql).not.toMatch(/update public\.orders/);
  });

  describe("fixture-lifetime-pending.sql (US-004)", () => {
    const sql = read("fixture-lifetime-pending.sql");

    it("clears the previous run in foreign-key order", () => {
      expectInOrder(sql, [
        "delete from public.notifications",
        "delete from public.admin_actions",
        "delete from public.orders",
        "insert into public.orders",
      ]);
      expect(sql).toMatch(
        /delete from public\.notifications\s+where source_id in \(select id::text from public\.orders where merchant_trade_no = 'TESTU8LIFE0001'\)/,
      );
    });

    it("locks D and creates a pending lifetime order without trade_no", () => {
      expect(sql).toMatch(/set access_status = 'locked'/);
      expect(sql).toMatch(
        /\(user_id, plan_id, merchant_trade_no, amount, currency, status\)\s+values \('[^']+', 'unlock_report_lifetime', 'TESTU8LIFE0001', 99, 'TWD', 'pending'\)/,
      );
      expect(sql).not.toMatch(/\btrade_no\b|'paid'/);
    });

    it("writes order_pending with the checkout route key and selects the order", () => {
      expect(sql).toMatch(/'order_pending', 'order', id::text, 'order-pending:' \|\| id/);
      expect(sql).toMatch(/select o\.id as order_id, o\.status, p\.access_status/);
      const ts = readFileSync(join(dir, "../../app/api/payments/checkout/route.ts"), "utf8");
      expect(ts).toContain("`order-pending:${orderId}`");
    });
  });

  describe("fixture-points-zero.sql (US-005)", () => {
    const sql = read("fixture-points-zero.sql");

    it("removes subscription events before subscriptions and report unlocks", () => {
      expectInOrder(sql, [
        "delete from public.subscription_events",
        "delete from public.subscriptions",
        "delete from public.report_unlocks",
        "update public.profiles",
      ]);
    });

    it("resets D to 0 points, locked, no subscription inside a commented init step", () => {
      expect(sql).toMatch(
        /set points_balance = 0,\s+access_status = 'locked',\s+subscription_status = 'none'/,
      );
      expect(raw("fixture-points-zero.sql")).toMatch(/-- 2\. 初始化/);
    });

    it("creates one successful report R and selects its id", () => {
      expect(sql).toMatch(/insert into public\.reports/);
      expect(sql).toContain("'success'");
      expect(sql).toMatch(/select r\.id as report_id/);
      expect(sql).toMatch(/order by r\.created_at desc\s+limit 1/);
    });
  });

  describe("fixture-points-replay.sql (US-005)", () => {
    const sql = read("fixture-points-replay.sql");

    it("clears the previous run in foreign-key order", () => {
      expectInOrder(sql, [
        "delete from public.notifications",
        "delete from public.admin_actions",
        "delete from public.point_transactions",
        "delete from public.orders",
        "insert into public.orders",
      ]);
    });

    it("creates a pending points pack without writing credit", () => {
      expect(sql).toMatch(/'points_pack_5', 'TESTU8PTS0001', 49, 'TWD', 'pending'/);
      expect(sql).not.toMatch(/insert into public\.point_transactions|fulfill_points_pack_order|points_balance\s*=/);
    });

    it("selects order_id, status, this order's credits and balance", () => {
      expect(sql).toMatch(/select o\.id as order_id,\s+o\.status,/);
      expect(sql).toMatch(/t\.source_order_id = o\.id and t\.type = 'credit_purchase'\) as credits/);
      expect(sql).toMatch(/p\.points_balance/);
    });
  });

  describe("fixture-notification-missing.sql (US-006)", () => {
    const sql = read("fixture-notification-missing.sql");

    it("inserts a paid points pack idempotently", () => {
      expect(sql).toMatch(
        /'points_pack_5', 'TESTU8NTF0001', 49, 'TWD', 'paid', 'TESTU8TRADE0001', now\(\)\s+\)\s+on conflict \(merchant_trade_no\) do nothing/,
      );
    });

    it("credits through the existing RPC looked up by MTN, then deletes the success notification", () => {
      expectInOrder(sql, [
        "insert into public.orders",
        "fulfill_points_pack_order(\n  (select id from public.orders where merchant_trade_no = 'TESTU8NTF0001')",
        "delete from public.notifications",
      ]);
      expect(sql).toMatch(
        /where idempotency_key = 'credit:' \|\| \(select id from public\.orders where merchant_trade_no = 'TESTU8NTF0001'\)/,
      );
      expect(sql).not.toMatch(/insert into public\.notifications|insert into public\.point_transactions/);
    });

    it("uses the same success key as the ReturnURL webhook and selects the evidence", () => {
      const ts = readFileSync(join(dir, "../../app/api/payments/ecpay/webhook/route.ts"), "utf8");
      expect(ts).toContain("`credit:${order.id}`");
      expect(sql).toMatch(/as credits,/);
      expect(sql).toMatch(/as credit_notifications,/);
      expect(sql).toMatch(/select o\.id as order_id,\s+o\.status,/);
    });
  });
});
