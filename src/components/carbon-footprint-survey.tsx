
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
import { ChevronLeft, Loader2, Leaf, ThumbsUp, ThumbsDown, Meh, Sparkles, AlertTriangle, Receipt, Camera } from 'lucide-react';
import {
  analyzeCarbonFootprint,
  CarbonFootprintInput,
  CarbonFootprintOutput,
} from '@/ai/flows/carbon-footprint-analysis';
import { ReceiptOutput } from '@/ai/flows/receipt-ocr-flow';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { useFirebase, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { pointsFromKgRegionAware, RegionKey, computeProvisional, finalizeWithReceipt } from '@/lib/carbon-calculator';

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
  language: string;
};

export function CarbonFootprintSurvey({ onBack, onScanReceipt, userProfile, onSurveyComplete, onSecondChance, results, surveyPoints, receiptResult, region, language }: CarbonFootprintSurveyProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<Omit<CarbonFootprintInput, 'language' | 'location'>>({
    transport: [],
    diet: [],
    drink: [],
    energy: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [basePoints, setBasePoints] = useState(0);
   const [isNoEnergy, setIsNoEnergy] = useState(false);


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  const handleCheckboxChange = (field: 'transport' | 'diet' | 'drink', value: string) => {
    setFormData((prev) => {
      const newValues = prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value];
      return { ...prev, [field]: newValues };
    });
  };

  const handleEnergyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (isNoEnergy) return;
    setFormData((prev) => ({ ...prev, energy: e.target.value }));
  };

  const handleNoEnergyChange = (checked: boolean) => {
    setIsNoEnergy(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, energy: 'none' }));
    } else {
      setFormData((prev) => ({ ...prev, energy: '' }));
    }
  };


  const handleVerifyWithReceipt = () => {
    if (!results || !receiptResult || !receiptResult.isValidReceipt || basePoints === 0) return;

    const bonusPoints = finalizeWithReceipt(basePoints);
    const provisionalPoints = computeProvisional(basePoints);

     if (userProfileRef && userProfile) {
        const currentPoints = userProfile.totalPoints || 0;
        // Revert provisional points and add the full bonus
        const newPoints = Math.max(0, currentPoints - provisionalPoints + bonusPoints);
        updateDocumentNonBlocking(userProfileRef, {
            totalPoints: newPoints,
        });
     }
     toast({
        title: t('toast_bonus_applied_title'),
        description: t('toast_bonus_applied_description', { points: bonusPoints }),
     });
  }

  useEffect(() => {
    if (receiptResult && results) {
        handleVerifyWithReceipt();
    }
  }, [receiptResult, results]);


  const handleSubmit = () => {
    setIsLoading(true);
    startTransition(() => {
      analyzeCarbonFootprint({ ...formData, location: region, language })
        .then((analysisResults) => {
          const regionKey = region.split(',')[0].toLowerCase().replace(/[\s,]/g, '_') as RegionKey;
          
          const calculatedBasePoints = pointsFromKgRegionAware(analysisResults.estimatedFootprintKg, regionKey);
          setBasePoints(calculatedBasePoints);
          
          let finalPoints = 0;
          const penaltyThreshold = 30; // Global penalty threshold
          const penalty = analysisResults.estimatedFootprintKg > penaltyThreshold ? -Math.round((analysisResults.estimatedFootprintKg - penaltyThreshold) / 2) : 0;

          if (penalty < 0) {
            finalPoints = Math.max(-10, penalty);
          } else {
            finalPoints = computeProvisional(calculatedBasePoints);
          }

          if (userProfileRef && userProfile) {
            const currentPoints = userProfile.totalPoints || 0;
            const newPoints = Math.max(0, currentPoints + finalPoints);
            updateDocumentNonBlocking(userProfileRef, {
              totalPoints: newPoints,
              lastCarbonSurveyDate: serverTimestamp(),
            });
          }
          onSurveyComplete(finalPoints, analysisResults);
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
    formData.drink.length === 0 ||
    !formData.energy;

  const transportOptions = t('survey_q1_options', { returnObjects: true }) as Record<string, string>;
  const dietOptions = t('survey_q2_options', { returnObjects: true }) as Record<string, string>;
  const drinkOptions = t('survey_q4_options', { returnObjects: true }) as Record<string, string>;

  // Show form if there are no results yet
  if (!results) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="relative flex items-center justify-center">
            <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
            </Button>
            <CardTitle className="font-headline text-2xl">{t('survey_title')}</CardTitle>
          </div>
          <CardDescription className="text-center pt-2">
            {t('survey_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>{t('survey_q1')}</Label>
            <div className="space-y-2">
              {Object.entries(transportOptions).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`transport-${key}`}
                    checked={formData.transport.includes(key)}
                    onCheckedChange={() => handleCheckboxChange('transport', key)}
                  />
                  <Label
                    htmlFor={`transport-${key}`}
                    className="font-normal"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t('survey_q2')}</Label>
            <div className="space-y-2">
              {Object.entries(dietOptions).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diet-${key}`}
                    checked={formData.diet.includes(key)}
                    onCheckedChange={() => handleCheckboxChange('diet', key)}
                  />
                  <Label htmlFor={`diet-${key}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>{t('survey_q4')}</Label>
            <div className="space-y-2">
              {Object.entries(drinkOptions).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`drink-${key}`}
                    checked={formData.drink.includes(key)}
                    onCheckedChange={() => handleCheckboxChange('drink', key)}
                  />
                  <Label htmlFor={`drink-${key}`} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="energy">{t('survey_q3')}</Label>
             <Input
                id="energy"
                placeholder={t('survey_q3_placeholder')}
                value={formData.energy}
                onChange={handleEnergyChange}
                disabled={isNoEnergy}
              />
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="no-energy"
                  checked={isNoEnergy}
                  onCheckedChange={handleNoEnergyChange}
                />
                <Label htmlFor="no-energy" className="font-normal">
                  {t('survey_q3_no_energy')}
                </Label>
              </div>
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
            {t('survey_calculate_button')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Otherwise, show the results page.
  const isPenalty = surveyPoints < 0;
  
  const getAnalysisIcon = () => {
    if (results.sustainabilityScore >= 8) {
      return <ThumbsUp className="h-4 w-4" />;
    }
    if (results.sustainabilityScore <= 4) {
      return <ThumbsDown className="h-4 w-4" />;
    }
    return <Meh className="h-4 w-4" />;
  };


  return (
    <Card>
      <CardHeader>
        <div className="relative flex items-center justify-center">
           <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
           </Button>
          <CardTitle className="font-headline text-center text-2xl flex items-center gap-2">
            <Leaf className="text-primary" /> {t('survey_results_title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">{t('survey_results_estimated')}</p>
          <p className="text-5xl font-bold font-headline text-primary">
            {results.estimatedFootprintKg.toFixed(1)}
            <span className="text-xl"> kg CO₂</span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm italic">
            {results.tangibleComparison}
          </p>
        </div>
        
        {isPenalty ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('survey_penalty_title')}</AlertTitle>
            <AlertDescription>
                {t('survey_penalty_description', { points: surveyPoints })}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="border-yellow-400/50 text-center bg-yellow-50/50 dark:bg-yellow-900/10">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">{t('survey_provisional_title')}</AlertTitle>
            <AlertDescription>
                {t('survey_provisional_description', { points: surveyPoints })}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          {getAnalysisIcon()}
          <AlertTitle>{t('survey_analysis_title')}</AlertTitle>
          <AlertDescription>{results.analysis}</AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">{t('survey_recommendations_title')}</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              {results.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-2">{t('survey_extra_tips_title')}</h3>
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
            <Camera className="mr-2" /> {t('survey_second_chance_button')}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={onScanReceipt} disabled={!!receiptResult}>
            <Receipt className="mr-2" /> {receiptResult ? t('survey_bonus_applied_button') : t('survey_scan_receipt_button')}
          </Button>
        )}
        <Button size="lg" variant="outline" className="w-full" onClick={onBack}>
          {t('survey_back_button')}
        </Button>
      </CardFooter>
    </Card>
  );
}

    
