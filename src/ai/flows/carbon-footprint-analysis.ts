
'use server';

/**
 * @fileOverview Analyzes user's daily activities to estimate their carbon footprint and provide recommendations.
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

export async function analyzeCarbonFootprint(
  input: CarbonFootprintInput
): Promise<CarbonFootprintOutput> {
  return carbonFootprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'carbonFootprintPrompt',
  input: { schema: CarbonFootprintInputSchema },
  output: { schema: CarbonFootprintOutputSchema },
  prompt: `You are a friendly and encouraging environmental expert. Your calculations must be deterministic, meaning the same input always produces the same output. Analyze the user's daily activities to provide a simple, non-scientific, and motivational carbon footprint analysis.

IMPORTANT: You MUST generate your entire response (analysis, recommendations, tips, and tangibleComparison) in the language specified by the 'language' parameter. Default to English if no language is provided.

IMPORTANT: You MUST adjust your carbon footprint estimate based on the user's location. Here are regional daily averages to use as a baseline for your scaling. If a certain set of activities results in 15kg in Turkey, the same activities should result in a significantly higher footprint in Dubai (e.g., ~45-50kg) due to factors like grid carbon intensity, reliance on AC, etc.

- Kuwait: 70 kg/day
- Dubai, UAE: 55 kg/day
- USA: 45 kg/day
- Germany: 27 kg/day
- Turkey: 24 kg/day
- United Kingdom: 24 kg/day
- Japan: 26 kg/day
- General/Default: 25 kg/day

User's response language: {{{language}}}
User's location: {{{location}}}
User's activities today:
- Transportation: {{#each transport}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Diet: {{#each diet}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Home Energy Use: {{{energy}}}

Based on this, provide:
1. A deterministic, estimated carbon footprint in kg CO₂ for the day, scaled to their region. For the same inputs, you must always return the same output.
2. A tangible, creative, and relatable comparison for that CO2 amount. Be creative and AVOID using "driving a car" as the comparison.
3. A short, positive, and encouraging analysis of their day.
4. A list of 2-3 simple, actionable recommendations for how they could reduce their footprint tomorrow, tailored to their activities.
5. A list of 2-3 additional, general tips for what the user can do today to keep their footprint low.
6. A 'sustainabilityScore' from 1 to 10. A score of 10 means very sustainable (low carbon footprint), and 1 means not sustainable (high carbon footprint).
`,
});

const carbonFootprintFlow = ai.defineFlow(
  {
    name: 'carbonFootprintFlow',
    inputSchema: CarbonFootprintInputSchema,
    outputSchema: CarbonFootprintOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
