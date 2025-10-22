export function pickOne<K extends string>(
  arr: K[], table: Record<K, number>, mode: "best"|"worst" = "worst"
): K {
  if (!arr || !arr.length) throw new Error("Empty selection array passed to pickOne");
  let out = arr[0];
  for (const k of arr) {
    if (!(k in table)) continue;
    if (mode === "best"  && table[k] < table[out]) out = k;
    if (mode === "worst" && table[k] > table[out]) out = k;
  }
  return out;
}

    