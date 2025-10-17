"use client";

import { useState, useRef, ChangeEvent, useTransition } from 'react';
import Image from 'next/image';
import {
  Camera,
  Loader2,
  ChevronLeft,
  MapPin,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  identifyMaterial as identifyMaterialSimple,
  MaterialIdentificationOutput,
} from '@/ai/flows/material-identification-from-scan';
import { identifyMaterial as identifyMaterialWithConfidence } from '@/ai/flows/confidence-based-assistance';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MaterialIcon } from './material-icon';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RewardsSection } from './rewards-section';
import { cn } from '@/lib/utils';

type Step = 'scan' | 'confirm' | 'map' | 'disposed' | 'rewards';

export function AppContainer() {
  const [step, setStep] = useState<Step>('scan');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scannedImageFile, setScannedImageFile] = useState<File | null>(null);
  const [productDescription, setProductDescription] = useState('');
  const [identifiedMaterial, setIdentifiedMaterial] =
    useState<MaterialIdentificationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [userPoints, setUserPoints] = useState(100);
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [animatePoints, setAnimatePoints] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const mapImage = PlaceHolderImages.find((img) => img.id === 'map');

  const resetState = () => {
    setStep('scan');
    setScannedImage(null);
    setScannedImageFile(null);
    setProductDescription('');
    setIdentifiedMaterial(null);
    setIsLoading(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setScannedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
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
      reader.readAsDataURL(file);
    }
  };

  const handleDescriptionSubmit = () => {
    if (!scannedImage || !productDescription) return;
    setShowLowConfidenceModal(false);
    setIsLoading(true);
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
    setStep('disposed');
    setAnimatePoints(true);
    setUserPoints((prev) => prev + 10);
    setTimeout(() => {
      setAnimatePoints(false);
    }, 1500);
  };
  
  const renderContent = () => {
    switch (step) {
      case 'scan':
        return (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Ready to Recycle?</CardTitle>
              <CardDescription>
                Scan product packaging to identify its material and find the nearest recycling bin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2" />
                Scan Product Packaging
              </Button>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <p className="text-sm text-muted-foreground">or</p>
              <Button variant="outline" onClick={() => setStep('rewards')}>
                <Award className="mr-2" />
                View My Rewards
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
              <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setStep('confirm')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <CardTitle className="font-headline pt-8 text-center text-2xl">
                Nearest Bins for {identifiedMaterial?.material}
              </CardTitle>
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
                <Camera className="mr-2" /> I'm here, Scan Bin & Dispose
              </Button>
            </CardContent>
          </Card>
        );
      case 'disposed':
        return (
          <Card className="text-center relative overflow-hidden">
             {animatePoints && (
              <div className="animate-point-burst absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-primary">
                +10 Points
              </div>
            )}
            <CardHeader>
              <Sparkles className="mx-auto h-12 w-12 text-yellow-400" />
              <CardTitle className="font-headline text-3xl">Recycling Confirmed!</CardTitle>
              <CardDescription>
                Thank you for helping the planet. You've earned 10 points.
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
        return <RewardsSection onBack={() => setStep('scan')} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header points={userPoints} />
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <div className={cn('w-full max-w-2xl transition-all duration-300', isLoading && 'opacity-50 pointer-events-none')}>
          {renderContent()}
        </div>
        
        {isLoading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">Identifying material...</p>
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
      </main>
    </div>
  );
}
