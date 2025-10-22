
type AnalysisOut = {
  estimatedFootprintKg: number;
  analysis: string;
  recommendations: string[];
  recoveryActions: string[];
};

const DEFAULT_RECS = [
  "Walk or take public transit for short trips.",
  "Choose local, seasonal foods today.",
  "Turn off unused lights/devices."
];
const DEFAULT_REC = [
  "Scan a meal/drink receipt for bonus points.",
  "Take a 20-minute walk and verify it.",
  "Lower A/C or heating by 1–2°C today."
];

export function sanitizeAiResponse(raw: any, finalKg: number): AnalysisOut {
  const out: AnalysisOut = {
    estimatedFootprintKg: Number(finalKg),
    analysis: typeof raw?.analysis === "string" ? raw.analysis : "",
    recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations.slice(0,3) : DEFAULT_RECS,
    recoveryActions: Array.isArray(raw?.recoveryActions) ? raw.recoveryActions.slice(0,3) : DEFAULT_REC
  };
  // ensure non-empty strings
  if (!out.analysis) out.analysis = "Here are a few ways to reduce today's impact.";
  out.recommendations = pad3(out.recommendations, DEFAULT_RECS[0]);
  out.recoveryActions = pad3(out.recoveryActions, DEFAULT_REC[0]);
  return out;
}

function pad3(arr: string[], fill: string) {
  const a = (arr || []).map(s => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  while (a.length < 3) a.push(fill);
  return a.slice(0,3);
}
