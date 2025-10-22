
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeAiResponse } from "@/lib/ai-schema";
import { calibrateKg } from "@/lib/kg-calibration"; 
import { normalizeRegion } from "@/lib/region-map";
import { pickOne } from "@/lib/select-normalize";
import { TRANSPORT_KG, DIET_KG, DRINK_KG } from "@/lib/carbon-calculator";
import { analyzeFootprint } from "@/ai/flows/carbon-footprint-analysis";
import { toEnergyEnum } from "@/lib/energy-map";
import { extractJsonObject } from "@/lib/json-sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const region = normalizeRegion(body.region);
    const transport = pickOne(body.transport, TRANSPORT_KG, "worst");
    const diet      = pickOne(body.diet,      DIET_KG,      "worst");
    const drink     = pickOne(body.drink,     DRINK_KG,     "worst");
    const energy    = toEnergyEnum(body.energy ?? "low");

    // compute finalKg yourself; model only writes text
    const finalKg = calibrateKg(region, transport, diet, drink, energy);

    // This call returns an object, which might have nulls
    const aiRaw = await analyzeFootprint({
      ...body,
      language: body.language || 'en',
      region: body.region || 'Europe',
    });

    const safe = sanitizeAiResponse(aiRaw, finalKg);
    return NextResponse.json({ ok:true, ...safe });
  } catch (e:any) {
    // absolute fallback if the model dies
    console.error("Carbon analysis API failed:", e);
    const finalKg = 0; // Or calculate a deterministic one here as a last resort
    return NextResponse.json(
      sanitizeAiResponse({
        estimatedFootprintKg: finalKg
      }, finalKg)
    );
  }
}
