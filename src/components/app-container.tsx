"use client";

import { useState, useRef, ChangeEvent, useTransition, useEffect } from 'react';
import Image from 'next/image';
import {
  Camera,
  Loader2,
  ChevronLeft,
  MapPin,
  Sparkles,
  Award,
  Video,
  CircleDot,
  Footprints,
  Receipt,
  BookCopy,
} from 'lucide-react';
import {
  identifyMaterial as identifyMaterialSimple,
  MaterialIdentificationOutput,
} from '@/ai/flows/material-identification-from-scan';
import { identifyMaterial as identifyMaterialWithConfidence } from '@/ai/flows/confidence-based-assistance';
import { processReceipt, ReceiptOutput } from '@/ai/flows/receipt-ocr-flow';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MaterialIcon } from './material-icon';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RewardsSection } from './rewards-section';
import { CarbonFootprintSurvey } from './carbon-footprint-survey';
import { GuideSection } from './guide-section';
import { cn } from '@/lib/utils';
import { useFirebase, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, initiateAnonymousSignIn } from '@/firebase';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { differenceInMilliseconds, addHours } from 'date-fns';
import { getPointsForMaterial } from '@/lib/points';


export type Step = 'scan' | 'camera' | 'confirm' | 'map' | 'disposed' | 'rewards' | 'carbonFootprint' | 'receipt' | 'guide';

function formatTimeLeft(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


export function AppContainer() {
  const [step, setStep] = useState<Step>('scan');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [identifiedMaterial, setIdentifiedMaterial] =
    useState<MaterialIdentificationOutput | null>(null);
  const [receiptResult, setReceiptResult] = useState<ReceiptOutput | null>(null);
  const [showReceiptResultModal, setShowReceiptResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Identifying material...');
  const [isPending, startTransition] = useTransition();
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [animatePoints, setAnimatePoints] = useState<string | false>(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(
    null
  );
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (step === 'camera' || step === 'receipt') {
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
            title: 'Camera Access Denied',
            description:
              'Please enable camera permissions in your browser settings.',
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
  }, [step, toast]);
  
  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);
  
  useEffect(() => {
    // This effect runs when the user's auth state or profile loading state changes.
    // It handles creating a profile for a new user.
  
    // Exit if we're still waiting for auth or profile data, or if there's no user.
    if (isUserLoading || isProfileLoading || !user) {
      return;
    }
  
    // If the user exists but their profile data is missing, they are a new user.
    if (user && !userProfile) {
      // Don't create a profile for an anonymous user immediately.
      // This can be handled later if they perform an action that requires a profile.
      if (user.isAnonymous) {
        return;
      }
  
      // For non-anonymous users (e.g., signed in with Email, Google), create their profile.
      const newProfile = {
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ')[1] || '',
        totalPoints: 0,
        createdAt: serverTimestamp(),
      };
  
      // Use the non-blocking function to create the document.
      if (userProfileRef) {
        setDocumentNonBlocking(userProfileRef, newProfile, { merge: false });
      }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, userProfileRef]);

  const lastSurveyTimestamp = userProfile?.lastCarbonSurveyDate as Timestamp | undefined;

  useEffect(() => {
    if (!lastSurveyTimestamp) {
      setCooldownTimeLeft(null);
      return;
    }

    const lastSurveyDate = lastSurveyTimestamp.toDate();
    const cooldownEndDate = addHours(lastSurveyDate, 24);

    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = differenceInMilliseconds(cooldownEndDate, now);
      if (timeLeft <= 0) {
        setCooldownTimeLeft(null);
        clearInterval(interval);
      } else {
        setCooldownTimeLeft(timeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSurveyTimestamp]);


  const userPoints = userProfile?.totalPoints ?? 0;
  
  const mapImage = PlaceHolderImages.find((img) => img.id === 'map');

  const resetState = () => {
    setStep('scan');
    setScannedImage(null);
    setProductDescription('');
    setIdentifiedMaterial(null);
    setReceiptResult(null);
    setIsLoading(false);
    setHasCameraPermission(null);
  };
  
  const processImage = (dataUri: string) => {
    if (step === 'receipt') {
      processReceiptImage(dataUri);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Identifying material...');
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
            title: 'Identification Failed',
            description: 'Could not identify the material. Please try again.',
          });
          resetState();
        })
        .finally(() => setIsLoading(false));
    });
  };

  const processReceiptImage = (dataUri: string) => {
    setIsLoading(true);
    setLoadingMessage('Processing receipt...');
    setScannedImage(dataUri);
    startTransition(() => {
      processReceipt({ receiptImageUri: dataUri })
        .then((result) => {
          setReceiptResult(result);
          setShowReceiptResultModal(true);
          setStep('carbonFootprint');
        })
        .catch((error) => {
          console.error('AI Error:', error);
          toast({
            variant: 'destructive',
            title: 'Receipt Processing Failed',
            description: 'Could not read the receipt. Please try again with a clearer image.',
          });
          setStep('carbonFootprint');
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

  const handleDescriptionSubmit = () => {
    if (!scannedImage || !productDescription) return;
    setShowLowConfidenceModal(false);
    setIsLoading(true);
    setLoadingMessage('Identifying material...');
    startTransition(() => {
      identifyMaterialWithConfidence({
        photoDataUri: scannedImage,
        productDescription,
      })
        .then((result) => {
          setIdentifiedMaterial({ material: result.material, confidence: result.confidenceLevel });
          setStep('confirm');
        })
        .catch((error) => {
          console.error('AI Error:', error);
          toast({
            variant: 'destructive',
            title: 'Identification Failed',
            description: 'Could not identify the material. Please try again.',
          });
          resetState();
        })
        .finally(() => setIsLoading(false));
    });
  };

  const handleDispose = () => {
    if (!identifiedMaterial) return;
    const pointsAwarded = getPointsForMaterial(identifiedMaterial.material);
    
    setStep('disposed');
    setAnimatePoints(`+${pointsAwarded} Points`);
    
    if (userProfileRef && userProfile) {
      const newPoints = userProfile.totalPoints + pointsAwarded;
      updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });
    }

    setTimeout(() => {
      setAnimatePoints(false);
    }, 1500);
  };
  
  const handleSurveyComplete = (pointsChanged: number) => {
    const pointString = pointsChanged > 0 ? `+${pointsChanged} Points` : `${pointsChanged} Points`;
    setAnimatePoints(pointString);
     setTimeout(() => {
      setAnimatePoints(false);
    }, 1500);
  }

  const renderContent = () => {
    if (isUserLoading || isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg font-semibold">Loading your profile...</p>
            </div>
        )
    }
    switch (step) {
      case 'scan':
        return (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Ready to Go Green?</CardTitle>
              <CardDescription>
                Choose an action to earn points and track your impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
               <Button size="lg" onClick={() => setStep('camera')}>
                <Camera className="mr-2" />
                Scan Product Packaging
              </Button>
              <Button size="lg" variant="outline" onClick={() => setStep('carbonFootprint')}>
                <Footprints className="mr-2" />
                {cooldownTimeLeft ? (
                  `Tomorrow's Carbon Footprint in: ${formatTimeLeft(cooldownTimeLeft)}`
                ) : (
                  'See Your Carbon Footprint'
                )}
              </Button>
            </CardContent>
            <CardFooter className="flex-col gap-2 pt-6">
              <Button variant="link" onClick={() => setStep('rewards')}>
                <Award className="mr-2" />
                View My Rewards ({userPoints} Points)
              </Button>
            </CardFooter>
          </Card>
        );
      case 'camera':
      case 'receipt':
        const isReceipt = step === 'receipt';
        const backStep = isReceipt ? 'carbonFootprint' : 'scan';
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
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <CardTitle className="font-headline text-2xl">
                  {isReceipt ? 'Scan Your Receipt' : 'Scan Your Item'}
                </CardTitle>
              </div>
              <CardDescription className="text-center pt-2">
                {isReceipt ? 'Position the entire receipt in the frame.' : "Position the item's packaging in the frame."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={cn(
                    'w-full h-full object-cover',
                    hasCameraPermission === false && 'hidden'
                  )}
                  autoPlay
                  muted
                  playsInline
                />
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="w-auto">
                    <Video className="h-4 w-4" />
                    <AlertTitle>Camera Not Found</AlertTitle>
                    <AlertDescription>
                      Could not access camera. Please check permissions or upload a file.
                    </AlertDescription>
                  </Alert>
                )}
                {hasCameraPermission === null && (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
            <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                size="lg"
                onClick={handleCapture}
                disabled={hasCameraPermission !== true}
              >
                <CircleDot className="mr-2" /> Capture
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload File
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
                Material Identified: {identifiedMaterial.material}
              </CardTitle>
              <CardDescription>
                We've identified the primary material of your item.
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
                Confidence: {Math.round(identifiedMaterial.confidence * 100)}%
              </p>
            </CardContent>
            <CardFooter className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button size="lg" onClick={() => setStep('map')}>
                <MapPin className="mr-2" />
                Find Nearest Recycling Bin
              </Button>
              <Button size="lg" variant="outline" onClick={resetState}>
                Scan Another Item
              </Button>
            </CardFooter>
          </Card>
        );
      case 'map':
        return (
          <Card>
            <CardHeader>
              <div className="relative flex items-center justify-center">
                <Button variant="ghost" size="sm" className="absolute left-0" onClick={() => setStep('confirm')}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <CardTitle className="font-headline text-center text-2xl">
                  Nearest Bins for {identifiedMaterial?.material}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {mapImage && (
                <Image
                  src={mapImage.imageUrl}
                  alt={mapImage.description}
                  width={800}
                  height={600}
                  className="rounded-lg border"
                  data-ai-hint={mapImage.imageHint}
                />
              )}
              <Button size="lg" onClick={handleDispose}>
                <Camera className="mr-2" /> Confirm Disposal at Bin
              </Button>
            </CardContent>
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
              <CardTitle className="font-headline text-3xl">Recycling Confirmed!</CardTitle>
              <CardDescription>
                Thank you for helping the planet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold font-headline text-primary">{userPoints} pts</p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button size="lg" onClick={resetState}>
                Scan Another Item
              </Button>
              <Button variant="link" onClick={() => setStep('rewards')}>
                Check out rewards
              </Button>
            </CardFooter>
          </Card>
        );
      case 'rewards':
        return <RewardsSection userPoints={userPoints} onBack={() => setStep('scan')} />;
      case 'carbonFootprint':
        return <CarbonFootprintSurvey onBack={() => setStep('scan')} onScanReceipt={() => setStep('receipt')} userProfile={userProfile} onSurveyComplete={handleSurveyComplete} />;
      case 'guide':
        return <GuideSection onBack={() => setStep('scan')} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header points={userPoints} onNavigate={setStep} />
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className={cn('w-full max-w-2xl transition-all duration-300', (isLoading || isUserLoading || isProfileLoading) && 'opacity-50 pointer-events-none')}>
          {renderContent()}
        </div>
        
        {isLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">{loadingMessage}</p>
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
              <DialogTitle className="font-headline">Help Us Be Certain</DialogTitle>
              <DialogDescription>
                To identify the material with more confidence, please type the product description from the packaging.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="e.g., '100% spring water, 500ml bottle'"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={handleDescriptionSubmit} disabled={isPending || !productDescription}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showReceiptResultModal} onOpenChange={setShowReceiptResultModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">Receipt Scanned</DialogTitle>
              <DialogDescription>
                Here is the data we extracted. The provisional points logic is coming soon!
              </DialogDescription>
            </DialogHeader>
            {receiptResult && (
                <div className="text-sm space-y-2">
                    <p><strong>Merchant:</strong> {receiptResult.merchantName}</p>
                    <p><strong>Total:</strong> {receiptResult.totalAmount} {receiptResult.currency}</p>
                    <p><strong>Date:</strong> {new Date(receiptResult.receiptDatetime).toLocaleString()}</p>
                    {receiptResult.lineItems && receiptResult.lineItems.length > 0 && (
                        <div>
                            <strong>Items:</strong>
                            <ul className="list-disc pl-5">
                                {receiptResult.lineItems.map((item, index) => (
                                    <li key={index}>{item.name} - {item.amount}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowReceiptResultModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
