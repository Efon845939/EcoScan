// src/app/carbon-footprint/page.tsx
'use client';
import { useState } from 'react';
import { DetailedCarbonSurvey } from '@/components/DetailedCarbonSurvey';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeDetailedFootprint, DetailedAnalysisOutput } from '@/ai/flows/detailed-carbon-analysis';
import { Loader2, ArrowLeft, Lightbulb, TrendingUp, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SurveyState = 'form' | 'loading' | 'results';

export default function CarbonFootprintPage() {
  const [state, setState] = useState<SurveyState>('form');
  const [results, setResults] = useState<DetailedAnalysisOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSurveySubmit = async (data: any) => {
    setState('loading');
    setError(null);
    try {
      const analysis = await analyzeDetailedFootprint(data);
      setResults(analysis);
      setState('results');
    } catch (e: any) {
      console.error('Detailed carbon analysis failed:', e);
      setError('An error occurred during the analysis. Please try again.');
      setState('form');
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-6 text-lg font-semibold text-center">
          Analyzing your habits...<br/>This may take a moment.
        </p>
      </div>
    );
  }

  if (state === 'results' && results) {
    return (
      <div className="min-h-screen bg-muted/20 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => setState('form')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Survey
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Your Carbon Footprint Analysis</CardTitle>
                    <CardDescription>
                        Based on your answers, here is a summary and some personalized suggestions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <h3 className="font-semibold text-primary flex items-center gap-2"><TrendingUp /> Footprint Summary</h3>
                        <p className="mt-2 text-primary-foreground/90">{results.carbon_footprint_summary}</p>
                    </div>

                     <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2"><Lightbulb /> Personalized Ways to Improve</h3>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            {results.improvement_suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2"><Star /> How to Earn Points</h3>
                         <ul className="list-disc list-inside space-y-2 pl-2">
                            {results.earn_points_tasks.map((task, index) => (
                                <li key={index}>{task}</li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
             <Button className="w-full" onClick={() => router.push('/')}>
                Back to Home
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
            {error && <p className="text-destructive mb-4">{error}</p>}
            <DetailedCarbonSurvey onSubmit={handleSurveySubmit} />
        </div>
    </div>
  );
}
