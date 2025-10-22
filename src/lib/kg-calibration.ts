import { REGIONS, type RegionKey, computeKgDeterministic } from "@/lib/carbon-calculator";
import { AI_KG_ENABLED, AI_KG_BLEND } from "@/config/ai";

export function calibrateKg(
  region: RegionKey,
  transport: any, diet: any, drink: any, energy: any,
  aiKg?: number|null
) {
  const det = computeKgDeterministic(region, transport, diet, drink, energy);
  if (!AI_KG_ENABLED || aiKg == null || Number.isNaN(aiKg)) return det;

  const { min, max } = REGIONS[region];
  const aiClamped = Math.max(min, Math.min(aiKg, max));
  const mix = (1 - AI_KG_BLEND) * det + AI_KG_BLEND * aiClamped;
  const finalKg = Math.max(min, Math.min(mix, max));
  return Number(finalKg.toFixed(1));
}

    