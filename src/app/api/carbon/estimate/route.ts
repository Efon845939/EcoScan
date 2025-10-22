export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { REGIONS, TRANSPORT_KG, DIET_KG, DRINK_KG, ENERGY_KG,
         computeKgDeterministic, calculatePoints } from "@/lib/carbon-calculator";
import { normalizeRegion } from "@/lib/region-map";
import { pickOne } from "@/lib/select-normalize";
import { toEnergyEnum } from "@/lib/energy-map";
import { calibrateKg } from "@/lib/kg-calibration";
import { analyzeFootprint } from "@/ai/flows/carbon-footprint-analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const region = normalizeRegion(body.region);

    const transport = pickOne(body.transport as any[], TRANSPORT_KG, "worst");
    const diet      = pickOne(body.diet as any[],      DIET_KG,      "worst");
    const drink     = pickOne(body.drink as any[],     DRINK_KG,     "worst");
    const energy    = (["none","low","medium","high"].includes(body.energy) ? body.energy : toEnergyEnum(body.energy)) as keyof typeof ENERGY_KG;

    // Optional: call Gemini here to get aiKg, but DO NOT trust it
    // For now, we will get it from the client if it was calculated there.
    const aiKg: number | undefined = body.aiKg;

    const detKg = computeKgDeterministic(region, transport, diet, drink, energy);
    const finalKg = calibrateKg(region, transport, diet, drink, energy, aiKg);
    const { basePoints, penaltyPoints } = calculatePoints(finalKg, region);

    const { min, avg, max } = REGIONS[region];
    const debug = {
      region, min, avg, max,
      chosen: { transport, diet, drink, energy },
      aiKg: aiKg ?? null,
      detKg, finalKg
    };

    return NextResponse.json({ ok: true, base: basePoints, penalty: penaltyPoints, kg: finalKg, debug });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e.message }, { status: 500 });
  }
}

    