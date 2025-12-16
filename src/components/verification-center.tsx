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
import { ChevronLeft, Bus, Utensils, GlassWater, Building, Receipt, Camera } from 'lucide-react';
import { CameraCapture } from './camera-capture';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useTranslation } from '@/hooks/use-translation';

type VerificationCenterProps = {
  onBack: () => void;
  isSecondChance?: boolean;
  onVerified?: () => void;
};

export function VerificationCenter({ onBack, isSecondChance, onVerified }: VerificationCenterProps) {
  const { t } = useTranslation();

  const handleDone = () => {
    if (onVerified) onVerified();
  };

  const title = isSecondChance ? t('verify_center_title_second_chance') : t('verify_center_title');
  const description = isSecondChance
    ? t('verify_center_desc_second_chance')
    : t('verify_center_desc');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button variant="ghost" size="sm" className="absolute left-0" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('verify_back')}
          </Button>
          <CardTitle className="font-headline text-2xl">{title}</CardTitle>
        </div>
        <CardDescription className="text-center pt-2">{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="transport">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Bus className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('verify_transport_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_transport_label')}
                category="transport_photo"
                apiUrl="/api/verify/transport"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="meal">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Utensils className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('verify_meal_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_meal_opt1_label')}
                category="meal_receipt"
                apiUrl="/api/verify/meal-receipt"
                icon={Receipt}
              />
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_meal_opt2_label')}
                category="meal_photo"
                apiUrl="/api/verify/meal-photo"
                icon={Camera}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="drink">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <GlassWater className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('verify_drink_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_drink_opt1_label')}
                category="drink_receipt"
                apiUrl="/api/verify/drink-receipt"
                icon={Receipt}
              />
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_drink_opt2_label')}
                category="drink_photo"
                apiUrl="/api/verify/drink-photo"
                icon={Camera}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="energy">
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('verify_energy_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <CameraCapture
                onCapture={handleDone}
                label={t('verify_energy_label')}
                category="utility_bill"
                apiUrl="/api/verify/utility-bill"
              />
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-500 text-center">
                {t('verify_energy_note')}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onBack}>
          {t('verify_done')}
        </Button>
      </CardFooter>
    </Card>
  );
}
