// TODO(US-022)：實作。此為 US-021 測試用空殼，只為讓測試能載入。
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  void context;
  throw new Error("not implemented");
}
