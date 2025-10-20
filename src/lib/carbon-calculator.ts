
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
  drink_water_tea: 0.4 // Merged plant-based/homemade with tap water/tea
};


const ENERGY_KG = {
  low: 6,
  medium: 12,
  high: 20,
};

const REGIONS = {
  turkey: { min: 5, avg: 10, max: 25 },
  germany: { min: 8, avg: 20, max: 40 },
  usa: { min: 15, avg: 40, max: 60 },
  dubai_uae: { min: 20, avg: 50, max: 70 },
  kuwait: { min: 25, avg: 65, max: 85 },
  united_kingdom: { min: 8, avg: 20, max: 40 },
  japan: { min: 8, avg: 22, max: 38 },
  default: { min: 10, avg: 25, max: 45 },
};

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
  const base =
    (TRANSPORT_KG[transport] || 0) +
    calcDailyDietDrinkKg(diet, drink) +
    (ENERGY_KG[energy] || 0);

  // Scale to region average relative to a neutral anchor (here: Germany avg=20)
  const neutralAvg = 20; // anchor
  const regionData = REGIONS[region] || REGIONS['default'];
  const { min, avg, max } = regionData;
  const scale = avg / neutralAvg;

  let kg = base * scale;
  
  // Final clamp and rounding to 0.1 kg
  kg = Math.max(min, Math.min(kg, max));
  return Number(kg.toFixed(1));
}

export function computePointsFromKgRegionAware(kg: number, region: RegionKey): number {
    const regionData = REGIONS[region] || REGIONS['default'];
    const { min, avg, max } = regionData;
    const penaltyThreshold = max;

    // 1. High Footprint Penalty
    if (kg > penaltyThreshold) {
        const penalty = -Math.round((kg - penaltyThreshold) / 2);
        return Math.max(-10, penalty); // Cap penalty at -10
    }
    
    // 2. Provisional reward (based on a sustainability score proxy)
    // This is a simplified proxy. A real implementation might use a more complex score.
    // We'll simulate a score based on how close the user is to the minimum.
    const range = max - min;
    if (range <= 0) return 5; // Avoid division by zero, give neutral points
    
    const scoreFraction = 1 - ((kg - min) / range); // 1.0 for min, 0.0 for max
    const sustainabilityScore = Math.max(1, Math.min(10, scoreFraction * 10));

    return Math.round(sustainabilityScore * 0.5);
}
