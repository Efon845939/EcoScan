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
};

export function VerificationCenter({ onBack }: VerificationCenterProps) {

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
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Main Menu
          </Button>
          <CardTitle className="font-headline text-2xl">
            Verification Center
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          Submit live photos to verify your daily sustainable actions and earn bonus points. Gallery uploads are not supported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="transport">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Bus className="h-5 w-5 text-primary" />
                <span className="font-semibold">Transport Verification</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <CameraCapture
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
                label="Capture your meal receipt for OCR verification."
                category="meal_receipt"
                apiUrl="/api/verify/meal-receipt"
              />
               <CameraCapture
                label="Capture a photo of yourself eating your meal."
                category="meal_photo"
                apiUrl="/api/verify/meal-photo"
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
                label="Capture your drink receipt for OCR verification."
                category="drink_receipt"
                apiUrl="/api/verify/drink-receipt"
              />
               <CameraCapture
                label="Capture a photo of your drink."
                category="drink_photo"
                apiUrl="/api/verify/drink-photo"
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
        <Button variant="outline" className="w-full" onClick={onBack}>Done</Button>
      </CardFooter>
    </Card>
  );
}
