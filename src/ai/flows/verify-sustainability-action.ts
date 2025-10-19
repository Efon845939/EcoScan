'use server';
/**
 * @fileOverview Verifies that a user is performing a recommended sustainable action.
 *
 * - verifySustainabilityAction - A function that verifies the action.
 * - VerifySustainabilityActionInput - The input type for the function.
 * - VerifySustainabilityActionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerifySustainabilityActionInputSchema = z.object({
  recommendations: z.array(z.string()).describe('The list of recommended actions given to the user.'),
  photoOfActionUri: z
    .string()
    .describe(
      "A photo of the user performing one of the recommended actions, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VerifySustainabilityActionInput = z.infer<
  typeof VerifySustainabilityActionInputSchema
>;

const VerifySustainabilityActionOutputSchema = z.object({
  isValid: z
    .boolean()
    .describe('Whether the action is verified and earns points.'),
  reason: z
    .string()
    .describe(
      'A brief explanation for the decision. If invalid, explains why (e.g., "Action in photo does not match recommendations.").'
    ),
});
export type VerifySustainabilityActionOutput = z.infer<
  typeof VerifySustainabilityActionOutputSchema
>;

export async function verifySustainabilityAction(
  input: VerifySustainabilityActionInput
): Promise<VerifySustainabilityActionOutput> {
  return verifySustainabilityActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifySustainabilityActionPrompt',
  input: { schema: VerifySustainabilityActionInputSchema },
  output: { schema: VerifySustainabilityActionOutputSchema },
  prompt: `You are an AI moderator for an eco-rewards app. A user has received a high carbon footprint score and has been given a list of recommendations to mitigate it. They have submitted a photo as proof of them performing one of these actions.

Your task is to verify if the photo genuinely shows the user performing one of the recommended actions. You must also check for basic signs of fraud (e.g., AI-generated images, obvious fakes).

**Recommended Actions:**
{{#each recommendations}}
- {{{this}}}
{{/each}}

**Photo from user:**
{{media url=photoOfActionUri}}

**Decision Logic:**
- If the photo clearly shows a person taking one of the recommended actions (e.g., a person on a bike, using public transport, unplugging a charger), set \`isValid\` to \`true\`.
- If the photo is unclear, unrelated to the recommendations, or appears fraudulent (AI-generated, screenshot, etc.), set \`isValid\` to \`false\` and provide a clear reason why.

Provide your response in the specified JSON format.
`,
});

const verifySustainabilityActionFlow = ai.defineFlow(
  {
    name: 'verifySustainabilityActionFlow',
    inputSchema: VerifySustainabilityActionInputSchema,
    outputSchema: VerifySustainabilityActionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
