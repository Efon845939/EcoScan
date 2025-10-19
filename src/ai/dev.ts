'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/confidence-based-assistance.ts';
import '@/ai/flows/material-identification-from-scan.ts';
import '@/ai/flows/carbon-footprint-analysis.ts';
