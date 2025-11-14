
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
    'turkey': { min: 15,  avg: 40,  max: 70 },
    'europe': { min: 10,  avg: 35,  max: 60 },
    'germany': { min: 10,  avg: 35,  max: 60 },
    'usa':    { min: 20, avg: 50,  max: 80 },
    'uae':    { min: 20, avg: 50,  max: 70 },
    'dubai, uae': {min: 20, avg: 50,  max: 70},
    'kuwait': { min: 25, avg: 65,  max: 85 },
    'japan':  { min: 6,  avg: 15,  max: 35 },
    'uk':     { min: 7,  avg: 18,  max: 38 },
    'united kingdom': { min: 7,  avg: 18,  max: 38 },
    'default':{ min: 10, avg: 25, max: 50 },
}

export function pointsFromKgRegionAware(kg: number, region: RegionKey): number {
  const ranges = REGIONS[region]; 

  if (!ranges) {
    return 0;
  }

  if (kg <= ranges.min) return 30;
  if (kg <= ranges.avg) return 20;
  if (kg <= ranges.avg + 10) return 15;
  if (kg <= ranges.max) return 8;

  return 0;  // high emissions
}


export function calculatePoints(
    estimatedFootprintKg: number,
    regionKey: RegionKey
): { basePoints: number; penaltyPoints: number } {
    const region = REGIONS[regionKey] || REGIONS['default'];
    
    // Penalty is only applied if KG is STRICTLY GREATER THAN the max
    if (estimatedFootprintKg > region.max) {
        const diff = estimatedFootprintKg - region.max;
        const penalty = Math.round(diff / 2); // 1 point lost for every 2kg over
        const finalPenalty = Math.max(-10, -penalty); // Cap penalty at -10
        return { basePoints: 0, penaltyPoints: finalPenalty || -1 }; // Ensure at least -1 if over
    }

    const basePoints = pointsFromKgRegionAware(estimatedFootprintKg, regionKey);
    
    return { basePoints: Math.round(basePoints), penaltyPoints: 0 };
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


export const computeProvisional = (base: number) => Math.floor(base * 0.10);
export const finalizeWithReceipt = (base: number) => base * 3;
