
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Recycle, ShieldCheck, BookCopy } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

type GuideSectionProps = {
  onBack: () => void;
};

export function GuideSection({ onBack }: GuideSectionProps) {
  const { t } = useTranslation();

  const translatedRules = t('guide_rules_list', { returnObjects: true }) as string[];

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
            {t('guide_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          {t('guide_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_recycling_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                {t('guide_recycling_description')}
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_rules_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                {t('guide_rules_description')}
              </p>
              <ul className="list-disc list-inside space-y-2 rounded-md border p-4 text-sm">
                {translatedRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <BookCopy className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_howto_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div>
                <h4 className="font-medium mb-2">{t('guide_howto_recycle_title')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t('guide_howto_recycle_step1', { button: t('scan_card_scan_button') })}</li>
                  <li>{t('guide_howto_recycle_step2')}</li>
                  <li>{t('guide_howto_recycle_step3', { button: t('confirm_card_verify_button') })}</li>
                  <li>{t('guide_howto_recycle_step4')}</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
