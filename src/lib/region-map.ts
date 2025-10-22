import { REGIONS, type RegionKey } from "@/lib/carbon-calculator";

const ALIAS: Record<string, RegionKey> = {
  turkey:"turkey","tr":"turkey","tr-istanbul":"turkey","türkiye":"turkey",
  europe:"europe","eu":"europe",
  usa:"usa","us":"usa","united states":"usa",
  uae:"uae","ae-dubai":"uae","dubai":"uae",
  kuwait:"kuwait","kw":"kuwait",
  japan:"japan","jp":"japan","nihon":"japan"
};
export function normalizeRegion(v?: string|null): RegionKey {
  const k = String(v||"").trim().toLowerCase();
  if ((REGIONS as any)[k]) return k as RegionKey;
  return ALIAS[k] ?? "europe"; // never default to turkey silently
}
