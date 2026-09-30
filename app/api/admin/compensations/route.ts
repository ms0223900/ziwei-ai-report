// TODO(US-025)：實作。此為 US-024 測試用空殼，只為讓測試能載入。
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  void request;
  throw new Error("not implemented");
}
