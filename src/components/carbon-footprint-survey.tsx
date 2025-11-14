
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
import {
  ChevronLeft,
  Loader2,
  Leaf,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { useFirebase, useUser, updateDocumentNonBlocking, serverTimestamp, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  calculatePoints,
  RegionKey,
  type TransportOption,
  type DietOption,
  type DrinkOption,
} from '@/lib/carbon-calculator';
import { useToast } from '@/hooks/use-toast';
import { VerificationCenter } from './verification-center';
import SurveyResultsCard from './SurveyResultsCard';
import { analyzeFootprint } from '@/ai/flows/carbon-footprint-analysis';
import type { CarbonFootprintAnalysisOutput } from '@/ai/flows/carbon-footprint-analysis.types';
import { normalizeRegion } from "@/lib/region-map";

interface CarbonFootprintSurveyProps {
  onBack: () => void;
  region: string;
  language: string;
}

type SurveyStep = 'form' | 'loading' | 'results' | 'secondChance';

export function CarbonFootprintSurvey({ onBack, region, language }: CarbonFootprintSurveyProps) {
  const { t } = useTranslation();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState<SurveyStep>('form');
  const [isPending, startTransition] = useTransition();

  // Form state
  const [transport, setTransport] = useState<TransportOption[]>([]);
  const [diet, setDiet] = useState<DietOption[]>([]);
  const [drink, setDrink] = useState<DrinkOption[]>([]);
  const [energyText, setEnergyText] = useState('');
  const [noEnergy, setNoEnergy] = useState(false);

  // Results state
  const [results, setResults] = useState({
    kg: 0,
    basePoints: 0,
    penaltyPoints: 0,
    aiAnalysis: null as CarbonFootprintAnalysisOutput | null,
  });


  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  const handleCheckboxChange = <T extends string>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    option: T,
    checked: boolean
  ) => {
    setter(prev => 
      checked ? [...prev, option] : prev.filter(item => item !== option)
    );
  };
  
  const handleSubmit = async () => {
    setStep('loading');

    startTransition(async () => {
      
      const regionKey = normalizeRegion(region);

      let apiResponse: (CarbonFootprintAnalysisOutput & { ok?: boolean, error?: string }) | null = null;
      
      try {
        const payload = {
          language,
          region: regionKey,
          transport,
          diet,
          drink,
          energy: noEnergy ? "none" : energyText,
        };
        
        apiResponse = await analyzeFootprint(payload);
        
      } catch (e: any) {
        toast({ variant: "destructive", title: "Analysis Failed", description: e.message });
        setStep('form');
        return;
      }
      
      const { estimatedFootprintKg } = apiResponse;
      const { basePoints, penaltyPoints } = calculatePoints(estimatedFootprintKg, regionKey as RegionKey);
      
      // Award base points or apply penalty
      if (userProfileRef && userProfile) {
        const currentPoints = userProfile.totalPoints ?? 0;
        const awarded = penaltyPoints < 0 ? penaltyPoints : basePoints;
        
        updateDocumentNonBlocking(userProfileRef, { 
          totalPoints: Math.max(0, currentPoints + awarded),
          lastCarbonSurveyDate: serverTimestamp() 
        });
      }

      setResults({
        kg: estimatedFootprintKg,
        basePoints,
        penaltyPoints,
        aiAnalysis: apiResponse,
      });

      setStep('results');
    });
  };
  
  const handleSecondChance = () => {
      const pointsToReverse = Math.abs(results.penaltyPoints);
      const bonus = 10;
      const totalAward = pointsToReverse + bonus;

       if(userProfileRef && userProfile) {
          const currentPoints = userProfile.totalPoints ?? 0;
          updateDocumentNonBlocking(userProfileRef, { totalPoints: currentPoints + totalAward });
          
           toast({
              title: t('toast_action_verified_title'),
              description: t('toast_action_verified_description', {points: totalAward}),
            });
            setStep('form'); 
            onBack(); 
      }
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-semibold">{t('loading_receipt')}</p>
      </div>
    );
  }

  if (step === 'results' && userProfile) {
    return (
        <SurveyResultsCard 
            region={normalizeRegion(region) as RegionKey}
            kg={results.kg}
            basePoints={results.basePoints}
            penaltyPoints={results.penaltyPoints}
            bonusMultiplier={3}
            onSecondChance={() => setStep('secondChance')}
            analysis={results.aiAnalysis?.analysis}
            recommendations={results.aiAnalysis?.recommendations}
            recoveryActions={results.aiAnalysis?.recoveryActions}
        />
    )
  }
  
  if (step === 'secondChance') {
    return <VerificationCenter onBack={() => setStep('results')} isSecondChance={true} onVerified={handleSecondChance}/>
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0"
            onClick={onBack}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
          </Button>
          <CardTitle className="font-headline text-2xl">
            {t('survey_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          {t('survey_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Transport */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('survey_q1')}</Label>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(t('survey_q1_options', {returnObjects: true})) as TransportOption[]).map((key) => (
              <Label key={key} htmlFor={`transport-${key}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:ring-1 has-[input:checked]:ring-primary">
                <Checkbox 
                  id={`transport-${key}`}
                  checked={transport.includes(key)}
                  onCheckedChange={(checked) => handleCheckboxChange(setTransport, key, !!checked)}
                />
                <span>{t(`survey_q1_options.${key}`)}</span>
              </Label>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('survey_q2')}</Label>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(t('survey_q2_options', {returnObjects: true})) as DietOption[]).map((key) => (
               <Label key={key} htmlFor={`diet-${key}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:ring-1 has-[input:checked]:ring-primary">
                <Checkbox 
                  id={`diet-${key}`} 
                  checked={diet.includes(key)}
                  onCheckedChange={(checked) => handleCheckboxChange(setDiet, key, !!checked)}
                />
                <span>{t(`survey_q2_options.${key}`)}</span>
              </Label>
            ))}
          </div>
        </div>

        {/* Drink */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t('survey_q4')}</Label>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(t('survey_q4_options', {returnObjects: true})) as DrinkOption[]).map((key) => (
               <Label key={key} htmlFor={`drink-${key}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input-checked]:ring-primary">
                <Checkbox
                  id={`drink-${key}`} 
                  checked={drink.includes(key)}
                  onCheckedChange={(checked) => handleCheckboxChange(setDrink, key, !!checked)}
                />
                <span>{t(`survey_q4_options.${key}`)}</span>
              </Label>
            ))}
          </div>
        </div>
        
        {/* Energy */}
        <div className="space-y-3">
           <Label className="text-base font-semibold">{t('survey_q3')}</Label>
           <Textarea placeholder={t('survey_q3_placeholder')} disabled={noEnergy} value={energyText} onChange={(e) => setEnergyText(e.target.value)} />
           <div className="flex items-center space-x-2">
                <Checkbox id="no-energy" checked={noEnergy} onCheckedChange={(c) => setNoEnergy(c as boolean)} />
                <label
                  htmlFor="no-energy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('survey_q3_no_energy')}
                </label>
            </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isPending || transport.length === 0 || diet.length === 0 || drink.length === 0}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Leaf className="mr-2" />
          )}
          {t('survey_calculate_button')}
        </Button>
      </CardFooter>
    </Card>
  );
}
