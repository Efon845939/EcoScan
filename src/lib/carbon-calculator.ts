// factors.ts
export const REGION = {
  turkey: { min:5, avg:10, max:25 },
  germany: { min:8, avg:20, max:40 },
  usa:    { min:15, avg:40, max:60 },
  uae:    { min:20, avg:50, max:70 },
  kuwait: { min:25, avg:65, max:85 },
  japan:  { min:6,  avg:15, max:35 },
  uk:     { min:8, avg:20, max:40 },
  europe: { min:8, avg:20, max:40 },
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
    return REGION_MAP[displayName] || 'europe'; // Default to 'europe'
}


export const TRANSPORT_KG = { car_gasoline:28, ev:10, public_transport:8, walk_bike:0 } as const;
export const DIET_KG      = { red_meat:20, poultry_fish:8, vegetarian:5, vegan:5 } as const;
export const DRINK_KG     = { drink_coffee_milk:2.0, drink_bottled:1.5, drink_alcohol:2.5, drink_plant_based:0.5, drink_water_tea:0.2 } as const;
export const ENERGY_KG    = { none:0, low:6, medium:12, high:20 } as const;

export type RegionKey = keyof typeof REGION;
export type Transport = keyof typeof TRANSPORT_KG;
export type Diet = keyof typeof DIET_KG;
export type Drink = keyof typeof DRINK_KG;
export type Energy = keyof typeof ENERGY_KG;


export function computeKgDeterministic(
  region: RegionKey,
  transport: keyof typeof TRANSPORT_KG,
  diet: keyof typeof DIET_KG,
  drink: keyof typeof DRINK_KG,
  energy: keyof typeof ENERGY_KG
) {
  const regionData = REGION[region];
  if (!regionData) {
    throw new Error(`Invalid region key provided: ${region}`);
  }
  const { min, avg, max } = regionData;
  const transportVal = TRANSPORT_KG[transport] ?? 0;
  const dietVal = DIET_KG[diet] ?? 0;
  const drinkVal = DRINK_KG[drink] ?? 0;
  const energyVal = (ENERGY_KG as Record<string, number>)[energy] ?? 0;

  const base = transportVal + dietVal + drinkVal + energyVal;

  // Referans ölçek: Europe avg = 20
  const scale = avg / 20;
  let kg = base * scale;

  kg = Math.max(min, Math.min(kg, max));       // clamp
  return Number(kg.toFixed(1));                // 1 ondalık
}


export function pointsFromKgRegionAware(kg: number, region: RegionKey) {
  const { min, avg, max } = REGION[region];
  const v = Math.max(min, Math.min(kg, max)); // clamp

  if (v <= min) return 30;        // en iyi
  if (v >= max) return 0;         // en kötü

  if (v <= avg) {                  // min..avg: 30→15
    const t = (v - min) / (avg - min);
    return Math.round(30 - 15 * t);
  } else {                         // avg..max: 15→0
    const t = (v - avg) / (max - avg);
    return Math.round(15 - 15 * t);
  }
}

export function computeProvisional(base: number) {
  return Math.floor(base * 0.10);
}

export function finalizeWithReceipt(base: number) {
  // From docs: The “always +1” bug is eliminated: provisional = floor(base*0.10) and receipt replaces provisional with base*5
  // The document `docs/points-logic.md` was later updated to be a 3x multiplier.
  return base * 3;
}
