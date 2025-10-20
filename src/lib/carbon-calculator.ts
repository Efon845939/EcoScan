
// Neutral baseline factors (pre-region scale)
const TRANSPORT_KG = {
  car_gasoline: 28, // daily heavy-use proxy
  ev: 10,
  public_transport: 8,
  walk_bike: 0,
};

const DIET_KG = {
  red_meat: 20,
  poultry_fish: 8,
  vegetarian: 5,
  vegan: 3,
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
export type Energy = keyof typeof ENERGY_KG;

export function computeCarbonKgDeterministic(
  region: RegionKey,
  transport: Transport,
  diet: Diet,
  energy: Energy
): number {
  const base =
    TRANSPORT_KG[transport] + DIET_KG[diet] + ENERGY_KG[energy];

  // Scale to region average relative to a neutral anchor (here: Germany avg=20)
  const neutralAvg = 20; // anchor
  const regionData = REGIONS[region] || REGIONS['default'];
  const { min, avg, max } = regionData;
  const scale = avg / neutralAvg;

  let kg = base * scale;

  // If user selected "worst-case" (car_gasoline + red_meat + high),
  // push to >= 90% of regional max to avoid implausible lows.
  const worst =
    transport === 'car_gasoline' &&
    diet === 'red_meat' &&
    energy === 'high';

  if (worst) {
    kg = Math.max(kg, max * 0.9);
  }

  // Final clamp and rounding to 0.1 kg
  kg = Math.max(min, Math.min(kg, max));
  return Number(kg.toFixed(1));
}

export function computePointsFromKgRegionAware(kg: number, region: RegionKey): number {
    const regionData = REGIONS[region] || REGIONS['default'];
    const { min, avg, max } = regionData;

    if (kg > max * 1.1) return -10; // Penalty for being significantly over max
    if (kg > max) return -5; // Penalty for being over max
    if (kg <= min) return 30; // Max points for being at or below min

    // Linear segments for scoring
    if (kg <= avg) {
        // min...avg maps from 30 down to 15 points
        const t = (kg - min) / (avg - min);
        return Math.round(30 - 15 * t);
    } else {
        // avg...max maps from 15 down to 0 points
        const t = (kg - avg) / (max - avg);
        return Math.round(15 - 15 * t);
    }
}
