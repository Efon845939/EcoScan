'use server';
/**
 * @fileOverview Verifies that a user is correctly disposing of a recyclable item.
 *
 * - verifyDisposalAction - A function that verifies the disposal action.
 * - VerifyDisposalActionInput - The input type for the verifyDisposalAction function.
 * - VerifyDisposalActionOutput - The return type for the verifyDisposalAction function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VerifyDisposalActionInputSchema = z.object({
  material: z.string().describe('The material of the item being disposed of (e.g., "plastic", "glass").'),
  photoOfDisposalUri: z
    .string()
    .describe(
      "A photo of the user performing the disposal action, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VerifyDisposalActionInput = z.infer<
  typeof VerifyDisposalActionInputSchema
>;

const VerifyDisposalActionOutputSchema = z.object({
  isValid: z
    .boolean()
    .describe('Whether the disposal action is valid and earns points.'),
  reason: z
    .string()
    .describe(
      'A brief explanation for the decision. If invalid, explains why (e.g., "No recycling bin visible", "Image appears to be a duplicate.", "Image may be AI-generated.").'
    ),
});
export type VerifyDisposalActionOutput = z.infer<
  typeof VerifyDisposalActionOutputSchema
>;

export async function verifyDisposalAction(
  input: VerifyDisposalActionInput
): Promise<VerifyDisposalActionOutput> {
  return verifyDisposalActionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyDisposalActionPrompt',
  input: { schema: VerifyDisposalActionInputSchema },
  output: { schema: VerifyDisposalActionOutputSchema },
  prompt: `You are an AI moderator for a recycling rewards app. Your task is to verify a user's photo submission to ensure they are actually recycling an item.

You must perform the following checks rigorously:

1.  **Action Verification:** Analyze the image to confirm the user (or at least their hand) is in the act of placing an object into a recycling bin or a container that looks like one. The object's material should plausibly match the provided material type.

2.  **Fraud Detection - Duplicates:** Scrutinize the image for signs of being a repeated submission. Does it look identical to a previous submission (e.g., same person, same clothes, same angle, same lighting, same item)? Be very strict. If you suspect a duplicate, you MUST reject it.

3.  **Fraud Detection - AI Generation:** Analyze the image for artifacts or inconsistencies that suggest it is AI-generated (e.g., weird hands, distorted text, unnatural textures). If you suspect it is AI-generated, you MUST reject it.

**Input Data:**
- Material to be disposed of: {{{material}}}
- Photo from user: {{media url=photoOfDisposalUri}}

**Decision Logic:**
- If the action is clearly shown and there are no signs of fraud, set \`isValid\` to \`true\` and provide a positive reason.
- If the action is not clear (e.g., no bin, no item), set \`isValid\` to \`false\` and state why.
- If you suspect the image is a **duplicate**, set \`isValid\` to \`false\` and state "Image appears to be a duplicate submission." as the reason.
- If you suspect the image is **AI-generated**, set \`isValid\` to \`false\` and state "Image appears to be AI-generated." as the reason.

Provide your response in the specified JSON format.
`,
});

const verifyDisposalActionFlow = ai.defineFlow(
  {
    name: 'verifyDisposalActionFlow',
    inputSchema: VerifyDisposalActionInputSchema,
    outputSchema: VerifyDisposalActionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
