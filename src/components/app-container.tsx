"use client";

import { useState, useRef, ChangeEvent, useTransition, useEffect } from 'react';
import Image from 'next/image';
import {
  Camera,
  Loader2,
  ChevronLeft,
  Sparkles,
  Award,
  BookCopy,
  Languages,
  Globe,
} from 'lucide-react';
import {
  identifyMaterial as identifyMaterialSimple,
  MaterialIdentificationOutput,
} from '@/ai/flows/material-identification-from-scan';
import { identifyMaterialWithBarcode } from '@/ai/flows/confidence-based-assistance';
import { verifyDisposalAction, VerifyDisposalActionOutput } from '@/ai/flows/verify-disposal-action';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TranslationProvider, useTranslation } from '@/hooks/use-translation';
import { MaterialIcon } from './material-icon';
import { RewardsSection } from './rewards-section';
import { GuideSection } from './guide-section';
import { VerificationCenter } from './verification-center';
import { cn } from '@/lib/utils';
import { useFirebase, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, initiateAnonymousSignIn } from '@/firebase';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getPointsForMaterial } from '@/lib/points';
import SurveyButton from './survey-button';


export type Step = 'scan' | 'camera' | 'confirm' | 'verifyDisposal' | 'disposed' | 'rewards' | 'guide' | 'verify';

const AppContainerWithTranslations = ({ initialStep }: { initialStep?: Step }) => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        const savedLanguage = localStorage.getItem('app-language');
        if (savedLanguage) {
            setLanguage(savedLanguage);
        }
    }, []);
    
    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);


    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
        localStorage.setItem('app-language', newLanguage);
    };
    
    return (
        <TranslationProvider language={language}>
            <AppContainer onLanguageChange={handleLanguageChange} currentLanguage={language} initialStep={initialStep} />
        </TranslationProvider>
    )
}


function AppContainer({ onLanguageChange, currentLanguage, initialStep = 'scan' }: { onLanguageChange: (lang: string) => void, currentLanguage: string, initialStep?: Step}) {
  const [step, setStep] = useState<Step>(initialStep);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [barcodeNumber, setBarcodeNumber] = useState('');
  const [identifiedMaterial, setIdentifiedMaterial] =
    useState<MaterialIdentificationOutput | null>(null);
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Identifying material...');
  const [isPending, startTransition] = useTransition();
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [animatePoints, setAnimatePoints] = useState<string | false>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const [region, setRegion] = useState('Dubai, UAE');

  useEffect(() => {
    const savedRegion = localStorage.getItem('app-region');
    if (savedRegion) {
      setRegion(savedRegion);
    }
  }, []);

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    localStorage.setItem('app-region', newRegion);
    toast({
      title: t('toast_region_updated_title'),
      description: t('toast_region_updated_description', { region: newRegion }),
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange(newLanguage);
    toast({
      title: t('toast_language_updated_title'),
      description: t('toast_language_updated_description'),
    });
  };


  useEffect(() => {
    if (step === 'camera' || step === 'verifyDisposal') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: t('camera_not_found_title'),
            description: t('camera_not_found_description'),
          });
        }
      };

      getCameraPermission();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }
  }, [step, toast, t]);
  
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);
  
  useEffect(() => {
    if (isUserLoading || isProfileLoading || !user || user.isAnonymous) {
      return;
    }
  
    if (user && !userProfile) {
      const newProfile = {
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ')[1] || '',
        totalPoints: 0,
        createdAt: serverTimestamp(),
      };
  
      if (userProfileRef) {
        setDocumentNonBlocking(userProfileRef, newProfile, { merge: false });
      }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, userProfileRef]);

  const lastSurveyTimestamp = userProfile?.lastCarbonSurveyDate as Timestamp | undefined;

  const userPoints = userProfile?.totalPoints ?? 0;
  
  const resetState = () => {
    setStep('scan');
    setScannedImage(null);
    setBarcodeNumber('');
    setIdentifiedMaterial(null);
    setIsLoading(false);
    setHasCameraPermission(null);
  };
  
  const processImage = (dataUri: string) => {
    if (step === 'verifyDisposal') {
      handleDisposalVerification(dataUri);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(t('loading_material'));
    setScannedImage(dataUri);
    startTransition(() => {
      identifyMaterialSimple({ photoDataUri: dataUri, productDescription: '' })
        .then((result) => {
          if (result.confidence < 0.5) {
            setShowLowConfidenceModal(true);
          } else {
            setIdentifiedMaterial(result);
            setStep('confirm');
          }
        })
        .catch((error) => {
          console.error('AI Error:', error);
          toast({
            variant: 'destructive',
            title: t('toast_identification_failed_title'),
            description: t('toast_identification_failed_description'),
          });
          resetState();
        })
        .finally(() => setIsLoading(false));
    });
  };


  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        processImage(dataUri);
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        processImage(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBarcodeSubmit = () => {
    if (!scannedImage || !barcodeNumber) return;
    setShowLowConfidenceModal(false);
    setIsLoading(true);
    setLoadingMessage(t('loading_barcode'));
    startTransition(() => {
      identifyMaterialWithBarcode({
        photoDataUri: scannedImage,
        barcodeNumber,
      })
        .then((result) => {
          setIdentifiedMaterial({ material: result.material, confidence: result.confidenceLevel });
          setStep('confirm');
        })
        .catch((error) => {
          console.error('AI Error:', error);
          toast({
            variant: 'destructive',
            title: t('toast_identification_failed_title'),
            description: t('toast_identification_failed_description'),
          });
          resetState();
        })
        .finally(() => setIsLoading(false));
    });
  };

  const handleDisposalVerification = (disposalImage: string) => {
    if (!identifiedMaterial) return;

    setIsLoading(true);
    setLoadingMessage(t('loading_disposal'));

    startTransition(() => {
      verifyDisposalAction({
        material: identifiedMaterial.material,
        photoOfDisposalUri: disposalImage,
      })
        .then((result: VerifyDisposalActionOutput) => {
          if (result.isValid) {
            const pointsAwarded = getPointsForMaterial(identifiedMaterial.material);
            setAnimatePoints(`+${pointsAwarded}`);
            
            if (userProfileRef && userProfile) {
              const newPoints = (userProfile.totalPoints || 0) + pointsAwarded;
              updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });
            }
            toast({
              title: t('toast_verification_complete_title'),
              description: t('toast_verification_complete_description', {points: pointsAwarded}),
            });
            setStep('disposed');
          } else {
            // Handle invalid disposal, including fraud
            toast({
              variant: 'destructive',
              title: t('toast_verification_failed_title'),
              description: result.reason,
            });

            if (result.reason.toLowerCase().includes('duplicate') || result.reason.toLowerCase().includes('generated')) {
              setAnimatePoints('-50');
              if (userProfileRef && userProfile) {
                 const newPoints = Math.max(0, (userProfile.totalPoints || 0) - 50);
                 updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });
              }
            }
             setStep('scan'); // Or back to confirm step
          }
        })
        .catch((err) => {
          toast({
            variant: 'destructive',
            title: t('toast_verification_error_title'),
            description: t('toast_verification_error_description'),
          });
           setStep('scan');
        })
        .finally(() => {
          setIsLoading(false);
          setTimeout(() => setAnimatePoints(false), 2000);
        });
    });
  };

  const handleConfirmDisposal = () => {
    setStep('verifyDisposal'); 
  };
  
  const handleOpenSettings = () => {
    setShowSettingsModal(true);
  }

  const renderContent = () => {
    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">{t('loading_profile')}</p>
            </div>
        )
    }
    switch (step) {
      case 'scan':
        return (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{t('scan_card_title')}</CardTitle>
              <CardDescription>
                {t('scan_card_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
               <Button size="lg" onClick={() => setStep('camera')} className="h-20 text-base md:h-24">
                <Camera className="mr-2" />
                {t('scan_card_scan_button')}
              </Button>
              <SurveyButton cooldownEndsAt={lastSurveyTimestamp?.toDate().getTime() ? lastSurveyTimestamp.toDate().getTime() + 24 * 60 * 60 * 1000 : undefined} />
            </CardContent>
            <CardFooter className="flex-col gap-2 pt-6">
               <Button variant="link" onClick={() => setStep('rewards')}>
                <Award className="mr-2" />
                {t('scan_card_rewards_link')} ({userPoints} {t('header_points')})
              </Button>
            </CardFooter>
          </Card>
        );
      case 'camera':
      case 'verifyDisposal':
        let backStep: Step = 'scan';
        let title = t('camera_scan_item_title');
        let description = t('camera_scan_item_description');

        if (step === 'verifyDisposal') {
          backStep = 'confirm';
          title = t('camera_verify_disposal_title');
          description = t('camera_verify_disposal_description');
        }

        return (
          <Card>
            <CardHeader>
              <div className="relative flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-0"
                  onClick={() => setStep(backStep)}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
                </Button>
                <CardTitle className="font-headline text-2xl">
                  {title}
                </CardTitle>
              </div>
              <CardDescription className="text-center pt-2">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={cn(
                    'w-full h-full object-cover',
                    !hasCameraPermission && 'hidden'
                  )}
                  autoPlay
                  muted
                  playsInline
                />
                 {!hasCameraPermission && (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
            <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={!hasCameraPermission}
              >
                <Camera className="mr-2" /> {t('camera_capture_button')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={step === 'verifyDisposal'}
              >
                {t('camera_upload_button')}
              </Button>
            </CardFooter>
          </Card>
        );
      case 'confirm':
        if (!identifiedMaterial || !scannedImage) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <MaterialIcon material={identifiedMaterial.material} className="h-8 w-8 text-primary" />
                {t('confirm_card_title', {material: identifiedMaterial.material})}
              </CardTitle>
              <CardDescription>
                {t('confirm_card_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Image
                src={scannedImage}
                alt="Scanned product"
                width={200}
                height={200}
                className="rounded-lg border object-contain"
              />
              <p className="text-sm text-muted-foreground">
                {t('confirm_card_confidence', {confidence: Math.round(identifiedMaterial.confidence * 100)})}
              </p>
            </CardContent>
            <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button size="lg" onClick={handleConfirmDisposal}>
                <Camera className="mr-2" />
                {t('confirm_card_verify_button')}
              </Button>
              <Button size="lg" variant="outline" onClick={resetState}>
                {t('confirm_card_scan_another_button')}
              </Button>
            </CardFooter>
          </Card>
        );
      case 'disposed':
        return (
          <Card className="text-center relative overflow-hidden">
             {animatePoints && (
              <div className={cn(
                "animate-point-burst absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold",
                animatePoints.includes('-') ? 'text-destructive' : 'text-primary'
                )}>
                {animatePoints}
              </div>
            )}
            <CardHeader>
              <Sparkles className="mx-auto h-12 w-12 text-yellow-400" />
              <CardTitle className="font-headline text-3xl">{t('disposed_card_title')}</CardTitle>
              <CardDescription>
                {t('disposed_card_description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-headline text-primary">{userPoints} {t('header_points')}</p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button size="lg" onClick={resetState}>
                {t('disposed_card_scan_another_button')}
              </Button>
              <Button variant="link" onClick={() => setStep('rewards')}>
                {t('disposed_card_rewards_link')}
              </Button>
            </CardFooter>
          </Card>
        );
      case 'rewards':
        return <RewardsSection userPoints={userPoints} onBack={() => setStep('scan')} />;
      case 'guide':
        return <GuideSection onBack={() => setStep('scan')} />;
      case 'verify':
        return <VerificationCenter onBack={() => setStep('scan')} />;
      default:
        return null;
    }
  };

  let currentLoadingMessage = loadingMessage;
    if (isLoading) {
        if (loadingMessage === 'Identifying material...') {
            currentLoadingMessage = t('loading_material');
        } else if (loadingMessage === 'Re-identifying material with barcode...') {
            currentLoadingMessage = t('loading_barcode');
        } else if (loadingMessage === 'Verifying your disposal...') {
            currentLoadingMessage = t('loading_disposal');
        } else if (loadingMessage === 'Verifying your action...') {
            currentLoadingMessage = t('loading_action');
        } else if (loadingMessage === 'Processing receipt...') {
            currentLoadingMessage = t('loading_receipt');
        }
    }


  return (
    <div className="flex min-h-screen flex-col">
      <Header points={userPoints} onNavigate={setStep} onShowSettings={handleOpenSettings} />
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className={cn('w-full max-w-2xl transition-all duration-300', (isLoading || isUserLoading || isProfileLoading) && 'opacity-50 pointer-events-none')}>
          {renderContent()}
        </div>
        
        {isLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">{currentLoadingMessage}</p>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        <Dialog open={showLowConfidenceModal} onOpenChange={setShowLowConfidenceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">{t('confirm_card_title')}</DialogTitle>
              <DialogDescription>
                {t('confirm_card_description')}
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="e.g., 9780201379624"
              value={barcodeNumber}
              onChange={(e) => setBarcodeNumber(e.target.value)}
              type="number"
            />
            <DialogFooter>
              <Button onClick={handleBarcodeSubmit} disabled={isPending || !barcodeNumber}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Barcode
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">{t('settings_title')}</DialogTitle>
              <DialogDescription>
                {t('settings_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
               <Button variant="outline" className="justify-start" onClick={() => { setStep('guide'); setShowSettingsModal(false); }}>
                  <BookCopy className="mr-2" />
                  {t('settings_guide_button')}
               </Button>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="region" className="text-right flex items-center gap-2 justify-end">
                   <Globe />
                   {t('settings_region_label')}
                </Label>
                <Select value={region} onValueChange={handleRegionChange}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent id="region">
                    <SelectItem value="Dubai, UAE">Dubai, UAE</SelectItem>
                    <SelectItem value="Kuwait">Kuwait</SelectItem>
                    <SelectItem value="Turkey">Turkey</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Japan">Japan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="language" className="text-right flex items-center gap-2 justify-end">
                    <Languages />
                   {t('settings_language_label')}
                </Label>
                <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent id="language">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowSettingsModal(false)}>{t('settings_close_button')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export { AppContainerWithTranslations as AppContainer };
