
export const REGION = {
  turkey: { min: 5, avg: 15, max: 30 },
  germany: { min: 8, avg: 22, max: 40 },
  usa:    { min: 15, avg: 45, max: 60 },
  uae:    { min: 20, avg: 55, max: 70 },
  kuwait: { min: 25, avg: 70, max: 85 },
  japan:  { min: 6,  avg: 18, max: 35 },
  uk:     { min: 7, avg: 20, max: 38 },
  europe: { min: 8, avg: 22, max: 40 }, // Default/fallback
} as const;

const REGION_MAP: Record<string, keyof typeof REGION> = {
  "Turkey": "turkey",
  "Germany": "germany",
  "USA": "usa",
  "Dubai, UAE": "uae",
  "Kuwait": "kuwait",
  "Japan": "japan",
  "United Kingdom": "uk"
};

export function getRegionKey(displayName: string): keyof typeof REGION {
    return REGION_MAP[displayName] || 'europe';
}

export const TRANSPORT_KG = {
  car_gasoline: 28,
  ev: 10,
  public_transport: 8,
  walk_bike: 0
} as const;

export const DIET_KG = {
  red_meat: 20,
  poultry_fish: 8,
  vegetarian: 5,
  vegan: 5
} as const;

export const DRINK_KG = {
  drink_coffee_milk: 2.0,
  drink_bottled: 1.5,
  drink_alcohol: 2.5,
  drink_plant_based: 0.5,
  drink_water_tea: 0.2
} as const;

export const ENERGY_KG = {
  none: 0,
  low: 6,
  medium: 12,
  high: 20
} as const;

export type RegionKey = keyof typeof REGION;
export type Transport = keyof typeof TRANSPORT_KG;
export type Diet = keyof typeof DIET_KG;
export type Drink = keyof typeof DRINK_KG;
export type Energy = keyof typeof ENERGY_KG;


/**
 * Calculates a deterministic CO2 footprint in kg based on user inputs and region.
 */
export function computeKgDeterministic(
  regionKey: RegionKey,
  transport: Transport,
  diet: Diet,
  drink: Drink,
  energy: string // Can be 'low', 'medium', 'high', or a number string
): number {
  const regionData = REGION[regionKey];
  if (!regionData) {
    throw new Error(`Invalid region key provided: ${regionKey}`);
  }

  const transportVal = TRANSPORT_KG[transport] ?? 0;
  const dietVal = DIET_KG[diet] ?? 0;
  const drinkVal = DRINK_KG[drink] ?? 0;
  
  let energyVal = 0;
  if (Object.keys(ENERGY_KG).includes(energy)) {
    energyVal = (ENERGY_KG as Record<string, number>)[energy] ?? 0;
  } else {
    const parsedEnergy = parseFloat(energy);
    energyVal = isNaN(parsedEnergy) ? 0 : parsedEnergy;
  }

  const base = transportVal + dietVal + drinkVal + energyVal;

  // Scale the base value according to the region's average.
  // Reference scale: Europe average is 22 kg.
  const scale = regionData.avg / 22;
  let kg = base * scale;

  // Clamp the result within the region's min/max bounds.
  kg = Math.max(regionData.min, Math.min(kg, regionData.max));

  return Number(kg.toFixed(1));
}


/**
 * Calculates points based on the CO2 kg, scaled to the specific region.
 * The lower the footprint, the higher the points.
 * @param kg The calculated CO2 footprint.
 * @param region The key for the user's region.
 * @returns A point value from 0 to 30.
 */
export function pointsFromKgRegionAware(kg: number, region: RegionKey): number {
  const { min, avg, max } = REGION[region];

  // Clamp the incoming kg value to the bounds of the region to handle extremes
  const clampedKg = Math.max(min, Math.min(kg, max));

  // If the footprint is at or below the 'min' for the region, award max points.
  if (clampedKg <= min) return 30;
  // If the footprint is at or above the 'max' for the region, award zero points.
  if (clampedKg >= max) return 0;

  let points: number;
  if (clampedKg <= avg) {
    // Score is between min and avg. Interpolate points from 30 down to 15.
    const t = (clampedKg - min) / (avg - min);
    points = 30 - 15 * t;
  } else {
    // Score is between avg and max. Interpolate points from 15 down to 0.
    const t = (clampedKg - avg) / (max - avg);
    points = 15 - 15 * t;
  }

  return Math.round(points);
}

/**
 * Calculates the provisional points awarded for completing the survey (10% of base).
 * This is the value shown before receipt verification.
 */
export function computeProvisional(basePoints: number): number {
  return Math.floor(basePoints * 0.10);
}

/**
 * Calculates the final bonus points after receipt verification.
 * This replaces the provisional points. It's a 3x multiplier on the base points.
 */
export function finalizeWithReceipt(basePoints: number): number {
  // As per `docs/points-logic.md`, the multiplier is 3x.
  return Math.round(basePoints * 3);
}
