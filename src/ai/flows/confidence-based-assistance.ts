'use server';

/**
 * @fileOverview An AI agent that uses product description to increase confidence in identifying the material of the product.
 *
 * - identifyMaterial - A function that handles the material identification process with confidence boosting.
 * - IdentifyMaterialInput - The input type for the identifyMaterial function.
 * - IdentifyMaterialOutput - The return type for the identifyMaterial function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyMaterialInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productDescription: z
    .string()
    .describe('The description of the product from its packaging.'),
});
export type IdentifyMaterialInput = z.infer<typeof IdentifyMaterialInputSchema>;

const IdentifyMaterialOutputSchema = z.object({
  material: z
    .string()
    .describe('The identified material of the product (glass, plastic, metal, etc.).'),
  confidenceLevel: z
    .number()
    .describe('The confidence level (0-1) of the material identification.'),
});
export type IdentifyMaterialOutput = z.infer<typeof IdentifyMaterialOutputSchema>;

export async function identifyMaterial(
  input: IdentifyMaterialInput
): Promise<IdentifyMaterialOutput> {
  return identifyMaterialFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyMaterialPrompt',
  input: {schema: IdentifyMaterialInputSchema},
  output: {schema: IdentifyMaterialOutputSchema},
  prompt: `You are an expert in recycling and material identification.

  Based on the provided photo and product description, identify the material of the product and provide a confidence level.

  Photo: {{media url=photoDataUri}}
  Product Description: {{{productDescription}}}

  Material: {{$value: material}}
  Confidence Level: {{$value: confidenceLevel}}
  `,
});

const identifyMaterialFlow = ai.defineFlow(
  {
    name: 'identifyMaterialFlow',
    inputSchema: IdentifyMaterialInputSchema,
    outputSchema: IdentifyMaterialOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
