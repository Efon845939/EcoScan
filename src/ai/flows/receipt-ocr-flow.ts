'use server';

/**
 * @fileOverview Processes receipt images to extract structured data using AI.
 *
 * - processReceipt - A function that handles the receipt OCR and data extraction.
 * - ReceiptInput - The input type for the processReceipt function.
 * - ReceiptOutput - The return type for the processReceipt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const ReceiptInputSchema = z.object({
  receiptImageUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReceiptInput = z.infer<typeof ReceiptInputSchema>;

export const ReceiptOutputSchema = z.object({
  merchantName: z.string().describe('The name of the merchant or store.'),
  totalAmount: z.number().describe('The total amount of the transaction.'),
  currency: z
    .string()
    .describe('The currency code (e.g., TRY, USD, EUR).'),
  receiptDatetime: z
    .string()
    .describe('The date and time of the transaction in ISO 8601 format.'),
  lineItems: z
    .array(
      z.object({
        name: z.string().describe('Name of the product or item.'),
        category: z.string().describe('Inferred category of the item (e.g., produce, dairy, electronics).'),
        qty: z.number().describe('Quantity of the item.'),
        amount: z.number().describe('Price of the item line.'),
      })
    )
    .optional()
    .describe('A list of items purchased. Optional.'),
  rawTextHash: z.string().describe("A SHA256 hash of the extracted raw text from the receipt for deduplication purposes."),
});
export type ReceiptOutput = z.infer<typeof ReceiptOutputSchema>;

export async function processReceipt(input: ReceiptInput): Promise<ReceiptOutput> {
  return receiptOcrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'receiptOcrPrompt',
  input: { schema: ReceiptInputSchema },
  output: { schema: ReceiptOutputSchema },
  prompt: `You are an expert OCR system specializing in extracting structured data from receipts.
Analyze the provided receipt image. Extract the following fields with the highest possible accuracy:
- merchantName
- totalAmount
- currency
- receiptDatetime (must be in ISO 8601 format)
- lineItems (if available)
- Generate a SHA256 hash of the entire raw text extracted from the receipt.

Receipt Image: {{media url=receiptImageUri}}

Return the data in the specified JSON format.
`,
});

const receiptOcrFlow = ai.defineFlow(
  {
    name: 'receiptOcrFlow',
    inputSchema: ReceiptInputSchema,
    outputSchema: ReceiptOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
