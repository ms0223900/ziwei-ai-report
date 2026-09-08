import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";
import advancedValid from "../generation/fixtures/advanced.valid.json";
import basicValid from "../generation/fixtures/basic.valid.json";
import { buildSuccessReportInsert, insertReport } from "./store";

const { createServiceRoleClient } = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createServiceRoleClient,
}));

const input = {
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  time_unknown: true,
  focus: "工作" as const,
  basic_json: basicValid,
  advanced_json: advancedValid,
  model: "mock",
  provider: "mock",
  prompt_version: "zwds-v1",
  schema_version: "1",
  request_id: "req_us016_test",
  generated_at: "2026-09-08T02:00:00.000Z",
};

function mockInsertResult(
  result: { data: Record<string, unknown> | null; error: { message: string } | null },
) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  createServiceRoleClient.mockResolvedValue({ from });
  return { from, insert, select, single };
}

describe("buildSuccessReportInsert", () => {
  it("writes both json blobs and hard-codes status=basic", () => {
    const row = buildSuccessReportInsert({
      ...input,
      // @ts-expect-error — callers must not unlock via insert
      status: "unlocked",
      generation_status: "pending",
    });

    expect(row.basic_json).toEqual(basicValid);
    expect(row.advanced_json).toEqual(advancedValid);
    expect(row.status).toBe("basic");
    expect(row.generation_status).toBe("success");
    expect(row.basic_json.report_id).toBe("rpt_demo_001");
  });
});

describe("insertReport", () => {
  beforeEach(() => {
    createServiceRoleClient.mockReset();
  });

  it("returns the DB uuid row on success", async () => {
    const dbId = "11111111-1111-4111-8111-111111111111";
    const { from, insert } = mockInsertResult({
      data: {
        ...buildSuccessReportInsert(input),
        id: dbId,
        created_at: "2026-09-08T02:00:01.000Z",
      },
      error: null,
    });

    const row = await insertReport(input);

    expect(from).toHaveBeenCalledWith("reports");
    expect(insert).toHaveBeenCalledWith(buildSuccessReportInsert(input));
    expect(row.id).toBe(dbId);
    expect(row.id).not.toBe("rpt_demo_001");
    expect(row.status).toBe("basic");
    expect(row.generation_status).toBe("success");
    expect(row.basic_json).toEqual(basicValid);
    expect(row.advanced_json).toEqual(advancedValid);
  });

  it("throws persistFailedError when insert fails", async () => {
    mockInsertResult({ data: null, error: { message: "insert failed" } });

    await expect(insertReport(input)).rejects.toMatchObject({
      error_code: "PERSIST_FAILED",
      status: 503,
      message: "儲存失敗，請再試一次。",
    } satisfies Partial<AppError>);
  });
});
