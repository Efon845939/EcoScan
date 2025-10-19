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

const ReceiptInputSchema = z.object({
  receiptImageUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReceiptInput = z.infer<typeof ReceiptInputSchema>;

const ReceiptOutputSchema = z.object({
  isValidReceipt: z.boolean().describe("True if the image is a valid, legible receipt. False if it's a blank image, a person, a landscape, etc."),
  merchantName: z.string().optional().describe('The name of the merchant or store. Null if not found or invalid.'),
  totalAmount: z.number().optional().describe('The total amount of the transaction. Null if not found or invalid.'),
  currency: z
    .string()
    .optional()
    .describe('The currency code (e.g., TRY, USD, EUR). Null if not found or invalid.'),
  receiptDatetime: z
    .string()
    .optional()
    .describe('The date and time of the transaction in ISO 8601 format. Null if not found or invalid.'),
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
  rawTextHash: z.string().optional().describe("A SHA256 hash of the extracted raw text from the receipt for deduplication purposes. Null if image is not a valid receipt."),
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

Your first and most important task is to determine if the image provided is a real receipt. If it is not a receipt (e.g., a photo of a computer, a person, a landscape, a blank image), you MUST set 'isValidReceipt' to 'false' and all other fields to null.

If and only if the image is a valid receipt, perform the following extraction tasks:
- Set 'isValidReceipt' to 'true'.
- Extract the 'merchantName'.
- Extract the 'totalAmount'.
- Extract the 'currency' (e.g., AED, USD, EUR).
- Extract the 'receiptDatetime' and convert it to strict ISO 8601 format.
- If line items are clearly visible, extract them.
- Finally, generate a SHA256 hash of the ENTIRE raw text content you extracted from the receipt. This is critical for preventing duplicates.

Receipt Image: {{media url=receiptImageUri}}

Return the data in the specified JSON format. Be strict about the 'isValidReceipt' flag.
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
