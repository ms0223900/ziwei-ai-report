export const dynamic = "force-dynamic";

// Placeholder until the PeriodReturnURL handler is implemented.
export async function POST(): Promise<Response> {
  return new Response("0|Error", {
    status: 501,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
