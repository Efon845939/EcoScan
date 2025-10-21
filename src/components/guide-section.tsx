
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Recycle, ShieldCheck, BookCopy, Star } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { getPointsForMaterial } from '@/lib/points';
import { MaterialIcon } from './material-icon';

type GuideSectionProps = {
  onBack: () => void;
};

export function GuideSection({ onBack }: GuideSectionProps) {
  const { t } = useTranslation();

  const materialPoints = t('materials', {returnObjects: true}) as Record<string, string>;

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
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_recycling_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p>{t('guide_recycling_description')}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('guide_material_header')}</TableHead>
                    <TableHead className="text-right">{t('guide_points_header')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(materialPoints).map(([key, name]) => (
                     <TableRow key={key}>
                        <TableCell className="font-medium flex items-center gap-2">
                           <MaterialIcon material={key} className="h-4 w-4 text-muted-foreground" />
                           {name}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">+{getPointsForMaterial(key)}</TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="item-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_survey_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
               <p>{t('guide_survey_description')}</p>
                <ul className="list-disc list-inside space-y-2 rounded-md border p-4 text-sm">
                    {(t('guide_survey_items_list', {returnObjects: true}) as string[]).map((item, index) => (
                        <li key={index} dangerouslySetInnerHTML={{ __html: item }}/>
                    ))}
                </ul>
                <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('guide_survey_footer') }} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">{t('guide_verification_title')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
               <p>{t('guide_verification_description')}</p>
                <ul className="list-disc list-inside space-y-2 rounded-md border p-4 text-sm">
                    {(t('guide_verification_items_list', {returnObjects: true}) as string[]).map((item, index) => (
                        <li key={index} dangerouslySetInnerHTML={{ __html: item }}/>
                    ))}
                </ul>
                 <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('guide_verification_footer') }} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
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
                  {(t('guide_howto_recycle_steps', {returnObjects: true}) as string[]).map((step, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: step }}/>
                  ))}
                </ol>
              </div>
               <div>
                <h4 className="font-medium mb-2">{t('guide_howto_footprint_title')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                   {(t('guide_howto_footprint_steps', {returnObjects: true}) as string[]).map((step, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: step }}/>
                  ))}
                </ol>
              </div>
               <div>
                <h4 className="font-medium mb-2">{t('guide_howto_verification_title')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                   {(t('guide_howto_verification_steps', {returnObjects: true}) as string[]).map((step, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: step }}/>
                  ))}
                </ol>
              </div>
                 <p className="text-xs text-muted-foreground pt-4" dangerouslySetInnerHTML={{ __html: t('guide_points_disclaimer') }} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
