export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeAiResponse } from "@/lib/ai-schema";
import { calibrateKg } from "@/lib/kg-calibration"; 
import { normalizeRegion } from "@/lib/region-map";
import { pickOne } from "@/lib/select-normalize";
import { TRANSPORT_KG, DIET_KG, DRINK_KG, ENERGY_KG } from "@/lib/carbon-calculator";
import { analyzeFootprint } from "@/ai/flows/carbon-footprint-analysis";
import { toEnergyEnum } from "@/lib/energy-map";

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

    const aiRaw = await analyzeFootprint({
      ...body,
      language: body.language || 'en',
      region: body.region || 'Europe',
    });

    const safe = sanitizeAiResponse({ ...aiRaw, estimatedFootprintKg: finalKg });
    return NextResponse.json({ ok:true, ...safe });
  } catch (e:any) {
    // absolute fallback if the model dies
    console.error("Carbon analysis API failed:", e);
    return NextResponse.json({
      ok:true,
      estimatedFootprintKg: 0,
      analysis: "Unable to generate analysis right now. Here are general tips.",
      recommendations: [
        "Walk short distances instead of driving.",
        "Use tap water or unsweetened tea instead of bottled soda.",
        "Turn off unused lights and devices."
      ],
      recoveryActions: [
        "Scan today’s receipt for bonus points.",
        "Complete Verification Center actions.",
        "Lower A/C or heating by 1–2°C today."
      ]
    });
  }
}
