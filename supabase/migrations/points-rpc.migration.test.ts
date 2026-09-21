import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const RPC_SQL = readFileSync(join(dir, "20260921000001_points_rpc.sql"), "utf8");

function stripComments(sql: string) {
  return sql.replace(/--[^\n]*/g, " ");
}

describe("points rpc migration", () => {
  it("credits in one transaction and treats unique conflict as fulfilled", () => {
    const sql = stripComments(RPC_SQL);
    expect(sql).toMatch(
      /create or replace function public\.fulfill_points_pack_order\s*\(\s*order_id uuid\s*\)/i,
    );
    expect(sql).toMatch(/insert into public\.point_transactions/i);
    expect(sql).toMatch(/points_balance = public\.profiles\.points_balance \+ 5/i);
    expect(sql).toMatch(/when unique_violation then/i);
    expect(sql).toMatch(/already_fulfilled/i);
    const insertIdx = sql.toLowerCase().indexOf("insert into public.point_transactions");
    const updateIdx = sql.toLowerCase().indexOf("points_balance + 5");
    expect(insertIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(insertIdx);
  });

  it("unlocks with p_user_id and does not use auth.uid for ownership", () => {
    const sql = stripComments(RPC_SQL);
    expect(sql).toMatch(
      /create or replace function public\.unlock_report_with_point\s*\(\s*report_id uuid,\s*p_user_id uuid\s*\)/i,
    );
    expect(sql).toMatch(/v_owner is distinct from p_user_id/i);
    expect(sql).not.toMatch(/auth\.uid\s*\(/i);
    expect(sql).toMatch(/reason text/i);
    expect(sql).toMatch(/'forbidden'/i);
    expect(sql).toMatch(/'lifetime'/i);
    expect(sql).toMatch(/'already_unlocked'/i);
    expect(sql).toMatch(/'insufficient'/i);
    expect(sql).toMatch(/'unlocked'/i);
  });

  it("rolls debit and unlock together and maps unique conflict to already_unlocked", () => {
    const sql = stripComments(RPC_SQL);
    expect(sql).toMatch(/points_balance >= 1/i);
    expect(sql).toMatch(/debit_unlock/i);
    expect(sql).toMatch(/insert into public\.report_unlocks/i);
    expect(sql).toMatch(/when unique_violation then/i);
    expect(sql).toMatch(/already_unlocked/i);
  });

  it("does not write access_status, reports.status, or fulfilled_at", () => {
    const sql = stripComments(RPC_SQL);
    expect(sql).not.toMatch(/set\s+access_status/i);
    expect(sql).not.toMatch(/reports\.status/i);
    expect(sql).not.toMatch(/fulfilled_at/i);
    expect(sql).toMatch(/grant execute on function public\.fulfill_points_pack_order/i);
    expect(sql).toMatch(/grant execute on function public\.unlock_report_with_point/i);
    expect(sql).toMatch(
      /revoke all on function public\.unlock_report_with_point\(uuid, uuid\) from authenticated/i,
    );
  });
});
