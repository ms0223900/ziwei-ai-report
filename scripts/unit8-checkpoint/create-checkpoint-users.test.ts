import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const raw = (path: string) => readFileSync(join(dir, path), "utf8");
const sql = raw("create-checkpoint-users.sql").replace(/--[^\n]*/g, " ");

const ACCOUNTS = [
  { label: "A", email: "checkpoint.a@aaa.com" },
  { label: "B", email: "checkpoint.b@aaa.com" },
  { label: "C", email: "checkpoint.c@aaa.com" },
  { label: "D", email: "checkpoint.d@aaa.com" },
];
const ADMIN = { id: "a6583f5f-f0a5-4617-9bf8-e4b69355520f", email: "admin_test.a@aaa.com" };

// 固定 UUID 以 reset-checkpoint.sql 為準，帳號建置腳本必須和它一致，兩邊才接得起來。
function resetUuids() {
  const reset = raw("../subscription-checkpoint/reset-checkpoint.sql");
  const values = reset.slice(reset.indexOf("insert into checkpoint_users"));
  return [...values.matchAll(/\(\s*'([0-9a-f-]{36})'/g)].slice(0, 4).map((m) => m[1]);
}

describe("create-checkpoint-users.sql (unit 8 帳號建置)", () => {
  it("uses the same four UUIDs as reset-checkpoint.sql, in the same A～D order", () => {
    const ids = resetUuids();
    expect(ids).toHaveLength(4);
    ACCOUNTS.forEach((account, index) => {
      const row = new RegExp(`\\('${ids[index]}', '${account.email.replace(/\./g, "\\.")}'\\)`);
      expect(sql).toMatch(row);
    });
  });

  it("also creates the ADMIN test account", () => {
    expect(sql).toContain(`'${ADMIN.id}', '${ADMIN.email}'`);
  });

  it("runs in one transaction and inserts auth.users then auth.identities, both idempotent", () => {
    const begin = sql.indexOf("begin;");
    const users = sql.indexOf("insert into auth.users");
    const identities = sql.indexOf("insert into auth.identities");
    const commit = sql.lastIndexOf("commit;");
    expect(begin).toBeGreaterThan(-1);
    expect(users).toBeGreaterThan(begin);
    expect(identities).toBeGreaterThan(users);
    expect(commit).toBeGreaterThan(identities);
    expect(sql.match(/on conflict do nothing/g)).toHaveLength(2);
  });

  it("gives every user an email identity and confirmed email with empty token columns", () => {
    expect(sql).toMatch(/'email', now\(\), now\(\), now\(\)/);
    expect(sql).toMatch(/jsonb_build_object\('sub', s\.id::text, 'email', s\.email, 'email_verified', true\)/);
    expect(sql).toMatch(/'', '', '', ''/);
    expect(sql).toMatch(/crypt\('Test1234', gen_salt\('bf'\)\)/);
  });

  it("only inserts: it never deletes or updates existing data", () => {
    expect(sql).not.toMatch(/\b(delete from|update )\b/);
  });

  it("ends with a check that reports a missing user, a taken email and a missing profile", () => {
    expect(sql).toMatch(/as user_exists/);
    expect(sql).toMatch(/as email_used_by_other_uuid/);
    expect(sql).toMatch(/as profile_exists/);
  });
});
