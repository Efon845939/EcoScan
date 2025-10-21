'use server';
/**
 * @fileOverview Analyzes a user's daily activities to estimate their carbon footprint and provide feedback.
 *
 * - analyzeFootprint - A function that analyzes user inputs about their daily activities.
 * - CarbonFootprintInput - The input type for the analyzeFootprint function.
 * - CarbonFootprintAnalysis - The return type for the analyzeFootprint function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CarbonFootprintInputSchema = z.object({
  transport: z.array(z.string()).describe('List of transportation methods used.'),
  diet: z.array(z.string()).describe('List of diet types consumed.'),
  drink: z.array(z.string()).describe('List of drinks consumed.'),
  energy: z.string().describe('Energy usage at home.'),
  other: z.string().optional().describe('Any other relevant information.'),
  region: z.string().describe('The user\'s geographical region.'),
});
export type CarbonFootprintInput = z.infer<typeof CarbonFootprintInputSchema>;

const CarbonFootprintAnalysisSchema = z.object({
  analysis: z.string().describe('A brief, insightful analysis of the user\'s carbon footprint for the day.'),
  recommendations: z
    .array(z.string())
    .describe('A list of 3 actionable recommendations for improvement for the next day.'),
});
export type CarbonFootprintAnalysis = z.infer<typeof CarbonFootprintAnalysisSchema>;

export async function analyzeFootprint(
  input: CarbonFootprintInput
): Promise<CarbonFootprintAnalysis> {
  return analyzeFootprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'carbonFootprintAnalysisPrompt',
  input: { schema: CarbonFootprintInputSchema },
  output: { schema: CarbonFootprintAnalysisSchema },
  prompt: `You are an expert environmental scientist specializing in personal carbon footprints.
  A user from {{{region}}} has provided their daily activities.

  User's activities:
  - Transport: {{{transport}}}
  - Diet: {{{diet}}}
  - Drinks: {{{drink}}}
  - Energy: {{{energy}}}
  {{#if other}}- Other Notes: {{{other}}}{{/if}}

  Your tasks are:
  1.  **Analysis:** Provide a brief, non-judgmental, and insightful analysis (1-2 sentences) of their major carbon impact sources for the day.
  2.  **Recommendations:** Provide exactly 3 actionable, specific, and simple recommendations they can try tomorrow to reduce their footprint.

  Keep the tone encouraging and helpful.
  `,
});

const analyzeFootprintFlow = ai.defineFlow(
  {
    name: 'analyzeFootprintFlow',
    inputSchema: CarbonFootprintInputSchema,
    outputSchema: CarbonFootprintAnalysisSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
