
'use client';

import { useState, useRef, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useFirebase, useUser, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { verifySustainabilityAction } from '@/ai/flows/verify-sustainability-action';
import { cn } from '@/lib/utils';

type VerifySustainabilityActionProps = {
  onBack: () => void;
  recommendations: string[];
  initialPenalty: number;
};

export function VerifySustainabilityAction({ onBack, recommendations, initialPenalty }: VerifySustainabilityActionProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
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

  useState(() => {
    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  });

  const handleCaptureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUri = canvas.toDataURL('image/jpeg');
      
      setIsLoading(true);
      startTransition(async () => {
        try {
          const result = await verifySustainabilityAction({
            photoOfActionUri: dataUri,
            recommendations,
          });

          if (result.isValid) {
            if (userProfileRef) {
              const pointsToReverse = Math.abs(initialPenalty);
              const bonus = 15;
              const totalPointsAwarded = pointsToReverse + bonus;

              // This is not perfectly atomic, but good enough for this demo
              const userDoc = await (await import('firebase/firestore')).getDoc(userProfileRef);
              const currentPoints = userDoc.data()?.totalPoints ?? 0;
              const newPoints = currentPoints + totalPointsAwarded;

              updateDocumentNonBlocking(userProfileRef, { totalPoints: newPoints });

              toast({
                title: t('toast_action_verified_title'),
                description: t('toast_action_verified_description', {points: totalPointsAwarded}),
              });
              setIsVerified(true);
            }
          } else {
            toast({
              variant: 'destructive',
              title: t('toast_verification_failed_title'),
              description: result.reason,
            });
          }
        } catch (err) {
          console.error(err);
          toast({
            variant: 'destructive',
            title: t('toast_verification_error_title'),
            description: t('toast_verification_error_description'),
          });
        } finally {
          setIsLoading(false);
        }
      });
    }
  };

  if (isVerified) {
    return (
        <Card>
            <CardHeader>
                <Sparkles className="mx-auto h-12 w-12 text-yellow-400" />
                <CardTitle className="font-headline text-center text-2xl">
                    {t('toast_action_verified_title')}
                </CardTitle>
                <CardDescription className="text-center">
                    {t('toast_bonus_applied_title')}
                </CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button className="w-full" onClick={onBack}>
                    {t('survey_back_button')}
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('camera_back_button')}
          </Button>
          <CardTitle className="font-headline text-center text-2xl">
            {t('camera_verify_action_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
            {t('camera_verify_action_description')}
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
        <Alert>
            <AlertTitle>{t('survey_recommendations_title')}</AlertTitle>
            <AlertDescription>
                <ul className="list-disc list-inside">
                    {recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
            </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          className="w-full"
          onClick={handleCaptureAndVerify}
          disabled={isLoading || isPending || !hasCameraPermission}
        >
          {isLoading || isPending ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <Camera className="mr-2" />
          )}
          {t('camera_capture_button')} &amp; {t('confirm_card_verify_button')}
        </Button>
      </CardFooter>
    </Card>
  );
}
