
export type TransportOption = 'car_gasoline' | 'ev' | 'public_transport' | 'walk_bike';
export type DietOption = 'red_meat' | 'white_meat_fish' | 'vegetarian_vegan' | 'carb_based';
export type DrinkOption = 'drink_coffee_milk' | 'drink_bottled' | 'drink_alcohol' | 'drink_water_tea';
export type EnergyOption = 'no_energy' | 'some_energy' | 'low' | 'medium' | 'high' | 'none';

// Reference KG values for deterministic calculation
const TRANSPORT_KG_REF: Record<TransportOption, number> = { 'car_gasoline': 28, 'ev': 10, 'public_transport': 8, 'walk_bike': 0 };
const DIET_KG_REF: Record<DietOption, number> = { 'red_meat': 20, 'white_meat_fish': 8, 'vegetarian_vegan': 5, 'carb_based': 10 };
const DRINK_KG_REF: Record<DrinkOption, number> = { 'drink_coffee_milk': 2.0, 'drink_bottled': 1.5, 'drink_alcohol': 2.5, 'drink_water_tea': 0.5 };
const ENERGY_KG_REF: Record<EnergyOption, number> = { 'none': 0, 'no_energy': 0, 'low': 6, 'some_energy': 6, 'medium': 12, 'high': 20 };


export type RegionKey = 'turkey' | 'europe' | 'usa' | 'uae' | 'kuwait' | 'japan' | 'uk' | 'default';

export const REGIONS: Record<string, { min: number; avg: number; max: number; penaltyThreshold: number; }> = {
    'turkey': { min: 5,  avg: 10,  max: 25, penaltyThreshold: 25 },
    'europe': { min: 8,  avg: 20,  max: 40, penaltyThreshold: 40 },
    'usa':    { min: 15, avg: 40,  max: 60, penaltyThreshold: 60 },
    'uae':    { min: 20, avg: 50,  max: 70, penaltyThreshold: 70 },
    'kuwait': { min: 25, avg: 65,  max: 85, penaltyThreshold: 85 },
    'japan':  { min: 6,  avg: 15,  max: 35, penaltyThreshold: 35 },
    'uk':     { min: 7,  avg: 18,  max: 38, penaltyThreshold: 38 },
    'default':{ min: 10, avg: 25, max: 50, penaltyThreshold: 50 },
}

const REGION_FINE_TUNE: Partial<Record<RegionKey, number>> = {
  turkey: -0.10,
  europe: 0,
  usa: 0.05,
  uae: 0.0,
  kuwait: -0.05,
  japan: 0,
};

export function getRegionKey(regionDisplayName: string): string {
    const lowerCaseName = regionDisplayName.toLowerCase();
    if (lowerCaseName.includes('dubai')) return 'uae';
    if (lowerCaseName.includes('kuwait')) return 'kuwait';
    if (lowerCaseName.includes('turkey')) return 'turkey';
    if (lowerCaseName.includes('germany')) return 'europe';
    if (lowerCaseName.includes('usa')) return 'usa';
    if (lowerCaseName.includes('japan')) return 'japan';
    if (lowerCaseName.includes('united kingdom')) return 'uk';
    return 'default';
}

function computeKgDeterministic(
    region: RegionKey,
    transport: TransportOption[],
    diet: DietOption[],
    drink: DrinkOption[],
    energy: EnergyOption
): number {
    const { min, avg, max } = REGIONS[region];
    
    const transportKg = transport.reduce((sum, key) => sum + (TRANSPORT_KG_REF[key] || 0), 0);
    const dietKg = diet.reduce((sum, key) => sum + (DIET_KG_REF[key] || 0), 0);
    const drinkKg = drink.reduce((sum, key) => sum + (DRINK_KG_REF[key] || 0), 0);
    const energyKg = ENERGY_KG_REF[energy] || 0;

    const base = transportKg + dietKg + drinkKg + energyKg;
    const scale = avg / 20; // neutral anchor = EU avg 20
    let kg = base * scale;
    kg = Math.max(min, Math.min(kg, max));
    return Number(kg.toFixed(1));
}


function applyFineTune(kg: number, region: RegionKey): number {
  const bias = REGION_FINE_TUNE[region] ?? 0;
  const { avg, min, max } = REGIONS[region];
  const adjusted = kg + bias * (kg - avg);
  return Number(Math.max(min, Math.min(adjusted, max)).toFixed(1));
}

export function calibrateAiKg(
  aiKg: number | null | undefined,
  region: RegionKey,
  transport: TransportOption[],
  diet: DietOption[],
  drink: DrinkOption[],
  energy: EnergyOption
): number {
  const det = computeKgDeterministic(region, transport, diet, drink, energy);
  if (aiKg == null || Number.isNaN(aiKg)) return det;

  const { min, max } = REGIONS[region];
  let ai = Math.max(min, Math.min(aiKg, max));

  let kg = 0.7 * det + 0.3 * ai;

  kg = applyFineTune(kg, region);

  return Number(kg.toFixed(1));
}


export function calculatePoints(
    estimatedFootprintKg: number,
    regionKey: string
): { basePoints: number; penaltyPoints: number } {
    const region = REGIONS[regionKey] || REGIONS['default'];
    
    // Check for penalty first: Penalty applies only if KG is ABOVE max.
    if (estimatedFootprintKg > region.max) {
        const diff = estimatedFootprintKg - region.max;
        const penalty = Math.round(diff / 2); // 1 point lost for every 2kg over
        const finalPenalty = Math.max(-10, -penalty);
        return { basePoints: 0, penaltyPoints: finalPenalty };
    }

    // If no penalty, calculate base points on a curve from min to max.
    const { min, avg, max } = region;
    const v = Math.max(min, Math.min(estimatedFootprintKg, max));

    if (v <= min) return { basePoints: 30, penaltyPoints: 0 };
    if (v >= max) return { basePoints: 0, penaltyPoints: 0 };

    let points: number;
    if (v <= avg) {
        // From min (30 pts) to avg (15 pts)
        const t = (v - min) / (avg - min);
        points = 30 - 15 * t;
    } else {
        // From avg (15 pts) to max (0 pts)
        const t = (v - avg) / (max - avg);
        points = 15 - 15 * t;
    }
    
    return { basePoints: Math.round(points), penaltyPoints: 0 };
}
