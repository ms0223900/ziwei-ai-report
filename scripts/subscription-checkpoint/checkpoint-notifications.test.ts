import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (name: string) =>
  readFileSync(join(dir, name), "utf8").replace(/--[^\n]*/g, " ");

describe("subscription checkpoint notifications (unit 7 US-017)", () => {
  it("inserts subscription_inactive in a separate transaction after the cancel commit", () => {
    const sql = read("cancel.sql");
    const cancelAt = sql.indexOf("cancel_subscription(");
    const firstCommit = sql.indexOf("commit;", cancelAt);
    const insertAt = sql.indexOf("insert into public.notifications");

    expect(cancelAt).toBeGreaterThan(-1);
    expect(firstCommit).toBeGreaterThan(cancelAt);
    expect(insertAt).toBeGreaterThan(firstCommit);
    expect(sql.slice(firstCommit, insertAt)).toMatch(/begin;/);
  });

  it("keys the notification by the cancelled event id and skips duplicates", () => {
    const sql = read("cancel.sql");
    expect(sql).toMatch(/'subscription_inactive', 'subscription_event', e\.id::text, 'sub:' \|\| e\.id/);
    expect(sql).toMatch(/'cancel:' \|\| s\.id \|\| ':' \|\| s\.merchant_trade_no/);
    expect(sql).toMatch(/on conflict \(idempotency_key\) do nothing/);
  });

  it("does not add notifications to expire.sql", () => {
    expect(read("expire.sql")).not.toMatch(/notifications/);
  });
});
