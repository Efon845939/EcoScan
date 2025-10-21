export type TransportOption = 'car_gasoline' | 'ev' | 'public_transport' | 'walk_bike';
export type DietOption = 'red_meat' | 'white_meat_fish' | 'vegetarian_vegan' | 'carb_based';
export type DrinkOption = 'drink_coffee_milk' | 'drink_bottled' | 'drink_alcohol' | 'drink_water_tea';
export type EnergyOption = 'no_energy' | 'some_energy';


const TRANSPORT_KG: Record<TransportOption, number> = {
  car_gasoline: 15,
  ev: 5,
  public_transport: 8,
  walk_bike: 0,
};

const DIET_KG: Record<DietOption, number> = {
  red_meat: 20,
  white_meat_fish: 10,
  vegetarian_vegan: 3,
  carb_based: 8,
};

const DRINK_KG: Record<DrinkOption, number> = {
    drink_coffee_milk: 5,
    drink_bottled: 2,
    drink_alcohol: 4,
    drink_water_tea: 1,
}

const ENERGY_KG: Record<EnergyOption, number> = {
    no_energy: 0,
    some_energy: 10,
}

type RegionData = {
    min: number;
    avg: number;
    max: number;
    penaltyThreshold: number;
}

export type RegionKey = 'turkey' | 'europe' | 'usa' | 'uae' | 'kuwait' | 'japan' | 'uk' | 'default';


export const REGIONS: Record<string, RegionData> = {
    'turkey': { min: 5,  avg: 10,  max: 25, penaltyThreshold: 25 },
    'europe': { min: 8,  avg: 20,  max: 40, penaltyThreshold: 40 },
    'usa':    { min: 15, avg: 40,  max: 60, penaltyThreshold: 60 },
    'uae':    { min: 20, avg: 50,  max: 70, penaltyThreshold: 70 },
    'kuwait': { min: 25, avg: 65,  max: 85, penaltyThreshold: 85 },
    'japan':  { min: 6,  avg: 15,  max: 35, penaltyThreshold: 35 },
    'uk':     { min: 7,  avg: 18,  max: 38, penaltyThreshold: 38 },
    'default':{ min: 10, avg: 25, max: 50, penaltyThreshold: 50 },
}

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

export function computeKg(
    transport: TransportOption[],
    diet: DietOption[],
    drink: DrinkOption[],
    energy: EnergyOption
): number {
    const transportKg = transport.reduce((sum, key) => sum + (TRANSPORT_KG[key] || 0), 0);
    const dietKg = diet.reduce((sum, key) => sum + (DIET_KG[key] || 0), 0);
    const drinkKg = drink.reduce((sum, key) => sum + (DRINK_KG[key] || 0), 0);

    return transportKg + dietKg + drinkKg + ENERGY_KG[energy];
}

export function calculatePoints(
    estimatedFootprintKg: number,
    regionKey: string
): { basePoints: number; penaltyPoints: number } {
    const region = REGIONS[regionKey] || REGIONS['default'];
    
    // 1. Check for penalty first: Penalty applies only if KG is ABOVE max.
    if (estimatedFootprintKg > region.max) {
        // Sliding scale penalty: starts at -1 and gets larger, capped at -10.
        const diff = estimatedFootprintKg - region.max;
        const penalty = Math.round(diff / 2); // 1 point lost for every 2kg over
        const finalPenalty = Math.max(-10, -penalty);
        return { basePoints: finalPenalty, penaltyPoints: finalPenalty };
    }

    // 2. If no penalty, calculate base points on a curve from min to max.
    // Score is 30 at `min` kg, and 0 at `max` kg.
    if (estimatedFootprintKg <= region.min) {
        return { basePoints: 30, penaltyPoints: 0 };
    }
    
    // Linear interpolation between min and max
    const range = region.max - region.min;
    const points = 30 * (1 - (estimatedFootprintKg - region.min) / range);
    
    const finalPoints = Math.max(0, Math.round(points));

    return { basePoints: finalPoints, penaltyPoints: 0 };
}
