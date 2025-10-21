'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bus, Utensils, GlassWater, Building } from 'lucide-react';
import { CameraCapture } from './camera-capture';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type VerificationCenterProps = {
  onBack: () => void;
  isSecondChance?: boolean;
  onVerified?: () => void;
};

export function VerificationCenter({ onBack, isSecondChance, onVerified }: VerificationCenterProps) {

  const handleDone = () => {
    if (onVerified) {
      onVerified();
    } else {
      onBack();
    }
  }

  const title = isSecondChance ? "Second Chance Verification" : "Verify Your Footprint";
  const description = isSecondChance 
    ? "Perform one of the recommended actions and submit live photo proof to reverse your penalty and earn bonus points."
    : "Submit proof of your daily activities to get a 3x point bonus. Gallery uploads are disabled; all photos must be live.";


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
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CardTitle className="font-headline text-2xl">
            {title}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue='transport'>
          <AccordionItem value="transport">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Bus className="h-5 w-5 text-primary" />
                <span className="font-semibold">Transport Verification</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <CameraCapture
                onCapture={handleDone}
                label="Capture a photo of your transport method (e.g., on a bus, your bike, walking path)."
                category="transport_photo"
                apiUrl="/api/verify/transport"
              />
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="meal">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Utensils className="h-5 w-5 text-primary" />
                <span className="font-semibold">Meal Verification</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
               <CameraCapture
                onCapture={handleDone}
                label="Capture your meal receipt for OCR verification."
                category="meal_receipt"
                apiUrl="/api/verify/meal-receipt"
              />
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="drink">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <GlassWater className="h-5 w-5 text-primary" />
                <span className="font-semibold">Drink Verification</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              <CameraCapture
                onCapture={handleDone}
                label="Capture your drink receipt for OCR verification."
                category="drink_receipt"
                apiUrl="/api/verify/drink-receipt"
              />
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="energy">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-primary" />
                <span className="font-semibold">Energy Verification (Monthly)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
               <CameraCapture
                onCapture={handleDone}
                label="Capture your monthly electricity or water bill."
                category="utility_bill"
                apiUrl="/api/verify/utility-bill"
              />
               <p className="mt-2 text-xs text-amber-700 dark:text-amber-500 text-center">
                  Note: Energy verification is monthly. Submissions for the same month will be rejected.
                </p>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </CardContent>
       <CardFooter>
        <Button variant="outline" className="w-full" onClick={onBack}>Cancel</Button>
      </CardFooter>
    </Card>
  );
}
