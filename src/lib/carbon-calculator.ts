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
const REGIONS: Record<string, RegionData> = {
    'turkey': { min: 10, avg: 24, max: 40, penaltyThreshold: 30 },
    'germany': { min: 12, avg: 27, max: 45, penaltyThreshold: 35 },
    'usa': { min: 20, avg: 45, max: 70, penaltyThreshold: 55 },
    'uae': { min: 25, avg: 55, max: 85, penaltyThreshold: 65 },
    'kuwait': { min: 30, avg: 70, max: 100, penaltyThreshold: 80 },
    'default': { min: 10, avg: 25, max: 50, penaltyThreshold: 30 },
}

export function getRegionKey(regionDisplayName: string): string {
    const lowerCaseName = regionDisplayName.toLowerCase();
    if (lowerCaseName.includes('dubai')) return 'uae';
    if (lowerCaseName.includes('kuwait')) return 'kuwait';
    if (lowerCaseName.includes('turkey')) return 'turkey';
    if (lowerCaseName.includes('germany')) return 'germany';
    if (lowerCaseName.includes('usa')) return 'usa';
    return 'default';
}

export function computeKg(
    transport: TransportOption,
    diet: DietOption,
    drink: DrinkOption,
    energy: EnergyOption
): number {
    return TRANSPORT_KG[transport] + DIET_KG[diet] + DRINK_KG[drink] + ENERGY_KG[energy];
}

export function calculatePoints(
    estimatedFootprintKg: number,
    regionKey: string
): { basePoints: number; penaltyPoints: number } {
    const region = REGIONS[regionKey] || REGIONS['default'];
    
    // 1. Check for penalty first
    if (estimatedFootprintKg > region.penaltyThreshold) {
        const penalty = Math.round((estimatedFootprintKg - region.penaltyThreshold) / 2);
        const penaltyPoints = Math.max(-10, -penalty); // Capped at -10
        return { basePoints: 0, penaltyPoints };
    }

    // 2. If no penalty, calculate base points
    // Scale points: max points for min footprint, 0 points for max footprint
    const a = -30 / (region.max - region.min);
    const b = 30 - a * region.min;
    let basePoints = a * estimatedFootprintKg + b;
    
    basePoints = Math.max(0, Math.min(30, basePoints));

    return { basePoints: Math.round(basePoints), penaltyPoints: 0 };
}
