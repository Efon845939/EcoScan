'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Leaf, ThumbsUp } from 'lucide-react';
import {
  analyzeCarbonFootprint,
  CarbonFootprintInput,
  CarbonFootprintOutput,
} from '@/ai/flows/carbon-footprint-analysis';
import { useToast } from '@/hooks/use-toast';

type SurveyStep = 'form' | 'loading' | 'results';

export function CarbonFootprintSurvey({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<SurveyStep>('form');
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<CarbonFootprintInput>({
    transport: '',
    diet: '',
    energy: '',
  });
  const [results, setResults] = useState<CarbonFootprintOutput | null>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof CarbonFootprintInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    setStep('loading');
    startTransition(() => {
      analyzeCarbonFootprint(formData)
        .then(setResults)
        .catch((err) => {
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'Could not analyze your carbon footprint. Please try again.',
          });
          setStep('form'); // Go back to form on error
        })
        .finally(() => {
          setStep('results');
        });
    });
  };

  const isFormInvalid = !formData.transport || !formData.diet || !formData.energy;

  if (step === 'loading' || isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-semibold">Analyzing your day...</p>
          <p className="text-muted-foreground">Our AI is calculating your footprint.</p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'results' && results) {
    return (
      <Card>
        <CardHeader>
          <div className="relative flex items-center justify-center">
            <CardTitle className="font-headline text-center text-2xl flex items-center gap-2">
              <Leaf className="text-primary" /> Your Daily Footprint
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">Estimated Footprint:</p>
            <p className="text-5xl font-bold font-headline text-primary">
              {results.estimatedFootprintKg.toFixed(1)}
              <span className="text-xl"> kg CO₂</span>
            </p>
          </div>
          <Alert>
            <ThumbsUp className="h-4 w-4" />
            <AlertTitle>Analysis</AlertTitle>
            <AlertDescription>{results.analysis}</AlertDescription>
          </Alert>

          <div>
            <h3 className="font-semibold mb-2">How to improve:</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              {results.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full" onClick={onBack}>
            Back to Main Menu
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CardTitle className="font-headline text-2xl">Your Daily Footprint</CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          Answer a few questions to get an estimate of your carbon footprint for today.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transport">How did you get around today?</Label>
          <Select
            onValueChange={(value) => handleInputChange('transport', value)}
            value={formData.transport}
          >
            <SelectTrigger id="transport">
              <SelectValue placeholder="Select transport..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Car (Gasoline)">Car (Gasoline)</SelectItem>
              <SelectItem value="Electric Vehicle">Electric Vehicle</SelectItem>
              <SelectItem value="Bus or Train">Bus or Train</SelectItem>
              <SelectItem value="Bike or Walk">Bike or Walk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="diet">What was your diet like today?</Label>
          <Select onValueChange={(value) => handleInputChange('diet', value)} value={formData.diet}>
            <SelectTrigger id="diet">
              <SelectValue placeholder="Select diet..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Heavy on red meat">Heavy on red meat</SelectItem>
              <SelectItem value="Poultry/Fish, no red meat">Poultry/Fish, no red meat</SelectItem>
              <SelectItem value="Vegetarian">Vegetarian</SelectItem>
              <SelectItem value="Vegan">Vegan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="energy">How was your energy use at home?</Label>
          <Input
            id="energy"
            placeholder="e.g., Used the AC, kept lights on..."
            value={formData.energy}
            onChange={(e) => handleInputChange('energy', e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={isPending || isFormInvalid}
        >
          {isPending ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <Leaf className="mr-2" />
          )}
          Calculate My Footprint
        </Button>
      </CardFooter>
    </Card>
  );
}
