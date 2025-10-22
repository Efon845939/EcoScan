import { REGIONS, type RegionKey } from "@/lib/carbon-calculator";
import { DietOption, DrinkOption, EnergyOption, TransportOption } from "./carbon-calculator";

export function isWorstScenario(
  transport: TransportOption, diet: DietOption, drink: DrinkOption, energy: EnergyOption
) {
  const worstTransport = transport === "car_gasoline";
  const worstDiet      = diet === "red_meat";
  const worstDrink     = drink === "drink_alcohol";
  const worstEnergy    = energy === "high";
  return worstTransport && worstDiet && worstDrink && worstEnergy;
}

export function enforceWorstFloor(
  kg: number,
  region: RegionKey,
  transport: TransportOption, diet: DietOption, drink: DrinkOption, energy: EnergyOption
) {
  if (!isWorstScenario(transport, diet, drink, energy)) return kg;
  const { max, min } = REGIONS[region];
  // For the worst day, ensure the kg is at least 95% of the region's max
  const floored = Math.max(kg, max * 0.95);
  // The value was incorrectly hard-coded to 25. It should use the region's `max`.
  return Number(Math.max(min, Math.min(floored, max)).toFixed(1));
}
