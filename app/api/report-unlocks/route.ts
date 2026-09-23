export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json(
    { error_code: "NOT_IMPLEMENTED", message: "尚未實作。" },
    { status: 501 },
  );
}
