
'use server';

/**
 * @fileOverview Analyzes user's daily activities to provide qualitative feedback.
 * The core CO2 and points calculations are performed deterministically on the client-side.
 * This flow is only responsible for generating textual analysis and recommendations based on user inputs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const CarbonFootprintInputSchema = z.object({
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

export const CarbonFootprintOutputSchema = z.object({
  estimatedFootprintKg: z
    .number()
    .describe('This value is calculated on the client. The AI does not provide it.'),
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
  points: z.number().describe('This value is calculated on the client. The AI does not provide it.'),
});
export type CarbonFootprintOutput = z.infer<typeof CarbonFootprintOutputSchema>;


export async function analyzeCarbonFootprint(
  input: CarbonFootprintInput
): Promise<Omit<CarbonFootprintOutput, 'estimatedFootprintKg' | 'points'>> {

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

  // Return ONLY the AI-generated text. All numbers will be handled on the client.
  return output;
}
