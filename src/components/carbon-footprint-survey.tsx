
'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Leaf, ThumbsUp, Sparkles, AlertTriangle, Receipt, Camera } from 'lucide-react';
import {
  analyzeCarbonFootprint,
  CarbonFootprintInput,
  CarbonFootprintOutput,
} from '@/ai/flows/carbon-footprint-analysis';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { useFirebase, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

type SurveyStep = 'form' | 'loading' | 'results';

const transportOptions = [
  'Car (Gasoline)',
  'Electric Vehicle',
  'Bus or Train',
  'Bike or Walk',
];
const dietOptions = [
  'Heavy on red meat',
  'Poultry/Fish, no red meat',
  'Vegetarian',
  'Vegan',
];

type CarbonFootprintSurveyProps = {
  onBack: () => void;
  onScanReceipt: () => void;
  userProfile: any;
  onSurveyComplete: (points: number, results: CarbonFootprintOutput) => void;
  onSecondChance: () => void;
  results: CarbonFootprintOutput | null;
};

export function CarbonFootprintSurvey({ onBack, onScanReceipt, userProfile, onSurveyComplete, onSecondChance, results: initialResults }: CarbonFootprintSurveyProps) {
  const [step, setStep] = useState<SurveyStep>(initialResults ? 'results' : 'form');
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<CarbonFootprintInput>({
    transport: [],
    diet: [],
    energy: '',
  });
  const [results, setResults] = useState<CarbonFootprintOutput | null>(initialResults);
  const [pointsChanged, setPointsChanged] = useState(0);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  useEffect(() => {
    if(initialResults) {
        setResults(initialResults);
        setStep('results');
    }
  }, [initialResults]);

  const handleCheckboxChange = (
    field: 'transport' | 'diet',
    value: string
  ) => {
    setFormData((prev) => {
      const currentValues = prev[field];
      if (currentValues.includes(value)) {
        return { ...prev, [field]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prev, [field]: [...currentValues, value] };
      }
    });
  };

  const handleEnergyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, energy: value }));
  };

  const handleSubmit = () => {
    setStep('loading');
    startTransition(() => {
      analyzeCarbonFootprint(formData)
        .then((analysisResults) => {
          setResults(analysisResults);
          
          let points = 0;
          if (analysisResults.estimatedFootprintKg > 30) {
            const penalty = -Math.min(10, Math.round((analysisResults.estimatedFootprintKg - 30) / 2));
            points = penalty;
          } else {
            points = Math.round(analysisResults.sustainabilityScore * 0.5);
          }
          setPointsChanged(points);

          if (userProfileRef && userProfile) {
            const currentPoints = userProfile.totalPoints || 0;
            const newPoints = Math.max(0, currentPoints + points);
            updateDocumentNonBlocking(userProfileRef, {
              totalPoints: newPoints,
              lastCarbonSurveyDate: serverTimestamp(),
            });
            onSurveyComplete(points, analysisResults);
          }

          setStep('results');
        })
        .catch((err) => {
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'Could not analyze your carbon footprint. Please try again.',
          });
          setStep('form');
        });
    });
  };

  const isFormInvalid =
    formData.transport.length === 0 ||
    formData.diet.length === 0 ||
    !formData.energy;

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
             <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
             </Button>
            <CardTitle className="font-headline text-center text-2xl flex items-center gap-2">
              <Leaf className="text-primary" /> Your Daily Footprint
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">Estimated Footprint:</p>
            <p className="text-5xl font-bold font-headline text-primary">
              {results.estimatedFootprintKg.toFixed(1)}
              <span className="text-xl"> kg CO₂</span>
            </p>
            <p className="text-muted-foreground mt-2 text-sm italic">
              That's about the same as {results.tangibleComparison.toLowerCase()}.
            </p>
          </div>
          
          {pointsChanged < 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Footprint Penalty</AlertTitle>
              <AlertDescription>
                  Your daily footprint was high, so {pointsChanged} points have been deducted. You can reverse this by taking one of the actions below and verifying with a photo.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default" className="border-yellow-400/50 text-center bg-yellow-50/50 dark:bg-yellow-900/10">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-600 dark:text-yellow-400">Provisional Points Awarded!</AlertTitle>
              <AlertDescription>
                  You earned a provisional {pointsChanged} points. Scan a receipt from your day to verify your footprint and get a 500% point bonus!
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <ThumbsUp className="h-4 w-4" />
            <AlertTitle>Analysis</AlertTitle>
            <AlertDescription>{results.analysis}</AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How to improve tomorrow:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {results.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Do one of the needs for today:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {results.extraTips.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {pointsChanged < 0 ? (
            <Button size="lg" className="w-full" onClick={onSecondChance}>
              <Camera className="mr-2" /> Take Action to Reverse Penalty
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={onScanReceipt}>
              <Receipt className="mr-2" /> Scan Receipt to Verify & Get Bonus
            </Button>
          )}
          <Button size="lg" variant="outline" className="w-full" onClick={onBack}>
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
          Answer a few questions to get an estimate of your carbon footprint for today. Don't forget your receipt after your meal to confirm your carbon footprint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>How did you get around today?</Label>
          <div className="space-y-2">
            {transportOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`transport-${option}`}
                  checked={formData.transport.includes(option)}
                  onCheckedChange={() => handleCheckboxChange('transport', option)}
                />
                <Label
                  htmlFor={`transport-${option}`}
                  className="font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>What was your diet like today?</Label>
          <div className="space-y-2">
            {dietOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`diet-${option}`}
                  checked={formData.diet.includes(option)}
                  onCheckedChange={() => handleCheckboxChange('diet', option)}
                />
                <Label htmlFor={`diet-${option}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="energy">How was your energy use at home?</Label>
          <Input
            id="energy"
            placeholder="e.g., Used the AC, kept lights on..."
            value={formData.energy}
            onChange={(e) => handleEnergyChange(e.target.value)}
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
