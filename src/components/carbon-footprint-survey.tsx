
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
import { Label } from '@/components/ui/label';
import { Textarea } from './ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { useFirebase, useUser, updateDocumentNonBlocking, serverTimestamp, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  computeKg,
  calculatePoints,
  getRegionKey,
  type TransportOption,
  type DietOption,
  type DrinkOption,
  type EnergyOption,
  RegionKey,
} from '@/lib/carbon-calculator';
import { useToast } from '@/hooks/use-toast';
import { VerificationCenter } from './verification-center';
import SurveyResultsCard from './SurveyResultsCard';
import { analyzeFootprint, CarbonFootprintAnalysis } from '@/ai/flows/carbon-footprint-analysis';

interface CarbonFootprintSurveyProps {
  onBack: () => void;
  region: string;
}

type SurveyStep = 'form' | 'loading' | 'results' | 'secondChance';

export function CarbonFootprintSurvey({ onBack, region }: CarbonFootprintSurveyProps) {
  const { t } = useTranslation();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [step, setStep] = useState<SurveyStep>('form');
  const [isPending, startTransition] = useTransition();

  // Form state - changed to arrays for multiple selections
  const [transport, setTransport] = useState<TransportOption[]>([]);
  const [diet, setDiet] = useState<DietOption[]>([]);
  const [drink, setDrink] = useState<DrinkOption[]>([]);
  const [energy, setEnergy] = useState<EnergyOption>('some_energy');
  const [noEnergy, setNoEnergy] = useState(false);
  const [otherInfo, setOtherInfo] = useState('');

  // Results state
  const [analysisResults, setAnalysisResults] = useState<CarbonFootprintAnalysis | null>(null);
  const [estimatedFootprint, setEstimatedFootprint] = useState(0);
  const [basePoints, setBasePoints] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);


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
  
  const handleSubmit = () => {
    setStep('loading');
    startTransition(() => {
      const energyOption: EnergyOption = noEnergy ? 'no_energy' : 'some_energy';
      
      const kg = computeKg(transport, diet, drink, energyOption);
      setEstimatedFootprint(kg);

      const regionKey = getRegionKey(region);
      const { basePoints, penaltyPoints } = calculatePoints(kg, regionKey);
      setBasePoints(basePoints);
      setPenaltyPoints(penaltyPoints);
      
      if (userProfileRef && userProfile) {
        const currentPoints = userProfile.totalPoints ?? 0;
        let pointsChange = 0;

        if (penaltyPoints < 0) {
          // Apply penalty
          pointsChange = penaltyPoints;
        } else {
          // Award full base points provisionally
          pointsChange = basePoints;
        }
        updateDocumentNonBlocking(userProfileRef, { 
          totalPoints: currentPoints + pointsChange,
          lastCarbonSurveyDate: serverTimestamp() 
        });
      }

      // Also get AI analysis
      analyzeFootprint({
        transport,
        diet,
        drink,
        energy: energyOption,
        other: otherInfo,
        region
      }).then(setAnalysisResults).catch(e => {
        console.error("Error getting AI analysis:", e);
        // We can proceed without AI analysis
        setAnalysisResults(null);
      }).finally(() => {
        setStep('results');
      });
    });
  };
  
  const handleSecondChance = () => {
      // Reverses penalty and awards 10 bonus points.
      const pointsToReverse = Math.abs(penaltyPoints);
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
    const provisionalPoints = basePoints;
    
    return (
        <SurveyResultsCard 
            region={getRegionKey(region) as RegionKey}
            kg={estimatedFootprint}
            basePoints={basePoints}
            provisionalPoints={provisionalPoints}
            bonusMultiplier={3}
            analysisText={analysisResults?.analysis || undefined}
            recommendations={analysisResults?.recommendations || []}
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
           <Textarea placeholder={t('survey_q3_placeholder')} disabled={noEnergy} value={otherInfo} onChange={(e) => setOtherInfo(e.target.value)} />
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
        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isPending}>
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
