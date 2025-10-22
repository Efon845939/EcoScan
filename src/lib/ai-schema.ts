import { z } from "zod";

export const AnalysisSchema = z.object({
  estimatedFootprintKg: z.number(),
  analysis: z.string().transform(s => s.trim()).pipe(z.string().min(0)),
  recommendations: z.array(z.string().transform(s => s.trim())).length(3),
  recoveryActions: z.array(z.string().transform(s => s.trim())).length(3),
});

const DEFAULT_RECS = [
  "Prefer walking or public transit for short trips.",
  "Choose local, seasonal foods when possible.",
  "Turn off idle devices and lights."
];

const DEFAULT_RECOVERY = [
  "Scan today’s meal or drink receipt for bonus points.",
  "Take a 20-minute walk and verify via the Verification Center.",
  "Reduce A/C or heating by 1–2°C for the rest of the day."
];

export function sanitizeAiResponse(raw: any) {
  // Replace nulls with defaults before strict validation
  const patched = {
    estimatedFootprintKg: Number(raw?.estimatedFootprintKg ?? 0),
    analysis: typeof raw?.analysis === "string" ? raw.analysis : "",
    recommendations: Array.isArray(raw?.recommendations) ? raw.recommendations : DEFAULT_RECS,
    recoveryActions: Array.isArray(raw?.recoveryActions) ? raw.recoveryActions : DEFAULT_RECOVERY,
  };

  const parsed = AnalysisSchema.safeParse(patched);
  if (!parsed.success) {
    // Force final fallbacks of correct shape
    return {
      estimatedFootprintKg: patched.estimatedFootprintKg,
      analysis: patched.analysis || "Here are ways to reduce your impact today.",
      recommendations: (patched.recommendations || DEFAULT_RECS).slice(0,3),
      recoveryActions: (patched.recoveryActions || DEFAULT_RECOVERY).slice(0,3),
    };
  }
  // Trim & enforce non-empty strings
  const out = parsed.data;
  return {
    ...out,
    analysis: out.analysis || "Here are ways to reduce your impact today.",
    recommendations: out.recommendations.map(s => s || DEFAULT_RECS[0]),
    recoveryActions: out.recoveryActions.map(s => s || DEFAULT_RECOVERY[0]),
  };
}
