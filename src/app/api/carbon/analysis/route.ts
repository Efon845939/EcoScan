
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // minimal proof-of-life: echo payload
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, ping: "analysis-alive", received: body });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message ?? "unknown" }, { status: 500 });
  }
}
