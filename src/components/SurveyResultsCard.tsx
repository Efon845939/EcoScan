"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Leaf, ThumbsUp, ThumbsDown, Meh, Sparkles, AlertTriangle, Receipt, Home } from "lucide-react";
import { REGIONS, type RegionKey } from "@/lib/carbon-calculator";
import { useTranslation } from "@/hooks/use-translation";

type Props = {
  region: RegionKey;
  kg: number;
  basePoints: number;
  penaltyPoints: number;
  bonusMultiplier?: number;
  onSecondChance: () => void;
  analysis?: string | null;
  recommendations?: string[] | null;
  recoveryActions?: string[] | null;
};

export default function SurveyResultsCard({
  region,
  kg,
  basePoints,
  penaltyPoints,
  bonusMultiplier = 5,
  onSecondChance,
  analysis,
  recommendations,
  recoveryActions,
}: Props) {
  const { t } = useTranslation();
  const r = useRouter();

  const isPenalty = penaltyPoints < 0;

  // Sentiment is based on BASE points, not provisional or penalty
  const sentiment = useMemo(() => {
    if (isPenalty) return "bad";
    if (basePoints >= 20) return "good";
    if (basePoints >= 10) return "mid";
    return "bad"; // Low points but not a penalty
  }, [basePoints, isPenalty]);

  const SentimentIcon = sentiment === "good" ? ThumbsUp : sentiment === "mid" ? Meh : ThumbsDown;

  const metaphor = useMemo(() => {
     if (kg <= 10) return t("metaphor_low");
    if (kg <= 25) return t("metaphor_medium_low");
    if (kg <= 50) return t("metaphor_medium");
    if (kg <= 70) return t("metaphor_high");
    return t("metaphor_very_high");
  }, [kg, t]);

  const { min, avg, max } = REGIONS[region];
  
  const analysisTitleKey = sentiment === 'good' ? 'analysis_good_title' : sentiment === 'mid' ? 'analysis_mid_title' : 'analysis_bad_title';

  const finalRecommendations = recommendations && recommendations.length > 0 ? recommendations : (t(sentiment === 'good' ? 'improvements_low' : sentiment === 'mid' ? 'improvements_medium' : 'improvements_high', { returnObjects: true }) as string[]);
  const finalRecoveryActions = recoveryActions && recoveryActions.length > 0 ? recoveryActions : (t("recovery_actions", { returnObjects: true }) as string[]);
  const finalAnalysis = analysis || t(sentiment === 'good' ? 'default_analysis_good' : sentiment === 'mid' ? 'default_analysis_mid' : 'default_analysis_bad');
  
  const recoveryTitle = isPenalty ? t("survey_recovery_title") : t("survey_bonus_title");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2">
          <Leaf className="text-primary" />
          {t("survey_results_title") || "Survey Results"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KG + Metaphor */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">{t("survey_results_estimated") || "Estimated Footprint"}</p>
          <p className="text-5xl font-bold font-headline text-primary">
            {kg.toFixed(1)} <span className="text-xl">kg CO₂</span>
          </p>
          <p className="text-sm text-muted-foreground italic mt-2">{metaphor}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("survey_range_hint", { min, avg, max }) || `Region range: min ${min}, avg ${avg}, max ${max} kg`}
          </p>
        </div>

        {/* Points notification */}
        {isPenalty ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("survey_penalty_title") || "Penalty applied"}</AlertTitle>
            <AlertDescription dangerouslySetInnerHTML={{ __html: t("survey_penalty_description", { points: penaltyPoints })}} />
          </Alert>
        ) : (
          <Alert variant="default" className="border-green-400/50 text-center bg-green-50/50 dark:bg-green-900/10">
            <Sparkles className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600 dark:text-green-400">
              {t('survey_base_points_title')}
            </AlertTitle>
            <AlertDescription>
                <span dangerouslySetInnerHTML={{ __html: t('survey_base_points_description', { points: basePoints, x: bonusMultiplier })}} />
            </AlertDescription>
          </Alert>
        )}

        {/* Analysis + icon */}
        <Alert>
          <SentimentIcon className={sentiment === "good" ? "text-green-600 h-4 w-4"
            : sentiment === "mid" ? "text-amber-500 h-4 w-4" : "text-red-600 h-4 w-4"} />
          <AlertTitle>
            {t(analysisTitleKey)}
          </AlertTitle>
          <AlertDescription>
            {finalAnalysis}
          </AlertDescription>
        </Alert>

        {/* 3 recommendations */}
        {finalRecommendations.length > 0 && (
            <div>
            <h3 className="font-semibold mb-2">{t("survey_recommendations_title")}</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {finalRecommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
                ))}
            </ul>
            </div>
        )}

        {/* Ways to recover/earn more points today */}
        {finalRecoveryActions.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">
                {recoveryTitle}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {finalRecoveryActions.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={() => (isPenalty ? onSecondChance() : r.push("/verify"))}>
          <Receipt className="mr-2" /> { isPenalty ? t('take_second_chance_button') : t("go_to_verify") }
        </Button>

        <Button size="lg" variant="outline" className="w-full" onClick={() => r.push("/")}>
          <Home className="mr-2" /> {t("back_to_lobby") || "Back to Lobby"}
        </Button>
      </CardFooter>
    </Card>
  );
}
