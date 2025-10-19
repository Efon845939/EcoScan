'use server';

/**
 * @fileOverview An AI agent that uses a product's barcode to increase confidence in identifying its material.
 *
 * - identifyMaterialWithBarcode - A function that handles the material identification process.
 * - IdentifyMaterialWithBarcodeInput - The input type for the function.
 * - IdentifyMaterialWithBarcodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyMaterialWithBarcodeInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  barcodeNumber: z
    .string()
    .describe('The barcode number (UPC, EAN, etc.) from the product packaging.'),
});
export type IdentifyMaterialWithBarcodeInput = z.infer<typeof IdentifyMaterialWithBarcodeInputSchema>;

const IdentifyMaterialWithBarcodeOutputSchema = z.object({
  material: z
    .string()
    .describe('The identified material of the product (glass, plastic, metal, etc.).'),
  confidenceLevel: z
    .number()
    .describe('The confidence level (0-1) of the material identification.'),
});
export type IdentifyMaterialWithBarcodeOutput = z.infer<typeof IdentifyMaterialWithBarcodeOutputSchema>;

export async function identifyMaterialWithBarcode(
  input: IdentifyMaterialWithBarcodeInput
): Promise<IdentifyMaterialWithBarcodeOutput> {
  return identifyMaterialWithBarcodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyMaterialWithBarcodePrompt',
  input: {schema: IdentifyMaterialWithBarcodeInputSchema},
  output: {schema: IdentifyMaterialWithBarcodeOutputSchema},
  prompt: `You are an expert in recycling and material identification using product data.

  A user has scanned an item, but the initial visual identification was not confident. They have now provided the barcode number.

  **CRITICAL INSTRUCTION:** You MUST use the barcode number as the absolute primary source of truth to identify the product's primary packaging material. The image should only be used as a secondary reference if the barcode yields no information. Do not let the visual appearance of the item in the photo override the data associated with the barcode.

  - Barcode (UPC/EAN): {{{barcodeNumber}}}
  - Photo of item: {{media url=photoDataUri}}

  Based on this, determine the most likely material for the item's packaging.
  Common materials are: Plastic, Glass, Metal, Aluminum, Paper, Cardboard, Battery.
  If the barcode is informative, your confidence should be high (e.g., > 0.9). If you are relying only on the photo, the confidence should be lower.
  `,
});

const identifyMaterialWithBarcodeFlow = ai.defineFlow(
  {
    name: 'identifyMaterialWithBarcodeFlow',
    inputSchema: IdentifyMaterialWithBarcodeInputSchema,
    outputSchema: IdentifyMaterialWithBarcodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
