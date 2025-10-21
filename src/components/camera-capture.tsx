'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Camera, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface CameraCaptureProps {
  label: string;
  category: string;
  apiUrl: string;
  onCapture?: () => void;
}

export function CameraCapture({ label, category, apiUrl, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCaptureAndUpload = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) {
      toast({
        variant: 'destructive',
        title: 'Camera Not Ready',
        description: 'Please grant camera permission and try again.',
      });
      return;
    }

    setIsBusy(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        setIsBusy(false);
        return;
    }
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    const dataUri = canvas.toDataURL('image/jpeg');
    const blob = await (await fetch(dataUri)).blob();
    const file = new File([blob], `${category}-${Date.now()}.jpg`, { type: 'image/jpeg' });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('meta', JSON.stringify({ type: category }));

    try {
      const res = await fetch(apiUrl, { method: 'POST', body: fd });
      const j = await res.json();
      if (j.ok) {
        toast({
          title: 'Submission Successful',
          description: 'Your verification has been submitted and is being processed.',
        });
        if (onCapture) onCapture();
      } else {
        throw new Error(j.error || 'Unknown error');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: e.message || 'Could not submit verification.',
      });
    } finally {
      setIsBusy(false);
    }
  }, [apiUrl, category, hasCameraPermission, toast, onCapture]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          className={cn('w-full h-full object-cover', !hasCameraPermission && 'hidden')}
          autoPlay
          muted
          playsInline
        />
        {hasCameraPermission === null && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
        {hasCameraPermission === false && (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Camera Access Required</AlertTitle>
            <AlertDescription>
              Please enable camera permissions in your browser settings to submit verifications.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <Button
        className="w-full"
        onClick={handleCaptureAndUpload}
        disabled={isBusy || !hasCameraPermission}
      >
        {isBusy ? (
          <Loader2 className="mr-2 animate-spin" />
        ) : (
          <Camera className="mr-2" />
        )}
        Capture & Submit
      </Button>
    </div>
  );
}
