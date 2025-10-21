'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirebase, useUser, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { REGION, computeKgDeterministic, pointsFromKgRegionAware, computeProvisional, finalizeWithReceipt, getRegionKey } from '@/lib/carbon-calculator';

export default function CarbonFootprintPage() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { user, isUserLoading } = useUser();
    const userProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

    const { t } = useTranslation();
    const router = useRouter();

    const [results, setResults] = useState<CarbonFootprintOutput | null>(null);
    const [surveyPoints, setSurveyPoints] = useState(0); // This will now store provisional points
    const [basePoints, setBasePoints] = useState(0);
    const [receiptResult, setReceiptResult] = useState<ReceiptOutput | null>(null); // This would be populated from a parent component or context
    const [region, setRegion] = useState('Dubai, UAE');
    const [language, setLanguage] = useState('en');
    
    useEffect(() => {
        const savedRegion = localStorage.getItem('app-region');
        if (savedRegion) {
          setRegion(savedRegion);
        }
        const savedLanguage = localStorage.getItem('app-language');
        if (savedLanguage) {
            setLanguage(savedLanguage);
        }
      }, []);

    const [formData, setFormData] = useState<Omit<CarbonFootprintInput, 'language' | 'location'>>({
        transport: [],
        diet: [],
        drink: [],
        energy: '',
      });

    const [isLoading, setIsLoading] = useState(false);
    const [isNoEnergy, setIsNoEnergy] = useState(false);

    const handleRadioChange = (field: 'transport' | 'diet' | 'drink', value: string) => {
        setFormData((prev) => ({ ...prev, [field]: [value] }));
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
    if (!results || !receiptResult || !receiptResult.isValidReceipt || !userProfile) return;
    const regionKey = getRegionKey(region);
    const actualBasePoints = pointsFromKgRegionAware(results.estimatedFootprintKg, regionKey);
    const bonusPoints = finalizeWithReceipt(actualBasePoints);
    const provisionalPoints = computeProvisional(actualBasePoints);

        if (userProfileRef && user?.uid) {
            const userRef = doc(firestore, 'users', user.uid);
            // Revert provisional and add the full bonus
            const newPoints = Math.max(0, (userProfile.totalPoints ?? 0) - provisionalPoints + bonusPoints);
            updateDocumentNonBlocking(userRef, {
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
        startTransition(async () => {
          try {
            const regionKey = getRegionKey(region);
            // 1. Ensure single values from form
            const transport = formData.transport[0] as any;
            const diet = formData.diet[0] as any;
            const drink = formData.drink[0] as any;
            const energy = (isNoEnergy ? "none" : formData.energy) as any;
            
            // 2. Run our own deterministic calculation
            const deterministicKg = computeKgDeterministic(regionKey, transport, diet, drink, energy);
            const base = pointsFromKgRegionAware(deterministicKg, regionKey);
            const provisional = computeProvisional(base);

            // 3. Call AI only for qualitative analysis
            const aiAnalysis = await analyzeCarbonFootprint({ ...formData, location: region, language });

            // 4. Update user profile with ONLY provisional points
            if (userProfileRef && userProfile) {
              const currentPoints = userProfile.totalPoints ?? 0;
              const regionData = REGION[regionKey] || REGION.europe; // Fallback to europe
              const penaltyThreshold = regionData.max * 1.05;
              const pointsChange = deterministicKg > penaltyThreshold ? -10 : provisional;
              const newPoints = Math.max(0, currentPoints + pointsChange);
              
              updateDocumentNonBlocking(userProfileRef, {
                totalPoints: newPoints,
                lastCarbonSurveyDate: serverTimestamp(),
              });
            }

            // 5. Set UI state with clear separation of points
            setBasePoints(base);
            setResults({
                ...aiAnalysis, // Use AI for text
                estimatedFootprintKg: deterministicKg, // But our numbers for data
                points: base, // The base points for context
            });
            setSurveyPoints(provisional); // The points actually awarded (provisional)

          } catch(err) {
              console.error(err);
              toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: 'Could not analyze your carbon footprint. Please try again.',
              });
          } finally {
              setIsLoading(false);
          }
        });
      };

    const onBack = () => router.push('/');
    const onScanReceipt = () => router.push('/verify');
    const onSecondChance = () => router.push('/verify');

    const isFormInvalid =
    formData.transport.length === 0 ||
    formData.diet.length === 0 ||
    formData.drink.length === 0 ||
    !formData.energy;

  const transportOptions = t('survey_q1_options', { returnObjects: true }) as Record<string, string>;
  const dietOptions = t('survey_q2_options', { returnObjects: true }) as Record<string, string>;
  const drinkOptions = t('survey_q4_options', { returnObjects: true }) as Record<string, string>;

  if (isUserLoading || isProfileLoading) {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">{t('loading_profile')}</p>
        </div>
    )
  }

  if (!results) {
    return (
        <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl">
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
                     <RadioGroup onValueChange={(value) => handleRadioChange('transport', value)}>
                        <Label>{t('survey_q1')}</Label>
                        <div className="space-y-2">
                        {Object.entries(transportOptions).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                            <RadioGroupItem value={key} id={`transport-${key}`} />
                            <Label htmlFor={`transport-${key}`} className="font-normal">{label}</Label>
                            </div>
                        ))}
                        </div>
                    </RadioGroup>
                     <RadioGroup onValueChange={(value) => handleRadioChange('diet', value)}>
                        <Label>{t('survey_q2')}</Label>
                        <div className="space-y-2">
                        {Object.entries(dietOptions).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                             <RadioGroupItem value={key} id={`diet-${key}`} />
                            <Label htmlFor={`diet-${key}`} className="font-normal">{label}</Label>
                            </div>
                        ))}
                        </div>
                    </RadioGroup>
                    <RadioGroup onValueChange={(value) => handleRadioChange('drink', value)}>
                        <Label>{t('survey_q4')}</Label>
                        <div className="space-y-2">
                        {Object.entries(drinkOptions).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                            <RadioGroupItem value={key} id={`drink-${key}`} />
                            <Label htmlFor={`drink-${key}`} className="font-normal">{label}</Label>
                            </div>
                        ))}
                        </div>
                    </RadioGroup>
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
                            onCheckedChange={(checked) => handleNoEnergyChange(Boolean(checked))}
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
            </div>
      </main>
    );
  }

  // Otherwise, show the results page.
  const isPenalty = surveyPoints < 0;
  
  const getAnalysisIcon = () => {
    // Icon should be based on the BASE points, not the provisional ones
    if (basePoints >= 20) {
      return <ThumbsUp className="h-4 w-4" />;
    }
    if (basePoints >= 10) {
      return <Meh className="h-4 w-4" />;
    }
    return <ThumbsDown className="h-4 w-4" />;
  };


  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl">
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
                       <div className="mt-1 text-xs text-muted-foreground">
                         ({t('survey_base_points_hint', { base: basePoints })})
                       </div>
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
        </div>
    </main>
  );
}
