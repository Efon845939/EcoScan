export function pickOne<K extends string>(
  arr: K[],
  table: Record<K, number>,
  mode: "best" | "worst"
): K {
  if (!arr || arr.length === 0) {
      // Return a default key if the array is empty to prevent crashes.
      // The "best" default would be the one with the lowest value, but we don't know the keys.
      // Returning the first key of the table is a safe bet, or a specific default.
      // For now, let's throw to highlight the issue during development.
      throw new Error("Empty selection array passed to pickOne");
  }

  let pick = arr[0];
  for (const k of arr) {
    if (!(k in table)) continue;
    if (mode === "best"  && table[k] < table[pick]) pick = k;
    if (mode === "worst" && table[k] > table[pick]) pick = k;
  }
  return pick;
}
