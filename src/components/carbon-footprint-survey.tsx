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
  Info,
  Camera,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from './ui/textarea';
import { useTranslation } from '@/hooks/use-translation';
import { useFirebase, useUser, updateDocumentNonBlocking, serverTimestamp } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  computeKg,
  calculatePoints,
  getRegionKey,
  type TransportOption,
  type DietOption,
  type DrinkOption,
  type EnergyOption,
} from '@/lib/carbon-calculator';
import { processReceipt, ReceiptOutput } from '@/ai/flows/receipt-ocr-flow';
import { useToast } from '@/hooks/use-toast';

interface CarbonFootprintSurveyProps {
  onBack: () => void;
  region: string;
}

type SurveyStep = 'form' | 'loading' | 'results' | 'scanReceipt' | 'secondChance';

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

  // Results state
  const [estimatedFootprint, setEstimatedFootprint] = useState(0);
  const [basePoints, setBasePoints] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);

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
    const energyOption: EnergyOption = noEnergy ? 'no_energy' : 'some_energy';
    
    const kg = computeKg(transport, diet, drink, energyOption);
    setEstimatedFootprint(kg);

    const regionKey = getRegionKey(region);
    const { basePoints, penaltyPoints } = calculatePoints(kg, regionKey);
    setBasePoints(basePoints);
    setPenaltyPoints(penaltyPoints);
    
    const userProfileRef = user && firestore ? doc(firestore, 'users', user.uid) : null;
    if (userProfileRef && user) {
      const currentPoints = userProfile?.totalPoints ?? 0;
      if (penaltyPoints < 0) {
        // Apply penalty
        updateDocumentNonBlocking(userProfileRef, { 
          totalPoints: currentPoints + penaltyPoints,
          lastCarbonSurveyDate: serverTimestamp() 
        });
      } else {
        // Award provisional points
        const provisionalPoints = Math.floor(basePoints * 0.1);
        updateDocumentNonBlocking(userProfileRef, { 
           totalPoints: currentPoints + provisionalPoints,
           lastCarbonSurveyDate: serverTimestamp() 
        });
      }
    }

    setStep('results');
  };
  
  const handleScanReceipt = () => {
      // For now, this just applies the bonus. Later it will involve camera.
      const bonusPoints = basePoints * 3;
      const provisionalPoints = Math.floor(basePoints * 0.1);
      const userProfileRef = user && firestore ? doc(firestore, 'users', user.uid) : null;
      const { user, isUserLoading, isProfileLoading } = useUser();
      const userProfile = useDoc(userProfileRef);

       if(userProfileRef && user && !isUserLoading && !isProfileLoading && userProfile.data) {
          const currentPoints = userProfile.data.totalPoints ?? 0;
          const newPoints = Math.max(0, currentPoints - provisionalPoints + bonusPoints);
          updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });

           toast({
              title: t('toast_bonus_applied_title'),
              description: t('toast_bonus_applied_description', {points: bonusPoints}),
            });
            setStep('form'); // or a success screen
            onBack(); // Go back to main menu
      }
  }
  
  const handleSecondChance = () => {
      // For now, this just reverses penalty. Later it will involve camera.
      const pointsToReverse = Math.abs(penaltyPoints);
      const bonus = 15;
      const totalAward = pointsToReverse + bonus;
      const userProfileRef = user && firestore ? doc(firestore, 'users', user.uid) : null;
      const { user, isUserLoading, isProfileLoading } = useUser();
      const userProfile = useDoc(userProfileRef);

       if(userProfileRef && user && !isUserLoading && !isProfileLoading && userProfile.data) {
          const currentPoints = userProfile.data.totalPoints ?? 0;
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

  if (step === 'results') {
    const provisionalPoints = Math.floor(basePoints * 0.1);
    const hasPenalty = penaltyPoints < 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center font-headline text-2xl">
            {t('survey_results_title')}
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-2 pt-2">
            <Leaf className="h-4 w-4 text-green-500" />
            <span>{t('survey_results_estimated')}</span>
            <span className="font-bold">{estimatedFootprint.toFixed(1)} kg CO₂</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasPenalty ? (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
              <ThumbsDown className="mx-auto h-10 w-10 text-destructive" />
              <h3 className="mt-2 font-semibold text-destructive">{t('survey_penalty_title')}</h3>
              <p className="text-sm text-destructive/80">
                {t('survey_penalty_description', { points: penaltyPoints })}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-primary bg-primary/10 p-4 text-center">
                <ThumbsUp className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-2 font-semibold text-primary">{t('survey_provisional_title')}</h3>
              <p className="text-sm text-primary/80">
                {t('survey_provisional_description', { points: provisionalPoints })}
              </p>
               <p className="mt-2 text-xs text-muted-foreground">
                 {t('survey_base_points_hint', {base: basePoints})}
              </p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-2">{t('survey_recommendations_title')}</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>This is a placeholder for an AI recommendation.</li>
                <li>This is another placeholder for an AI recommendation.</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {hasPenalty ? (
             <Button className="w-full" onClick={handleSecondChance}>
                <Camera className="mr-2" />
                {t('survey_second_chance_button')}
             </Button>
          ) : (
             <Button className="w-full" onClick={handleScanReceipt}>
                <Camera className="mr-2" />
                {t('survey_scan_receipt_button')}
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={onBack}>
            {t('survey_back_button')}
          </Button>
        </CardFooter>
      </Card>
    );
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
               <Label key={key} htmlFor={`drink-${key}`} className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent hover:text-accent-foreground has-[input:checked]:border-primary has-[input:checked]:ring-1 has-[input:checked]:ring-primary">
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
           <Textarea placeholder={t('survey_q3_placeholder')} disabled={noEnergy} />
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
