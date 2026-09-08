import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import advancedValid from "../generation/fixtures/advanced.valid.json";
import basicValid from "../generation/fixtures/basic.valid.json";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({})),
}));

const hasLiveSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

describe.skipIf(!hasLiveSupabase)("insertReport live", () => {
  it("inserts both json blobs via service-role and returns a uuid id", async () => {
    const { insertReport } = await import("./store");
    const requestId = `us016-live-${randomUUID()}`;

    const row = await insertReport({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: null,
      time_unknown: true,
      focus: "工作",
      basic_json: basicValid,
      advanced_json: advancedValid,
      model: "mock",
      provider: "mock",
      prompt_version: "zwds-v1",
      schema_version: "1",
      request_id: requestId,
      generated_at: new Date().toISOString(),
    });

    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(row.id).not.toBe("rpt_demo_001");
    expect(row.status).toBe("basic");
    expect(row.generation_status).toBe("success");
    expect(row.basic_json).toMatchObject({ report_id: "rpt_demo_001" });
    expect(row.advanced_json).toMatchObject({ report_id: "rpt_demo_001" });
    expect(row.request_id).toBe(requestId);
  });
});
