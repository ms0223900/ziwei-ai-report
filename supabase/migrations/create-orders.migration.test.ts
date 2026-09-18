import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const ORDERS_SQL = readFileSync(
  join(dir, "20260918000000_create_orders.sql"),
  "utf8",
);
const PROFILES_SQL = readFileSync(
  join(dir, "20260913000000_create_profiles.sql"),
  "utf8",
);
const REPORTS_SQL = readFileSync(
  join(dir, "20260905000000_create_reports.sql"),
  "utf8",
);

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

describe("orders migration", () => {
  it("defines spec columns and unique merchant_trade_no", () => {
    const sql = stripComments(ORDERS_SQL);
    expect(sql).toMatch(/create table public\.orders/i);
    for (const column of [
      "id uuid primary key",
      "user_id uuid not null",
      "plan_id text not null",
      "merchant_trade_no text not null",
      "amount integer not null",
      "currency text not null",
      "status text not null",
      "trade_no text",
      "payment_date timestamptz",
      "created_at timestamptz",
      "updated_at timestamptz",
    ]) {
      expect(sql.toLowerCase()).toContain(column);
    }
    expect(sql).toMatch(
      /unique\s*\(\s*merchant_trade_no\s*\)/i,
    );
    expect(sql).toMatch(/pending['"]?\s*,\s*['"]paid['"]?\s*,\s*['"]failed/i);
    expect(sql).not.toContain("order_number");
  });

  it("enables RLS with own SELECT and no authenticated writes", () => {
    const sql = stripComments(ORDERS_SQL);
    expect(sql).toMatch(/alter table public\.orders enable row level security/i);
    expect(sql).toMatch(
      /create policy orders_select_own[\s\S]*for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\) = user_id/i,
    );
    expect(sql).not.toMatch(
      /create policy[\s\S]*on public\.orders[\s\S]*for (insert|update|delete)/i,
    );
    expect(sql).toMatch(/revoke all on table public\.orders from anon/i);
    expect(sql).toMatch(
      /revoke insert,\s*update,\s*delete on table public\.orders from authenticated/i,
    );
    expect(sql).toMatch(/grant select on table public\.orders to authenticated/i);
  });

  it("blocks non-service-role status changes to paid", () => {
    const sql = stripComments(ORDERS_SQL);
    expect(sql).toMatch(/create (or replace )?function public\.orders_guard_status/i);
    expect(sql).toMatch(/new\.status is distinct from old\.status/i);
    expect(sql).toMatch(/service_role/i);
    expect(sql).toMatch(/create trigger orders_guard_status/i);
  });

  it("does not change profiles schema or add reports.user_id", () => {
    const orders = stripComments(ORDERS_SQL);
    expect(orders).not.toMatch(/alter table public\.profiles/i);
    expect(orders).not.toMatch(/alter table public\.reports/i);
    expect(orders).not.toMatch(/reports\.user_id/i);
    const reportsTable = stripComments(REPORTS_SQL).match(
      /create table public\.reports\s*\(([\s\S]*?)\)\s*;/i,
    );
    expect(reportsTable?.[1]).not.toMatch(/\buser_id\b/);
    expect(PROFILES_SQL).toMatch(/create table public\.profiles/);
  });
});
