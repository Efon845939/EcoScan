
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
import { ChevronLeft, Gift, Recycle, Footprints, ShieldCheck, BookCopy, Camera, Receipt } from 'lucide-react';
import { materialPoints } from '@/lib/points';
import { rewards } from './rewards-section';
import { useTranslation } from '@/hooks/use-translation';

type GuideSectionProps = {
  onBack: () => void;
};

export function GuideSection({ onBack }: GuideSectionProps) {
  const { t } = useTranslation();
  const sortedMaterials = Object.entries(materialPoints).sort(([, a], [, b]) => b - a);
  const sortedRewards = [...rewards].sort((a, b) => a.points - b.points);

  const translatedSurveyItems = t('guide_survey_items', { returnObjects: true }) as any;
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
              <ul className="space-y-1 rounded-md border p-4 text-sm">
                {sortedMaterials.map(([material, points]) => (
                  <li key={material} className="flex justify-between">
                    <span className="capitalize">{t(`materials.${material}`)}</span>
                    <span className="font-bold text-primary">{points} {t('header_points')}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Footprints className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_survey_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                {t('guide_survey_description')}
              </p>
              <ul className="space-y-2 rounded-md border p-4 text-sm">
                 {Object.values(translatedSurveyItems).map((item: any, index: number) => (
                    <li key={index} className="flex justify-between items-center">
                      <span>
                        {item.title}<br />
                        <small>({item.desc})</small>
                      </span>
                      <span className={`font-bold ${item.points.includes('-') ? 'text-destructive' : 'text-primary'}`}>
                        {item.points.replace('{points}', t('header_points'))}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-2">
                {t('guide_survey_footer')}
              </p>
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="item-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_redemption_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                {t('guide_redemption_description')}
              </p>
              <ul className="space-y-1 rounded-md border p-4 text-sm">
                {sortedRewards.map((reward) => (
                  <li key={reward.id} className="flex justify-between">
                    <span>
                      {t(`rewards.${reward.id}.title`)}{' '}
                      <small className="text-muted-foreground">
                        ({reward.partner})
                      </small>
                    </span>
                    <span className="font-bold text-primary">{reward.points} {t('header_points')}</span>
                  </li>
                ))}
              </ul>
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
                  <li>{t('guide_howto_recycle_step1', { '1': <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Camera size={14} /> {t('scan_card_scan_button')}</span> })}</li>
                  <li>{t('guide_howto_recycle_step2')}</li>
                  <li>{t('guide_howto_recycle_step3', { '1': <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Camera size={14} /> {t('confirm_card_verify_button')}</span> })}</li>
                  <li>{t('guide_howto_recycle_step4')}</li>
                  <li>{t('guide_howto_recycle_step5')}</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">{t('guide_howto_footprint_title')}</h4>
                 <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>{t('guide_howto_footprint_step1', { '1': <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Footprints size={14} /> {t('scan_card_footprint_button')}</span> })}</li>
                  <li>{t('guide_howto_footprint_step2')}</li>
                  <li>{t('guide_howto_footprint_step3', { '1': <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Receipt size={14} /> {t('survey_scan_receipt_button')}</span> })}</li>
                  <li>{t('guide_howto_footprint_step4')}</li>
                  <li>{t('guide_howto_footprint_step5')}</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
