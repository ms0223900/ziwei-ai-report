import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(
  join(dir, "20260928000000_notifications_admin_actions.sql"),
  "utf8",
);

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

describe("notifications / admin_actions migration", () => {
  it("defines notifications columns, defaults and unique idempotency key", () => {
    const block = tableBlock(stripComments(SQL), "notifications");
    for (const column of [
      "id uuid primary key default gen_random_uuid()",
      "user_id uuid not null references auth.users (id) on delete cascade",
      "type text not null",
      "source_type text not null",
      "source_id text not null",
      "idempotency_key text not null",
      "created_at timestamptz not null default now()",
      "read_at timestamptz,",
    ]) {
      expect(block).toContain(column);
    }
    expect(block).toMatch(/unique \(idempotency_key\)/);
  });

  it("limits notifications type to eight values and source_type to four", () => {
    const block = tableBlock(stripComments(SQL), "notifications");
    const types = [
      "order_pending",
      "order_failed",
      "unlock_completed",
      "credit_completed",
      "report_unlocked",
      "subscription_active",
      "subscription_inactive",
      "admin_compensated",
    ];
    for (const type of types) expect(block).toContain(`'${type}'`);
    const typeCheck = /notifications_type_check\s+check \(type in \(([^)]*)\)\)/.exec(block);
    expect(typeCheck).not.toBeNull();
    expect(typeCheck![1].match(/'[a-z_]+'/g)).toHaveLength(8);
    expect(block).toMatch(
      /check \(source_type in \('order', 'report', 'subscription_event', 'admin_action'\)\)/,
    );
  });

  it("defines admin_actions columns, result check and FK to orders", () => {
    const block = tableBlock(stripComments(SQL), "admin_actions");
    for (const column of [
      "id uuid primary key",
      "admin_user_id uuid not null",
      "action text not null",
      "reason text not null",
      "source_order_id uuid not null references public.orders (id)",
      "idempotency_key text not null",
      "before_state jsonb not null",
      "after_state jsonb not null",
      "result text not null",
      "created_at timestamptz not null default now()",
    ]) {
      expect(block).toContain(column);
    }
    expect(block).toMatch(/unique \(idempotency_key\)/);
    expect(block).toMatch(
      /check \(result in \('ok', 'skipped_already_fulfilled', 'rejected'\)\)/,
    );
  });

  it.each(["notifications", "admin_actions"])("enables RLS on %s", (table) => {
    expect(stripComments(SQL)).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
  });

  it("gives authenticated SELECT on own notifications only, no client writes", () => {
    const sql = stripComments(SQL);
    expect(sql).toMatch(
      /create policy notifications_select_own\s+on public\.notifications\s+for select\s+to authenticated\s+using \(auth\.uid\(\) = user_id\)/i,
    );
    expect(sql).not.toMatch(
      /create policy \w+\s+on public\.notifications\s+for (insert|update|delete|all)/i,
    );
    expect(sql).toMatch(/revoke all on table public\.notifications from anon/i);
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.notifications from authenticated/i,
    );
    expect(sql).toMatch(/grant select on table public\.notifications to authenticated/i);
  });

  it("gives anon and authenticated no access to admin_actions", () => {
    const sql = stripComments(SQL);
    expect(sql).toMatch(/revoke all on table public\.admin_actions from anon/i);
    expect(sql).toMatch(/revoke all on table public\.admin_actions from authenticated/i);
    expect(sql).not.toMatch(/create policy \w+\s+on public\.admin_actions/i);
    expect(sql).not.toMatch(/grant [^;]* on table public\.admin_actions/i);
  });

  it("does not use an UPDATE policy to express read_at-only updates", () => {
    expect(stripComments(SQL)).not.toMatch(/for update/i);
  });

  it("does not alter orders or point_transactions", () => {
    expect(stripComments(SQL)).not.toMatch(
      /alter table public\.(orders|point_transactions)/i,
    );
  });
});
