
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
import { computeKgDeterministic, TRANSPORT_KG, DIET_KG, DRINK_KG } from '@/lib/carbon-calculator';
import { pickOne } from '@/lib/select-normalize';
import { toEnergyEnum } from '@/lib/energy-map';
import { enforceWorstFloor } from '@/lib/carbon-guards';
import { normalizeRegion } from '@/lib/region-map';
import { sanitizeAiResponse } from '@/lib/ai-schema';

export async function analyzeFootprint(
  input: CarbonFootprintAnalysisInput
): Promise<CarbonFootprintAnalysisOutput> {
  return analyzeFootprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'carbonFootprintPrompt',
  input: { schema: CarbonFootprintAnalysisInputSchema },
  output: { schema: CarbonFootprintAnalysisOutputSchema },
  prompt: `You are an environmental analyst. Output JSON ONLY with this exact shape:

{
  "estimatedFootprintKg": number,
  "analysis": "string (non-empty, 1 short paragraph)",
  "recommendations": ["string","string","string"],
  "recoveryActions": ["string","string","string"]
}

Rules:
- NEVER return null. If unsure, return "" for analysis and generic tips for lists.
- Each array MUST have exactly 3 non-empty strings.
- No extra fields, no commentary outside JSON.

**REGIONAL BENCHMARKS (Source of Truth for CO2 Context):**
- Turkey: Min: 5 kg, Avg: 10 kg, Max: 40 kg
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
`,
    config: {
    temperature: 0,
    topK: 1,
    topP: 0,
  }
});

const analyzeFootprintFlow = ai.defineFlow(
  {
    name: 'analyzeFootprintFlow',
    inputSchema: CarbonFootprintAnalysisInputSchema,
    outputSchema: CarbonFootprintAnalysisOutputSchema,
  },
  async (input) => {
    const processedInput = {
      ...input,
      transport: JSON.stringify(input.transport),
      diet: JSON.stringify(input.diet),
    };
    try {
      const { output } = await prompt(processedInput);
      return sanitizeAiResponse(output);
    } catch (error) {
      console.error('AI analysis failed, falling back to deterministic calculation.', error);
      
      const safeTransport = input.transport.length > 0 ? input.transport : ['car_gasoline'];
      const safeDiet = input.diet.length > 0 ? input.diet : ['red_meat'];
      const safeDrink = (input as any).drink?.length > 0 ? (input as any).drink : ['drink_bottled'];

      const worstTransport = pickOne(safeTransport as any, TRANSPORT_KG, 'worst');
      const worstDiet = pickOne(safeDiet as any, DIET_KG, 'worst');
      const worstDrink = pickOne(safeDrink as any, DRINK_KG, 'worst');
      const energyEnum = toEnergyEnum(input.energy);
      const regionKey = normalizeRegion(input.region);

      let kg = computeKgDeterministic(regionKey, worstTransport, worstDiet, worstDrink, energyEnum);
      kg = enforceWorstFloor(kg, regionKey, worstTransport, worstDiet, worstDrink, energyEnum);

      return sanitizeAiResponse({
        estimatedFootprintKg: kg,
        analysis: null,
        recommendations: null,
        recoveryActions: null,
      });
    }
  }
);
