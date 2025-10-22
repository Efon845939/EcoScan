
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
  prompt: `You are an expert, empathetic, and encouraging environmental analyst for the EcoScan Rewards app.
Your main goal is to analyze a user's daily activities, provide a detailed and insightful analysis of their carbon footprint, and give actionable, personalized recommendations.

**CRITICAL INSTRUCTIONS:**
1.  **Language:** All output text ('analysis', 'recommendations', 'recoveryActions') MUST be in the requested language: {{{language}}}.
2.  **Tone:** Your tone must always be positive and encouraging, even if the user's footprint is high. Avoid judgmental language. Frame high-impact days as opportunities for improvement. The analysis should be 2-3 detailed sentences long.
3.  **Analysis Quality:** Your 'analysis' must be insightful and directly reference the user's provided activities and region. Use the Regional Benchmarks below to give context. For example: "Your travel choices were great for a resident of Dubai, but your diet contributed significantly to your footprint today."
4.  **Recommendations Quality:** The 'recommendations' should be specific, actionable, and long-term suggestions. They must be detailed and explain the "why" behind the suggestion. Give longer, more descriptive recommendations.
5.  **Recovery Actions Quality:** The 'recoveryActions' MUST be concrete, verifiable actions a user can do *today* to earn points via the app's Verification Center. These should be framed as immediate opportunities, like "Take a live photo of your bus ride to earn back some points," or "Verify your plant-based meal with a receipt in the Verification Center for a bonus."

**REGIONAL BENCHMARKS (Source of Truth for CO2 Context):**
- Turkey: Min: 5 kg, Avg: 10 kg, Max: 25 kg
- Europe: Min: 8 kg, Avg: 20 kg, Max: 40 kg
- USA: Min: 15 kg, Avg: 40 kg, Max: 60 kg
- UAE/Dubai: Min: 20 kg, Avg: 50 kg, Max: 70 kg
- Kuwait: Min: 25 kg, Avg: 65 kg, Max: 85 kg
- Japan: Min: 6 kg, Avg: 15 kg, Max: 35 kg
- UK: Min: 7 kg, Avg: 18 kg, Max: 38 kg

**User's Daily Log:**
- Language for response: {{{language}}}
- Region: {{{region}}}
- Transport: {{{transport}}}
- Diet: {{{diet}}}
- Energy Use: {{{energy}}}
- Other Info: {{{other}}}

Based on this, provide the 'analysis', 'recommendations', and 'recoveryActions' in the specified JSON format. Ensure your response is high-quality, detailed, and empathetic. Critically, you MUST provide an 'estimatedFootprintKg' based on all the inputs.
`,
});

const analyzeFootprintFlow = ai.defineFlow(
  {
    name: 'analyzeFootprintFlow',
    inputSchema: CarbonFootprintAnalysisInputSchema,
    outputSchema: CarbonFootprintAnalysisOutputSchema,
  },
  async (input) => {
    // Pre-process the input to stringify arrays before passing to the prompt
    const processedInput = {
      ...input,
      transport: JSON.stringify(input.transport),
      diet: JSON.stringify(input.diet),
    };
    const { output } = await prompt(processedInput);
    return output!;
  }
);
