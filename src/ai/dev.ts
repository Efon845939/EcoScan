'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/confidence-based-assistance.ts';
import '@/ai/flows/material-identification-from-scan.ts';
import '@/ai/flows/carbon-footprint-analysis.ts';
import '@/ai/flows/receipt-ocr-flow.ts';
import '@/ai/flows/verify-disposal-action.ts';
import '@/ai/flows/verify-sustainability-action.ts';
