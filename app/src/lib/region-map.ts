import { REGIONS, type RegionKey } from "@/lib/carbon-calculator";

const REGION_ALIASES: Record<string, RegionKey> = {
  turkey: "turkey",
  tr: "turkey",
  "tr-istanbul": "turkey",
  türkiye: "turkey",

  europe: "europe",
  eu: "europe",
  germany: "europe",

  usa: "usa",
  us: "usa",
  "united states": "usa",

  uae: "uae",
  "ae-dubai": "uae",
  dubai: "uae",
  "dubai, uae": "uae",

  kuwait: "kuwait",
  kw: "kuwait",

  japan: "japan",
  jp: "japan",
  nihon: "japan",

  uk: "uk",
  "united kingdom": "uk",
};

export function normalizeRegion(input: string | undefined | null): RegionKey {
  const key = String(input || "").trim().toLowerCase();
  const hit = REGION_ALIASES[key];
  if (hit) return hit;
  
  if ((REGIONS as any)[key]) return key as RegionKey;
  
  return "europe"; // Safe fallback
}
