
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
import { ReceiptOutput } from '@/ai/flows/receipt-ocr-flow';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { useFirebase, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

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
  surveyPoints: number;
  receiptResult: ReceiptOutput | null;
  region: string;
};

export function CarbonFootprintSurvey({ onBack, onScanReceipt, userProfile, onSurveyComplete, onSecondChance, results, surveyPoints, receiptResult, region }: CarbonFootprintSurveyProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<CarbonFootprintInput>({
    location: region,
    transport: [],
    diet: [],
    energy: '',
  });
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  const handleCheckboxChange = (field: 'transport' | 'diet', value: string) => {
    setFormData((prev) => {
      const newValues = prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value];
      return { ...prev, [field]: newValues };
    });
  };

  const handleEnergyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, energy: value }));
  };

  const handleVerifyWithReceipt = () => {
    if (!results || !receiptResult) return;

    // Calculate base points from sustainability score (not provisional points)
    const basePoints = Math.round(results.sustainabilityScore * 2.5);
    const bonusPoints = basePoints * 5; // 500% bonus

     if (userProfileRef && userProfile) {
        // Add the bonus points to the user's total.
        const currentPoints = userProfile.totalPoints || 0;
        const newPoints = Math.max(0, currentPoints + bonusPoints);
        updateDocumentNonBlocking(userProfileRef, {
            totalPoints: newPoints,
        });
     }
     toast({
        title: 'Bonus Applied!',
        description: `You've earned a massive ${bonusPoints} point bonus for verifying your footprint!`,
     });

  }

  useEffect(() => {
    if (receiptResult) {
        handleVerifyWithReceipt();
    }
  }, [receiptResult]);

  // Update formData location when region prop changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, location: region }));
  }, [region]);


  const handleSubmit = () => {
    setIsLoading(true);
    startTransition(() => {
      analyzeCarbonFootprint(formData)
        .then((analysisResults) => {
          let points = 0;
          if (analysisResults.estimatedFootprintKg > 30) {
            const penalty = -Math.min(10, Math.round((analysisResults.estimatedFootprintKg - 30) / 2));
            points = penalty;
          } else {
            points = Math.round(analysisResults.sustainabilityScore * 0.5);
          }

          if (userProfileRef && userProfile) {
            const currentPoints = userProfile.totalPoints || 0;
            const newPoints = Math.max(0, currentPoints + points);
            updateDocumentNonBlocking(userProfileRef, {
              totalPoints: newPoints,
              lastCarbonSurveyDate: serverTimestamp(),
            });
          }
          onSurveyComplete(points, analysisResults);
        })
        .catch((err) => {
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'Analysis Failed',
            description: 'Could not analyze your carbon footprint. Please try again.',
          });
        })
        .finally(() => {
            setIsLoading(false);
        });
    });
  };

  const isFormInvalid =
    formData.transport.length === 0 ||
    formData.diet.length === 0 ||
    !formData.energy;

  // Show form if there are no results yet
  if (!results) {
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
            disabled={isPending || isLoading || isFormInvalid}
          >
            {isPending || isLoading ? (
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

  // Otherwise, show the results page.
  const isPenalty = surveyPoints < 0;

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
        
        {isPenalty ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>High Footprint Penalty</AlertTitle>
            <AlertDescription>
                Your daily footprint was high, so {surveyPoints} points have been deducted. You can reverse this by taking one of the actions below and verifying with a photo.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="border-yellow-400/50 text-center bg-yellow-50/50 dark:bg-yellow-900/10">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">Provisional Points Awarded!</AlertTitle>
            <AlertDescription>
                You earned a provisional {surveyPoints} points. Scan a receipt from your day to verify your footprint and get a 500% point bonus!
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
        {isPenalty ? (
          <Button size="lg" className="w-full" onClick={onSecondChance}>
            <Camera className="mr-2" /> Take Action to Reverse Penalty
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={onScanReceipt} disabled={!!receiptResult}>
            <Receipt className="mr-2" /> {receiptResult ? 'Bonus Applied!' : 'Scan Receipt to Verify & Get Bonus'}
          </Button>
        )}
        <Button size="lg" variant="outline" className="w-full" onClick={onBack}>
          Back to Main Menu
        </Button>
      </CardFooter>
    </Card>
  );
}

    