
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { analyzeFootprint } from "@/ai/flows/carbon-footprint-analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const analysisResult = await analyzeFootprint({
      language: body.language,
      region: body.region,
      transport: body.transport,
      diet: body.diet,
      energy: body.energy,
      other: '',
    });
    
    return NextResponse.json({ ok: true, ...analysisResult });

  } catch (e: any) {
    console.error("Carbon analysis API error:", e);
    return NextResponse.json({ ok: false, error: e.message ?? "unknown" }, { status: 500 });
  }
}
