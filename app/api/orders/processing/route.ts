// TODO(US-019)：實作。此為 US-018 測試用空殼，只為讓測試能載入。
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  void request;
  throw new Error("not implemented");
}
