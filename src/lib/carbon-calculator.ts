

// Neutral baseline factors (pre-region scale)
const TRANSPORT_KG = {
  car_gasoline: 28, // daily heavy-use proxy
  ev: 10,
  public_transport: 8,
  walk_bike: 0,
};

const DIET_KG = {
  red_meat: 20,
  white_meat_fish: 8,
  vegetarian_vegan: 5,
  carb_based: 10,
};

const DRINK_KG = {
  drink_coffee_milk: 2.0,
  drink_bottled: 1.5,
  drink_alcohol: 2.5,
  drink_water_tea: 0.4,
};


const ENERGY_KG = {
  none: 0,
  low: 6,
  medium: 12,
  high: 20,
};

export const REGIONS = {
  turkey: { min: 5, avg: 10, max: 25 },
  germany: { min: 8, avg: 20, max: 40 },
  usa: { min: 15, avg: 40, max: 60 },
  dubai_uae: { min: 20, avg: 50, max: 70 },
  kuwait: { min: 25, avg: 65, max: 85 },
  united_kingdom: { min: 8, avg: 20, max: 40 },
  japan: { min: 8, avg: 22, max: 38 },
  default: { min: 10, avg: 25, max: 45 },
} as const;

export type RegionKey = keyof typeof REGIONS;
export type Transport = keyof typeof TRANSPORT_KG;
export type Diet = keyof typeof DIET_KG;
export type Drink = keyof typeof DRINK_KG;
export type Energy = keyof typeof ENERGY_KG;


export function calcDailyDietDrinkKg(dietKey: Diet, drinkKey: Drink) {
  const dietValue = DIET_KG[dietKey] || 0;
  const drinkValue = DRINK_KG[drinkKey] || 0;
  return dietValue + drinkValue;
}

export function computeCarbonKgDeterministic(
  region: RegionKey,
  transport: Transport,
  diet: Diet,
  drink: Drink,
  energy: Energy
): number {
  // 1. Calculate base kg (neutral)
  const base =
    (TRANSPORT_KG[transport] || 0) +
    calcDailyDietDrinkKg(diet, drink) +
    (ENERGY_KG[energy] || 0);

  // 2. Apply regional scaling (anchor: neutral avg = 20)
  const neutralAvg = 20;
  const regionData = REGIONS[region] || REGIONS['default'];
  const { min, avg, max } = regionData;
  const scale = avg / neutralAvg;
  let kg = base * scale;
  
  // 3. Clamp and round in one step
  kg = Math.max(min, Math.min(kg, max));
  return Number(kg.toFixed(1));
}


export function pointsFromKgRegionAware(kg: number, region: RegionKey): number {
  const regionData = REGIONS[region] || REGIONS.default;
  const { min, avg, max } = regionData;
  const clamped = Math.max(min, Math.min(kg, max));

  if (clamped <= min) return 30; // best
  if (clamped >= max) return 0;  // worst

  if (clamped <= avg) { // min..avg -> 30..15
    const t = (clamped - min) / (avg - min);
    return Math.round(30 - 15 * t);
  } else { // avg..max -> 15..0
    const t = (clamped - avg) / (max - avg);
    return Math.round(15 - 15 * t);
  }
}

export function computeProvisional(basePoints: number) {
  return Math.floor(basePoints * 0.10);
}

export function finalizeWithReceipt(basePoints: number) {
  return basePoints * 5; // 500% of base, replaces provisional
}
