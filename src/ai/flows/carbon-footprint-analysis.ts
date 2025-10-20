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

const CarbonFootprintInputSchema = z.object({
  location: z.string().describe('The user\'s current location (e.g., "Dubai, UAE", "Istanbul, Turkey") to adjust for regional emission averages.'),
  transport: z
    .array(z.string())
    .describe('Keys representing modes of transportation used today (e.g., "car_gasoline", "ev", "public_transport", "walk_bike").'),
  diet: z
    .array(z.string())
    .describe('Keys representing the primary diet today (e.g., "red_meat", "poultry_fish", "vegetarian", "vegan").'),
  drink: z
    .array(z.string())
    .describe('Keys representing the primary drink consumption today (e.g., "drink_coffee_milk", "drink_bottled").'),
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
  points: z.number().describe('The base points awarded for the survey, before any bonuses.'),
});
export type CarbonFootprintOutput = z.infer<typeof CarbonFootprintOutputSchema>;


export async function analyzeCarbonFootprint(
  input: CarbonFootprintInput
): Promise<CarbonFootprintOutput> {

  // 1. Use the AI for qualitative analysis based on the deterministic result.
  const { output } = await ai.generate({
    prompt: `SYSTEM PROMPT:
You are an environmental data analyst.
You must produce a JSON response that estimates daily CO₂ emissions (kg) based on user inputs.

You are NOT allowed to output any text outside JSON.

USER INPUT:
- Language: ${input.language || 'en'}
- Location: ${input.location}
- Transport: ${input.transport.join(', ')}
- Diet: ${input.diet.join(', ')}
- Drink: ${input.drink.join(', ')}
- Energy: ${input.energy}

TASK:
Generate a JSON object with the following fields: "estimatedFootprintKg", "sustainabilityScore", "points", "tangibleComparison", "analysis", "recommendations", "extraTips".

Use this logic:
1. Use the following region benchmarks:
   Turkey {min:5, avg:10, max:25},
   Germany {min:8, avg:20, max:40},
   USA {min:15, avg:40, max:60},
   United Kingdom {min:8, avg:20, max:40},
   Dubai, UAE {min:20, avg:50, max:70},
   Kuwait {min:25, avg:65, max:85},
   Japan {min:6, avg:15, max:35}.
   Default to {min:10, avg:25, max:45} if the location does not match.
2. Compute estimatedFootprintKg using normalized averages:
   - Assign base emission factors (kg):
     transport: car_gasoline=28, ev=10, public_transport=8, walk_bike=0
     diet: red_meat=20, white_meat_fish=8, vegetarian_vegan=5, carb_based=10
     drink: drink_coffee_milk=2, drink_bottled=1.5, drink_alcohol=2.5, drink_water_tea=0.4
     energy: none=0, low=6, medium=12, high=20
   - Take the first item from each user input array as the primary choice.
   - Sum all categories.
   - Multiply by (region.avg / 20) to scale for region intensity.
   - Clamp result between region.min and region.max.
   - Round to one decimal.
3. Compute sustainabilityScore (1–10): inversely proportional to footprint position between min and max. A score of 10 for min, 1 for max.
4. Compute points (before receipt bonus) using this piecewise linear rule:
   - min footprint → 30 pts, avg footprint → 15 pts, max footprint → 0 pts
5. Generate 'tangibleComparison', 'analysis', 'recommendations', and 'extraTips' in the requested language. The analysis should be encouraging. The recommendations should be actionable.
`,
    output: {
      schema: z.object({
        estimatedFootprintKg: CarbonFootprintOutputSchema.shape.estimatedFootprintKg,
        tangibleComparison: CarbonFootprintOutputSchema.shape.tangibleComparison,
        analysis: CarbonFootprintOutputSchema.shape.analysis,
        recommendations: CarbonFootprintOutputSchema.shape.recommendations,
        extraTips: CarbonFootprintOutputSchema.shape.extraTips,
        sustainabilityScore: CarbonFootprintOutputSchema.shape.sustainabilityScore,
        points: CarbonFootprintOutputSchema.shape.points,
      }),
    },
    config: {
      temperature: 0.1, 
    },
  });

  if (!output) {
    throw new Error('AI analysis failed to generate a response.');
  }

  // The AI now returns the fully computed, deterministic results.
  return output;
}
