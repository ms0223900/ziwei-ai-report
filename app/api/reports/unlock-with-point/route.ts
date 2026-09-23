export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  return Response.json(
    { error_code: "NOT_IMPLEMENTED" },
    { status: 501 },
  );
}
