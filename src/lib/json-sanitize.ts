
export function extractJsonObject(raw: string): any {
  if (!raw || typeof raw !== "string") throw new Error("Empty response");

  // 1) Trim & strip BOM
  let s = raw.trim().replace(/^\uFEFF/, "");

  // 2) If it starts with ``` remove fences
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s```$/i);
  if (fence) s = fence[1].trim();

  // 3) If still not pure JSON, try to isolate the first {...} block by brace matching
  if (!(s.trim().startsWith("{") && s.trim().endsWith("}"))) {
    const start = s.indexOf("{");
    const end = findMatchingBraceIndex(s, start);
    if (start >= 0 && end > start) {
      s = s.slice(start, end + 1);
    }
  }

  // 4) Final attempt to parse
  return JSON.parse(s);
}

// simple brace matcher
function findMatchingBraceIndex(str: string, startIdx: number): number {
  if (startIdx < 0) return -1;
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
