import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(join(dir, "20260925000001_subscriptions_rpc.sql"), "utf8");

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

function functionBody(sql: string, name: string) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  const end = sql.indexOf("$$;", start);
  return sql.slice(start, end).toLowerCase();
}

const NEW_RPCS = [
  ["activate_subscription_from_order", "uuid"],
  ["apply_subscription_period_event", "text, text, text, text, integer, text, timestamptz"],
  ["cancel_subscription", "uuid"],
] as const;

describe("subscriptions rpc migration", () => {
  it("activate checks the return event before touching the subscription row", () => {
    const body = functionBody(stripComments(SQL), "activate_subscription_from_order");
    expect(body).toMatch(/activate_subscription_from_order\(p_order_id uuid\)/);
    expect(body).toMatch(/returns table \(ok boolean, reason text\)/);
    expect(body).toMatch(/from public\.orders o\s+where o\.id = p_order_id\s+for update/);
    const keyCheck = body.indexOf("'already_fulfilled'");
    const upsert = body.indexOf("update public.subscriptions");
    expect(body).toContain("'return:' || v_order.merchant_trade_no");
    expect(keyCheck).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(keyCheck);
    expect(body).toContain("'conflict'");
    expect(body).toContain("'first_success'");
    expect(body).toMatch(/at time zone 'asia\/taipei'\) \+ interval '1 month'\) at time zone 'asia\/taipei'/);
    expect(body).toMatch(/set subscription_status = 'active'/);
    expect(body).not.toMatch(/access_status|points_balance|report_unlocks/);
  });

  it("period event locks the subscription and inserts the event before changing the period", () => {
    const body = functionBody(stripComments(SQL), "apply_subscription_period_event");
    expect(body).toMatch(/where s\.merchant_trade_no = p_merchant_trade_no\s+for update/);
    const insert = body.indexOf("insert into public.subscription_events");
    const extend = body.indexOf("+ interval '1 month'");
    expect(insert).toBeGreaterThan(-1);
    expect(extend).toBeGreaterThan(insert);
    expect(body).toMatch(/when unique_violation then\s+return query select true, 'already_processed'/);
    expect(body).toMatch(/coalesce\(p_processed_at, now\(\)\)/);
    expect(body).toMatch(/v_sub\.status in \('cancelled', 'expired'\)[\s\S]*'recorded_inactive'/);
    expect(body).toContain("'duplicate_first'");
    expect(body).toMatch(/set status = 'past_due'/);
  });

  it("cancel inserts an idempotent event keyed by subscription and trade no, then cuts the period", () => {
    const body = functionBody(stripComments(SQL), "cancel_subscription");
    expect(body).toContain("'cancel:' || v_sub.id || ':' || v_sub.merchant_trade_no");
    expect(body).toContain("'already_cancelled'");
    const insert = body.indexOf("insert into public.subscription_events");
    const cut = body.indexOf("current_period_end = now() - interval '1 second'");
    expect(insert).toBeGreaterThan(-1);
    expect(cut).toBeGreaterThan(insert);
    expect(body).not.toMatch(/delete from/);
  });

  it("keeps unlock_report_with_point signature and adds the subscription branch before debiting", () => {
    const body = functionBody(stripComments(SQL), "unlock_report_with_point");
    expect(body).toMatch(/unlock_report_with_point\(report_id uuid, p_user_id uuid\)/);
    expect(body).toMatch(/returns table \(ok boolean, reason text, points_balance integer\)/);
    const already = body.indexOf("'already_unlocked'");
    const subscription = body.indexOf("'subscription'");
    const debit = body.indexOf("points_balance - 1");
    expect(already).toBeGreaterThan(-1);
    expect(subscription).toBeGreaterThan(already);
    expect(debit).toBeGreaterThan(subscription);
    expect(body).toMatch(/s\.current_period_end >= now\(\)/);
  });

  it.each(NEW_RPCS)("runs %s as security definer and grants it only to service_role", (name, args) => {
    const sql = stripComments(SQL);
    expect(functionBody(sql, name)).toMatch(/security definer\s+set search_path = public/);
    for (const role of ["public", "anon", "authenticated"]) {
      expect(sql).toContain(`revoke all on function public.${name}(${args}) from ${role};`);
    }
    expect(sql).toContain(`grant execute on function public.${name}(${args}) to service_role;`);
  });
});
