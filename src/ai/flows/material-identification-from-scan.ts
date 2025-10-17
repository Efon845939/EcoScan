'use server';
/**
 * @fileOverview Identifies the material of a scanned product's packaging.
 *
 * - identifyMaterial - A function that identifies the material of a product.
 * - MaterialIdentificationInput - The input type for the identifyMaterial function.
 * - MaterialIdentificationOutput - The return type for the identifyMaterial function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaterialIdentificationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the product's packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productDescription: z.string().describe('The description of the product.'),
});
export type MaterialIdentificationInput = z.infer<
  typeof MaterialIdentificationInputSchema
>;

const MaterialIdentificationOutputSchema = z.object({
  material: z.string().describe('The identified material of the product.'),
  confidence: z
    .number()
    .describe(
      'The confidence level (0-1) of the material identification. Higher values represent higher confidence.'
    ),
});
export type MaterialIdentificationOutput = z.infer<
  typeof MaterialIdentificationOutputSchema
>;

export async function identifyMaterial(
  input: MaterialIdentificationInput
): Promise<MaterialIdentificationOutput> {
  return identifyMaterialFlow(input);
}

const identifyMaterialPrompt = ai.definePrompt({
  name: 'identifyMaterialPrompt',
  input: {schema: MaterialIdentificationInputSchema},
  output: {schema: MaterialIdentificationOutputSchema},
  prompt: `You are an expert in material identification for recycling purposes.

  Based on the following information, identify the material of the product packaging and provide a confidence level (0-1) for your identification.

  Product Description: {{{productDescription}}}
  Packaging Photo: {{media url=photoDataUri}}

  Ensure that the material and confidence level are accurate for recycling purposes.
  If more information is needed, identify what information would be useful to increase confidence.
  If you are not confident, return a confidence of 0.
`,
});

const identifyMaterialFlow = ai.defineFlow(
  {
    name: 'identifyMaterialFlow',
    inputSchema: MaterialIdentificationInputSchema,
    outputSchema: MaterialIdentificationOutputSchema,
  },
  async input => {
    const {output} = await identifyMaterialPrompt(input);
    return output!;
  }
);
