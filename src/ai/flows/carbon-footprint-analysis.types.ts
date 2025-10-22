import { z } from 'genkit';

export const CarbonFootprintAnalysisInputSchema = z.object({
  language: z
    .string()
    .describe(
      "The ISO 639-1 code for the desired output language (e.g., 'en', 'es', 'tr')."
    ),
  region: z
    .string()
    .describe('The user\'s geographical region (e.g., "Dubai, UAE", "Germany").'),
  transport: z
    .array(z.string())
    .describe('List of transportation methods used.'),
  diet: z.array(z.string()).describe('List of food types consumed.'),
  energy: z.string().describe('Description of home energy usage.'),
  other: z.string().optional().describe('Any other relevant information.'),
});
export type CarbonFootprintAnalysisInput = z.infer<
  typeof CarbonFootprintAnalysisInputSchema
>;

export const CarbonFootprintAnalysisOutputSchema = z.object({
  estimatedFootprintKg: z.number().describe('A numerical estimate of the CO2 footprint in kg.'),
  analysis: z
    .string()
    .optional()
    .nullable()
    .describe(
      "A brief, one-paragraph analysis of the user's footprint in the specified language."
    ),
  recommendations: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      'An array of three personalized recommendations for improvement, in the specified language.'
    ),
  recoveryActions: z
    .array(z.string())
    .optional()
    .nullable()
    .describe(
      'An array of three actionable steps the user can take today to earn bonus points, in the specified language.'
    ),
});
export type CarbonFootprintAnalysisOutput = z.infer<
  typeof CarbonFootprintAnalysisOutputSchema
>;
