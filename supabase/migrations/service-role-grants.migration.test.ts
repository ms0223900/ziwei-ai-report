import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

// 10/30 起新專案不再自動授權 service_role；各 migration 須自行 grant 伺服器端實際用到的最小權限。
const EXPECTED: [file: string, table: string, privileges: string][] = [
  ["20260905000000_create_reports.sql", "reports", "select, insert"],
  ["20260913000000_create_profiles.sql", "profiles", "select, insert, update"],
  ["20260918000000_create_orders.sql", "orders", "select, insert, update"],
  ["20260921000000_point_ledger_and_unlocks.sql", "point_transactions", "select"],
  ["20260921000000_point_ledger_and_unlocks.sql", "report_unlocks", "select"],
  ["20260925000000_subscriptions.sql", "subscriptions", "select"],
  ["20260925000000_subscriptions.sql", "subscription_events", "select"],
  ["20260928000000_notifications_admin_actions.sql", "notifications", "select, insert, update"],
  ["20260928000000_notifications_admin_actions.sql", "admin_actions", "select, insert"],
];

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

describe("service_role table grants", () => {
  it.each(EXPECTED)("%s grants %s: %s", (file, table, privileges) => {
    const sql = stripComments(readFileSync(join(dir, file), "utf8"));
    expect(sql).toContain(`grant ${privileges} on table public.${table} to service_role;`);
  });

  it("never grants delete to service_role", () => {
    for (const file of new Set(EXPECTED.map(([f]) => f))) {
      const sql = stripComments(readFileSync(join(dir, file), "utf8"));
      expect(sql).not.toMatch(/grant [^;]*\bdelete\b[^;]* to service_role/i);
    }
  });
});
