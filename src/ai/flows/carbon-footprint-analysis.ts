'use server';
/**
 * @fileOverview Analyzes a user's daily activities to estimate their carbon footprint and provide feedback.
 *
 * - analyzeFootprint - A function that handles the footprint analysis.
 * - CarbonFootprintAnalysisInput - The input type for the function.
 * - CarbonFootprintAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import {
  CarbonFootprintAnalysisInput,
  CarbonFootprintAnalysisInputSchema,
  CarbonFootprintAnalysisOutput,
  CarbonFootprintAnalysisOutputSchema,
} from './carbon-footprint-analysis.types';

export async function analyzeFootprint(
  input: CarbonFootprintAnalysisInput
): Promise<CarbonFootprintAnalysisOutput> {
  return analyzeFootprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'carbonFootprintPrompt',
  input: { schema: CarbonFootprintAnalysisInputSchema },
  output: { schema: CarbonFootprintAnalysisOutputSchema },
  prompt: `You are an expert environmental analyst for the EcoScan Rewards app.
Your task is to analyze a user's daily activities and provide feedback in a specified language.

**CRITICAL INSTRUCTIONS:**
1.  All output fields ('analysis', 'recommendations', 'recoveryActions') MUST be in the requested language: {{{language}}}.
2.  Your tone should be encouraging, positive, and helpful, even if the user's footprint is high.
3.  The 'recoveryActions' MUST be concrete, verifiable actions a user can do *today* to earn points via the app's Verification Center (e.g., "Verify a meal receipt", "Take a photo of your bus ride", "Photograph your plant-based meal").

**User's Daily Log:**
- Language for response: {{{language}}}
- Region: {{{region}}}
- Transport: {{{jsonStringify transport}}}
- Diet: {{{jsonStringify diet}}}
- Energy Use: {{{energy}}}
- Other Info: {{{other}}}

Based on this, provide the 'analysis', 'recommendations', and 'recoveryActions' in the specified JSON format.
`,
});

const analyzeFootprintFlow = ai.defineFlow(
  {
    name: 'analyzeFootprintFlow',
    inputSchema: CarbonFootprintAnalysisInputSchema,
    outputSchema: CarbonFootprintAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
