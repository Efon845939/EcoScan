
'use server';

/**
 * @fileOverview Analyzes user's daily activities to estimate their carbon footprint and provide recommendations.
 * This flow now uses a deterministic rule-engine for the core CO2 calculation to ensure consistency
 * and relies on the AI for qualitative analysis and recommendations based on that deterministic number.
 *
 * - analyzeCarbonFootprint - A function that handles the carbon footprint analysis.
 * - CarbonFootprintInput - The input type for the analyzeCarbonFootprint function.
 * - CarbonFootprintOutput - The return type for the analyzeCarbonFootprint function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  computeCarbonKgDeterministic,
  RegionKey,
  Transport,
  Diet,
  Energy,
} from '@/lib/carbon-calculator';

const CarbonFootprintInputSchema = z.object({
  location: z.string().describe('The user\'s current location (e.g., "Dubai, UAE", "Istanbul, Turkey") to adjust for regional emission averages.'),
  transport: z
    .array(z.string())
    .describe('Keys representing modes of transportation used today (e.g., "car_gas", "ev", "public_transport", "walk_bike").'),
  diet: z
    .array(z.string())
    .describe('Keys representing the primary diet today (e.g., "red_meat", "poultry_fish", "vegetarian", "vegan").'),
  energy: z
    .string()
    .describe('Energy usage habits at home (e.g., used AC/heater, lights on all day).'),
  language: z
    .string()
    .optional()
    .describe('The language for the response (e.g., "en", "tr"). Default to English if not provided.'),
});
export type CarbonFootprintInput = z.infer<typeof CarbonFootprintInputSchema>;

const CarbonFootprintOutputSchema = z.object({
  estimatedFootprintKg: z
    .number()
    .describe('A deterministic, estimated daily carbon footprint in kilograms of CO2 equivalent, scaled for the user\'s region.'),
  tangibleComparison: z
    .string()
    .describe("A tangible, creative, and relatable comparison for the estimated CO2 footprint (e.g., 'equivalent to powering a TV for 20 hours', 'what 5 trees absorb in a day'). Do not use driving a car as a comparison."),
  analysis: z.string().describe('A brief, encouraging analysis of the daily activities.'),
  recommendations: z
    .array(z.string())
    .describe('A list of 2-3 actionable recommendations to reduce the carbon footprint.'),
  extraTips: z
    .array(z.string())
    .describe('A list of 2-3 extra, general tips for keeping carbon footprint low today.'),
  sustainabilityScore: z
    .number()
    .min(1)
    .max(10)
    .describe('An integer score from 1 (very high impact) to 10 (very low impact) based on the sustainability of the day\'s activities. A lower carbon footprint should result in a higher score.'),
});
export type CarbonFootprintOutput = z.infer<typeof CarbonFootprintOutputSchema>;

// Helper to map form inputs to the calculator's enum-like keys
function getPrimaryInput<T>(inputs: string[], defaultValue: T): T {
    // A simple heuristic: assume the "heaviest" impact item is the primary one if multiple are selected.
    // This could be made more sophisticated later.
    return (inputs[0] as T) || defaultValue;
}

export async function analyzeCarbonFootprint(
  input: CarbonFootprintInput
): Promise<CarbonFootprintOutput> {
  const regionKey = (input.location.split(',')[0].toLowerCase().replace(' ', '_')) as RegionKey;
  
  // Map form data to the stricter types required by the deterministic calculator.
  // We'll take the first selection as the primary mode for calculation.
  const transportMode = getPrimaryInput<Transport>(input.transport, 'walk_bike');
  const dietMode = getPrimaryInput<Diet>(input.diet, 'vegan');
  
  // A simple mapping for energy text input to a category.
  const energyText = input.energy.toLowerCase();
  let energyMode: Energy = 'medium';
  if (energyText.includes('low') || energyText.includes('few') || energyText.includes('unplugged')) {
    energyMode = 'low';
  } else if (energyText.includes('high') || energyText.includes('all day') || energyText.includes('ac')) {
    energyMode = 'high';
  }

  // 1. Calculate the footprint using the deterministic rule-engine
  const deterministicFootprint = computeCarbonKgDeterministic(
    regionKey,
    transportMode,
    dietMode,
    energyMode
  );

  // 2. Use the AI for qualitative analysis based on the deterministic result.
  const { output } = await ai.generate({
    model: 'gemini-1.5-flash',
    prompt: `You are an environmental expert providing a carbon footprint analysis.
Your primary role is to provide engaging, qualitative feedback based on a pre-calculated, deterministic carbon footprint.
You MUST NOT calculate the carbon footprint yourself. Use the number provided.

You MUST generate your entire response (analysis, recommendations, tips, and tangibleComparison) in the language specified by the 'language' parameter. Default to English if no language is provided.

**INPUT DATA:**
- **Deterministic Carbon Footprint:** ${deterministicFootprint.toFixed(1)} kg CO₂
- **User's response language:** ${input.language || 'en'}
- **User's location:** ${input.location}
- **User's activities today:**
  - Transportation: ${input.transport.join(', ')}
  - Diet: ${input.diet.join(', ')}
  - Home Energy Use: ${input.energy}

**YOUR TASKS:**
Based on the provided deterministic footprint and user activities, generate the following:
1.  **Tangible Comparison:** A tangible, creative, and relatable comparison for the given CO2 amount (${deterministicFootprint.toFixed(1)} kg). AVOID using "driving a car" as the comparison.
2.  **Analysis:** A short, positive, and encouraging analysis of their day, contextualized by the provided footprint number.
3.  **Recommendations:** A list of 2-3 simple, actionable recommendations for how they could reduce their footprint tomorrow, tailored to their activities.
4.  **Extra Tips:** A list of 2-3 additional, general tips for what the user can do today to keep their footprint low.
5.  **Sustainability Score:** A 'sustainabilityScore' from 1 to 10. A score of 10 means very sustainable (low carbon footprint), and 1 means not sustainable (high carbon footprint). This score should be directly and consistently derived from the provided ${deterministicFootprint.toFixed(1)} kg number relative to their region (${input.location}).
`,
    output: {
      schema: z.object({
        tangibleComparison: CarbonFootprintOutputSchema.shape.tangibleComparison,
        analysis: CarbonFootprintOutputSchema.shape.analysis,
        recommendations: CarbonFootprintOutputSchema.shape.recommendations,
        extraTips: CarbonFootprintOutputSchema.shape.extraTips,
        sustainabilityScore: CarbonFootprintOutputSchema.shape.sustainabilityScore,
      }),
    },
    config: {
      temperature: 0.2, // A little creativity in text is fine, the number is fixed.
    },
  });

  if (!output) {
    throw new Error('AI analysis failed to generate a response.');
  }

  // Combine the deterministic number with the AI's qualitative output.
  return {
    estimatedFootprintKg: deterministicFootprint,
    tangibleComparison: output.tangibleComparison,
    analysis: output.analysis,
    recommendations: output.recommendations,
    extraTips: output.extraTips,
    sustainabilityScore: output.sustainabilityScore,
  };
}
