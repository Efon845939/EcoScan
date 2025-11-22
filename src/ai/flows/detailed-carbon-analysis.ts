// src/ai/flows/detailed-carbon-analysis.ts
'use server';
/**
 * @fileOverview Analyzes a user's detailed questionnaire answers to estimate their carbon footprint and provide personalized feedback.
 *
 * - analyzeDetailedFootprint - A function that handles the detailed footprint analysis.
 * - DetailedAnalysisInput - The input type for the function (inferred as any).
 * - DetailedAnalysisOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input is dynamic from the form, so we accept a generic object.
const DetailedAnalysisInputSchema = z.any();
export type DetailedAnalysisInput = z.infer<typeof DetailedAnalysisInputSchema>;

const DetailedAnalysisOutputSchema = z.object({
  carbon_footprint_summary: z.string().describe("A comprehensive summary (2-3 sentences) of the user's weekly and monthly estimated carbon footprint, explaining the main contributing factors based on their answers."),
  improvement_suggestions: z.array(z.string()).length(5).describe("An array of exactly 5 actionable, personalized recommendations for improvement. Each suggestion must be tailored to the user's specific answers from the questionnaire."),
  earn_points_tasks: z.array(z.string()).length(5).describe("An array of exactly 5 concrete, verifiable tasks the user can do to earn points, such as 'Walk instead of driving for one day and verify with a photo' or 'Cook one plant-based meal and share the recipe'."),
});
export type DetailedAnalysisOutput = z.infer<typeof DetailedAnalysisOutputSchema>;

export async function analyzeDetailedFootprint(input: DetailedAnalysisInput): Promise<DetailedAnalysisOutput> {
  return detailedAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detailedCarbonAnalysisPrompt',
  input: { schema: DetailedAnalysisInputSchema },
  output: { schema: DetailedAnalysisOutputSchema },
  prompt: `You are an expert environmental analyst for the EcoScan Rewards app. Your task is to analyze a user's detailed questionnaire answers to provide a personalized and insightful carbon footprint analysis.

  **CRITICAL INSTRUCTIONS:**
  1.  **Analyze Holistically:** Do not just list the user's answers. Synthesize the information across all sections (Food, Transport, Home, Shopping, etc.) to form a complete picture of their lifestyle.
  2.  **Generate a Summary:** Based on the user's inputs, provide a 'carbon_footprint_summary'. This should be a rough but insightful estimation of their weekly and monthly carbon impact. Highlight the 1-2 biggest contributing factors (e.g., "Your daily long-distance commute by petrol car and frequent consumption of red meat are the primary drivers of your footprint...").
  3.  **Create Personalized Suggestions:** Generate 'improvement_suggestions'. These MUST be directly related to the user's answers.
      - If they drive a petrol car, suggest carpooling or using public transport on certain days.
      - If they eat meat daily, suggest "Meatless Mondays".
      - If their AC usage is high, recommend adjusting the thermostat by a few degrees.
      - DO NOT give generic advice. Each of the 5 suggestions must be a tailored response to a specific answer they provided.
  4.  **Create Actionable Tasks:** Generate 'earn_points_tasks'. These must be concrete, verifiable actions the user can take within the app to earn points. They should be challenging but achievable.
      - Bad example: "Use less plastic."
      - Good example: "Go one week without buying any single-use plastic bottles and verify with your receipts."
      - Good example: "Switch to a vegetarian diet for 2 days this week and verify one of your meals with a photo."

  **User's Questionnaire Data:**
  \`\`\`json
  {{{jsonStringify .}}}
  \`\`\`

  Based on this data, provide the 'carbon_footprint_summary', 'improvement_suggestions', and 'earn_points_tasks' in the specified JSON format. Ensure your response is encouraging, insightful, and directly actionable.`,
});

// Helper to use in the prompt template
const jsonStringify = (obj: any) => JSON.stringify(obj, null, 2);

const detailedAnalysisFlow = ai.defineFlow(
  {
    name: 'detailedAnalysisFlow',
    inputSchema: DetailedAnalysisInputSchema,
    outputSchema: DetailedAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { custom: { jsonStringify } });
    if (!output) {
      throw new Error("The AI model did not return a valid analysis. Please try again.");
    }
    return output;
  }
);
