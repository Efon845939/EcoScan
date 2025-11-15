'use client';
import { AppContainer } from '@/components/app-container';

export default function CarbonFootprintPage() {
  // This page now correctly renders the AppContainer with the survey step
  // The logic inside AppContainer will handle the survey display
  return <AppContainer initialStep="survey" />;
}
