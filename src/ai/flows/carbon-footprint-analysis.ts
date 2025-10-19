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
  transport: z
    .string()
    .describe('Mode of transportation used today (e.g., car, bus, bike, walk).'),
  diet: z
    .string()
    .describe('Primary diet today (e.g., vegan, vegetarian, meat-eater).'),
  energy: z
    .string()
    .describe('Energy usage habits at home (e.g., used AC/heater, lights on all day).'),
});
export type CarbonFootprintInput = z.infer<typeof CarbonFootprintInputSchema>;

const CarbonFootprintOutputSchema = z.object({
  estimatedFootprintKg: z
    .number()
    .describe('A rough estimate of the daily carbon footprint in kilograms of CO2 equivalent.'),
  analysis: z.string().describe('A brief, encouraging analysis of the daily activities.'),
  recommendations: z
    .array(z.string())
    .describe('A list of 2-3 actionable recommendations to reduce the carbon footprint.'),
  extraTips: z
    .array(z.string())
    .describe('A list of 2-3 extra, general tips for keeping carbon footprint low today.'),
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
  prompt: `You are a friendly and encouraging environmental expert. Analyze the user's daily activities to provide a simple, non-scientific, and motivational carbon footprint analysis.

User's activities today:
- Transportation: {{{transport}}}
- Diet: {{{diet}}}
- Home Energy Use: {{{energy}}}

Based on this, provide:
1. A rough, illustrative estimate of their carbon footprint in kg of CO2 equivalent for the day. This is not for scientific accuracy, but for motivation.
2. A short, positive, and encouraging analysis of their day.
3. A list of 2-3 simple, actionable recommendations for how they could reduce their footprint tomorrow. Tailor the recommendations to their provided activities. For example, if they drove a car, suggest biking or public transport. If they ate meat, suggest a plant-based meal.
4. A list of 2-3 additional, general tips for what the user can do today to keep their footprint low (e.g., 'unplug unused chargers', 'air dry clothes').

Keep the tone light, positive, and empowering. The goal is to encourage small changes, not to make the user feel guilty.
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
