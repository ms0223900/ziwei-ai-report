import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const LEDGER_SQL = readFileSync(
  join(dir, "20260921000000_point_ledger_and_unlocks.sql"),
  "utf8",
);
const PROFILES_SQL = readFileSync(
  join(dir, "20260913000000_create_profiles.sql"),
  "utf8",
);
const ORDERS_SQL = readFileSync(
  join(dir, "20260918000000_create_orders.sql"),
  "utf8",
);

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

describe("point ledger and unlocks migration", () => {
  it("adds reports.user_id without rewriting the original reports table", () => {
    const sql = stripComments(LEDGER_SQL);
    expect(sql).toMatch(
      /alter table public\.reports\s+add column user_id uuid references auth\.users/i,
    );
    expect(sql).toMatch(/create (or replace )?function public\.reports_guard_user_id/i);
    expect(sql).toMatch(/new\.user_id is distinct from old\.user_id/i);
    expect(sql).toMatch(/service_role/i);
    expect(sql).not.toMatch(/create table public\.reports/i);
  });

  it("defines point_transactions columns, credit unique, and debit report_id", () => {
    const sql = stripComments(LEDGER_SQL).toLowerCase();
    expect(sql).toContain("create table public.point_transactions");
    for (const column of [
      "id uuid primary key",
      "user_id uuid not null",
      "delta integer not null",
      "type text not null",
      "source_order_id uuid",
      "report_id uuid",
      "created_at timestamptz",
    ]) {
      expect(sql).toContain(column);
    }
    expect(sql).toMatch(/credit_purchase['"]?\s*,\s*['"]debit_unlock/);
    expect(sql).toMatch(
      /point_transactions_source_order_id_key unique\s*\(\s*source_order_id\s*\)/,
    );
    expect(sql).toMatch(
      /type <> 'credit_purchase' or source_order_id is not null/,
    );
    expect(sql).toMatch(/type <> 'debit_unlock' or report_id is not null/);
  });

  it("defines report_unlocks composite unique and debit transaction_id", () => {
    const sql = stripComments(LEDGER_SQL);
    expect(sql).toMatch(/create table public\.report_unlocks/i);
    expect(sql).toMatch(/primary key\s*\(\s*user_id\s*,\s*report_id\s*\)/i);
    expect(sql).toMatch(
      /transaction_id uuid not null references public\.point_transactions/i,
    );
  });

  it("enables RLS with own SELECT and no authenticated writes", () => {
    const sql = stripComments(LEDGER_SQL);
    expect(sql).toMatch(
      /alter table public\.point_transactions enable row level security/i,
    );
    expect(sql).toMatch(
      /alter table public\.report_unlocks enable row level security/i,
    );
    expect(sql).toMatch(
      /create policy point_transactions_select_own[\s\S]*for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\) = user_id/i,
    );
    expect(sql).toMatch(
      /create policy report_unlocks_select_own[\s\S]*for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\) = user_id/i,
    );
    expect(sql).not.toMatch(
      /create policy[\s\S]*on public\.point_transactions[\s\S]*for (insert|update|delete)/i,
    );
    expect(sql).not.toMatch(
      /create policy[\s\S]*on public\.report_unlocks[\s\S]*for (insert|update|delete)/i,
    );
    expect(sql).toMatch(
      /revoke insert,\s*update,\s*delete on table public\.point_transactions from authenticated/i,
    );
    expect(sql).toMatch(
      /revoke insert,\s*update,\s*delete on table public\.report_unlocks from authenticated/i,
    );
    expect(sql).toMatch(
      /revoke insert,\s*update,\s*delete on table public\.reports from authenticated/i,
    );
    expect(sql).toMatch(
      /grant select on table public\.point_transactions to authenticated/i,
    );
    expect(sql).toMatch(
      /grant select on table public\.report_unlocks to authenticated/i,
    );
  });

  it("does not add profiles columns or orders.fulfilled_at", () => {
    const sql = stripComments(LEDGER_SQL);
    expect(sql).not.toMatch(/alter table public\.profiles/i);
    expect(sql).not.toMatch(/fulfilled_at/i);
    expect(sql).not.toMatch(/access_status/i);
    expect(PROFILES_SQL).toMatch(/profiles_guard_entitlements/);
    expect(stripComments(ORDERS_SQL)).not.toMatch(/fulfilled_at/i);
  });
});
