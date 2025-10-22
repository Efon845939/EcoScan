
export const runtime = "nodejs";
export async function GET() {
  return new Response(JSON.stringify({ ok: true, service: "health" }), {
    headers: { "content-type": "application/json" },
  });
}
