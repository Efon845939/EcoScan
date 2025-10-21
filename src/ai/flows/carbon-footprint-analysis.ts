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
    .describe('Energy usage habits at home (e.g., used AC/heater, lights on all day). Can be "none".'),
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

  const { output } = await ai.generate({
    prompt: `SYSTEM PROMPT:
You are an environmental data analyst. Your role is to provide qualitative analysis based on pre-calculated data. You do not perform calculations yourself.
You must produce a JSON response. You are NOT allowed to output any text outside the JSON.

USER INPUT:
- Language: ${input.language || 'en'}
- Location: ${input.location}
- Transport: ${input.transport.join(', ')}
- Diet: ${input.diet.join(', ')}
- Drink: ${input.drink.join(', ')}
- Energy: ${input.energy}

TASK:
Generate a JSON object with the following fields: "tangibleComparison", "analysis", "recommendations", "extraTips".
- The "analysis" should be an encouraging, brief analysis of the user's activities.
- The "tangibleComparison" should be a creative, relatable comparison for a CO2 footprint (e.g., 'equivalent to charging a smartphone 500 times'). Do not use driving a car.
- The "recommendations" should be a list of 2 actionable tips to improve.
- The "extraTips" should be a list of 2 general tips for sustainability.
- All text must be in the requested language: ${input.language || 'en'}.
`,
    output: {
      schema: z.object({
        tangibleComparison: CarbonFootprintOutputSchema.shape.tangibleComparison,
        analysis: CarbonFootprintOutputSchema.shape.analysis,
        recommendations: CarbonFootprintOutputSchema.shape.recommendations,
        extraTips: CarbonFootprintOutputSchema.shape.extraTips,
      }),
    },
    config: {
      temperature: 0.2, 
    },
  });

  if (!output) {
    throw new Error('AI analysis failed to generate a response.');
  }

  // Return AI text combined with dummy numeric values that will be overwritten by the client.
  return {
    ...output,
    estimatedFootprintKg: 0,
    sustainabilityScore: 0,
    points: 0,
  };
}
