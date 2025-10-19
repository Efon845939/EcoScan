
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
import { ChevronLeft, Gift, Recycle, Footprints, ShieldCheck, BookCopy, Camera, QrCode, Receipt } from 'lucide-react';
import { materialPoints } from '@/lib/points';
import { rewards } from './rewards-section';

type GuideSectionProps = {
  onBack: () => void;
};

export function GuideSection({ onBack }: GuideSectionProps) {
  const sortedMaterials = Object.entries(materialPoints).sort(([, a], [, b]) => b - a);
  const sortedRewards = [...rewards].sort((a, b) => a.points - b.points);

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
            App Guide & Rules
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          Learn how to earn points, redeem rewards, and play fair.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-primary" />
                <span className="font-semibold">Recycling Points</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                Earn points by scanning and correctly disposing of items. Points
                are awarded based on the environmental harm prevented by
                recycling the material.
              </p>
              <ul className="space-y-1 rounded-md border p-4 text-sm">
                {sortedMaterials.map(([material, points]) => (
                  <li key={material} className="flex justify-between">
                    <span className="capitalize">{material}</span>
                    <span className="font-bold text-primary">{points} pts</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Footprints className="h-5 w-5 text-primary" />
                <span className="font-semibold">Carbon Footprint Survey</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                Complete a daily survey about your activities to earn points.
                The more sustainable your day, the more points you get.
              </p>
              <ul className="space-y-2 rounded-md border p-4 text-sm">
                <li className="flex justify-between items-center">
                  <span>
                    High Footprint Penalty <br />
                    <small>(If footprint &gt; 40kg CO₂)</small>
                  </span>
                  <span className="font-bold text-destructive">-10 pts</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>
                    Standard Reward <br />
                    <small>(Based on a 1-10 sustainability score)</small>
                  </span>
                  <span className="font-bold text-primary">Up to 25 pts</span>
                </li>
                 <li className="flex justify-between items-center">
                  <span>
                    Receipt Verification Bonus<br />
                    <small>(Scan a receipt to verify your day)</small>
                  </span>
                  <span className="font-bold text-yellow-500">+100% Bonus</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-2">
                The formula is `sustainabilityScore * 2.5`. A higher score means a lower carbon footprint.
              </p>
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="item-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <span className="font-semibold">Reward Redemption</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                Use your hard-earned points to get real-world discounts and
                rewards from our partners.
              </p>
              <ul className="space-y-1 rounded-md border p-4 text-sm">
                {sortedRewards.map((reward) => (
                  <li key={reward.id} className="flex justify-between">
                    <span>
                      {reward.title}{' '}
                      <small className="text-muted-foreground">
                        ({reward.partner})
                      </small>
                    </span>
                    <span className="font-bold text-primary">{reward.points} pts</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">General Rules & Fair Play</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <p>
                To keep the community fair and the rewards meaningful, please follow these rules.
              </p>
              <ul className="list-disc list-inside space-y-2 rounded-md border p-4 text-sm">
                <li>All submissions must be genuine and represent your own actions.</li>
                <li>Do not submit fake scans, old receipts, or manipulated images from your gallery.</li>
                <li>Each recycling act and daily survey should only be logged once. Our system has checks for duplicate submissions.</li>
                <li>Attempting to manipulate the points system may result in a temporary or permanent account suspension.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <BookCopy className="h-5 w-5 text-primary" />
                <span className="font-semibold">How-To Guides</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div>
                <h4 className="font-medium mb-2">How to Recycle & Earn:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>From the main menu, tap <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Camera size={14} /> Scan Product Packaging</span>.</li>
                  <li>Use your camera to scan the item's packaging. Our AI will identify the material.</li>
                  <li>Tap <span className="inline-flex items-center gap-1 font-semibold text-foreground"><QrCode size={14} /> Confirm Disposal at Bin</span>. This will open your camera.</li>
                  <li>At the bin, scan the QR code on the bin to verify your location and confirm the disposal.</li>
                  <li>Your submission will be sent for verification. Points are awarded instantly upon approval!</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">How to Verify Your Carbon Footprint:</h4>
                 <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>From the main menu, tap <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Footprints size={14} /> See Your Carbon Footprint</span> and complete the daily survey.</li>
                  <li>Receive your initial analysis and provisional points.</li>
                  <li>Tap <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Receipt size={14} /> Scan Receipt to Verify</span> to open the camera.</li>
                  <li>Scan a receipt from today that reflects your daily activities (e.g., groceries, transport tickets).</li>
                  <li>If the receipt is validated, your provisional points will be replaced with the full points plus a 100% bonus!</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
