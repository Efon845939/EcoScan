
export type TransportOption = 'car_gasoline' | 'ev' | 'public_transport' | 'walk_bike';
export type DietOption = 'red_meat' | 'white_meat_fish' | 'vegetarian_vegan' | 'carb_based';
export type DrinkOption = 'drink_coffee_milk' | 'drink_bottled' | 'drink_alcohol' | 'drink_water_tea';
export type EnergyOption = 'no_energy' | 'some_energy' | 'low' | 'medium' | 'high' | 'none';

// Reference KG values for deterministic calculation
export const TRANSPORT_KG: Record<TransportOption, number> = { 'car_gasoline': 28, 'ev': 10, 'public_transport': 8, 'walk_bike': 0 };
export const DIET_KG: Record<DietOption, number> = { 'red_meat': 20, 'white_meat_fish': 8, 'vegetarian_vegan': 5, 'carb_based': 10 };
export const DRINK_KG: Record<DrinkOption, number> = { 'drink_coffee_milk': 2.0, 'drink_bottled': 1.5, 'drink_alcohol': 2.5, 'drink_water_tea': 0.5 };
export const ENERGY_KG: Record<EnergyOption, number> = { 'none': 0, 'no_energy': 0, 'low': 6, 'some_energy': 6, 'medium': 12, 'high': 20 };


export type RegionKey = 'turkey' | 'europe' | 'usa' | 'uae' | 'kuwait' | 'japan' | 'uk' | 'default';

export const REGIONS: Record<string, { min: number; avg: number; max: number; }> = {
    'turkey': { min: 5,  avg: 10,  max: 25 },
    'europe': { min: 8,  avg: 20,  max: 40 },
    'usa':    { min: 15, avg: 40,  max: 60 },
    'uae':    { min: 20, avg: 50,  max: 70 },
    'kuwait': { min: 25, avg: 65,  max: 85 },
    'japan':  { min: 6,  avg: 15,  max: 35 },
    'uk':     { min: 7,  avg: 18,  max: 38 },
    'default':{ min: 10, avg: 25, max: 50 },
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

export function computeKgDeterministic(
    region: RegionKey,
    transport: TransportOption,
    diet: DietOption,
    drink: DrinkOption,
    energy: EnergyOption
): number {
    const { avg } = REGIONS[region];
    
    const transportKg = TRANSPORT_KG[transport] || 0;
    const dietKg = DIET_KG[diet] || 0;
    const drinkKg = DRINK_KG[drink] || 0;
    const energyKg = ENERGY_KG[energy] || 0;

    const base = transportKg + dietKg + drinkKg + energyKg;
    const scale = avg / 20; // neutral anchor = EU avg 20
    let kg = base * scale;
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
  transport: TransportOption,
  diet: DietOption,
  drink: DrinkOption,
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
    
    // Penalty is only applied if KG is ABOVE the max
    if (estimatedFootprintKg > region.max) {
        const diff = estimatedFootprintKg - region.max;
        const penalty = Math.round(diff / 2); // 1 point lost for every 2kg over
        const finalPenalty = Math.max(-10, -penalty); // Cap penalty at -10
        return { basePoints: 0, penaltyPoints: finalPenalty || -1 }; // Ensure at least -1 if over
    }

    // If no penalty, calculate base points on a curve from min to max.
    const { min, avg, max } = region;
    // Clamp the kg value within the min/max range for point calculation
    const v = Math.max(min, Math.min(estimatedFootprintKg, max));

    if (v <= min) return { basePoints: 30, penaltyPoints: 0 };
    if (v >= max) return { basePoints: 0, penaltyPoints: 0 }; // 0 points at max, no penalty

    let points: number;
    if (v <= avg) {
        // Curve from 30 (at min) down to 15 (at avg)
        const t = (v - min) / (avg - min);
        points = 30 - 15 * t;
    } else {
        // Curve from 15 (at avg) down to 0 (at max)
        const t = (v - avg) / (max - avg);
        points = 15 - 15 * t;
    }
    
    return { basePoints: Math.round(points), penaltyPoints: 0 };
}

export const computeProvisional = (base: number) => Math.floor(base * 0.10);
export const finalizeWithReceipt = (base: number) => base * 5;
