import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(join(dir, "20260925000000_subscriptions.sql"), "utf8");

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

function tableBlock(sql: string, table: string) {
  const match = new RegExp(
    `create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`,
    "i",
  ).exec(sql);
  expect(match, `create table ${table}`).not.toBeNull();
  return match![1].toLowerCase();
}

describe("subscriptions migration", () => {
  it("defines subscriptions columns, one row per user and unique merchant_trade_no", () => {
    const block = tableBlock(stripComments(SQL), "subscriptions");
    for (const column of [
      "id uuid primary key",
      "user_id uuid not null references auth.users (id) on delete cascade",
      "plan_id text not null",
      "order_id uuid references public.orders (id)",
      "merchant_trade_no text not null",
      "status text not null",
      "current_period_start timestamptz not null",
      "current_period_end timestamptz not null",
    ]) {
      expect(block).toContain(column);
    }
    expect(block).toMatch(/unique \(user_id\)/);
    expect(block).toMatch(/unique \(merchant_trade_no\)/);
  });

  it("limits subscription status without pending", () => {
    const block = tableBlock(stripComments(SQL), "subscriptions");
    expect(block).toMatch(
      /check \(status in \('active', 'past_due', 'cancelled', 'expired'\)\)/,
    );
    expect(block).not.toContain("'pending'");
  });

  it("keeps updated_at current on subscriptions", () => {
    const sql = stripComments(SQL);
    expect(sql).toMatch(
      /create trigger subscriptions_set_updated_at\s+before update on public\.subscriptions/i,
    );
  });

  it("defines subscription_events with cascades, unique idempotency key and event types", () => {
    const block = tableBlock(stripComments(SQL), "subscription_events");
    for (const column of [
      "subscription_id uuid not null references public.subscriptions (id) on delete cascade",
      "user_id uuid not null references auth.users (id) on delete cascade",
      "event_type text not null",
      "idempotency_key text not null",
      "gwsr text",
      "total_success_times integer",
      "rtn_code text",
      "processed_at timestamptz not null",
    ]) {
      expect(block).toContain(column);
    }
    expect(block).toMatch(/unique \(idempotency_key\)/);
    for (const type of [
      "first_success",
      "first_duplicate",
      "renewal_success",
      "payment_failed",
      "cancelled",
      "expired",
    ]) {
      expect(block).toContain(`'${type}'`);
    }
  });

  it.each(["subscriptions", "subscription_events"])(
    "enables RLS on %s with own SELECT and no client writes",
    (table) => {
      const sql = stripComments(SQL);
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i"),
      );
      expect(sql).toMatch(
        new RegExp(
          `create policy ${table}_select_own\\s+on public\\.${table}\\s+for select\\s+to authenticated\\s+using \\(auth\\.uid\\(\\) = user_id\\)`,
          "i",
        ),
      );
      expect(sql).not.toMatch(
        new RegExp(
          `create policy \\w+\\s+on public\\.${table}\\s+for (insert|update|delete|all)`,
          "i",
        ),
      );
      expect(sql).toMatch(new RegExp(`revoke all on table public\\.${table} from anon`, "i"));
      expect(sql).toMatch(
        new RegExp(
          `revoke insert, update, delete on table public\\.${table} from authenticated`,
          "i",
        ),
      );
      expect(sql).toMatch(
        new RegExp(`grant select on table public\\.${table} to authenticated`, "i"),
      );
    },
  );

  it("does not alter orders or profiles", () => {
    const sql = stripComments(SQL);
    expect(sql).not.toMatch(/alter table public\.(orders|profiles)/i);
  });
});
