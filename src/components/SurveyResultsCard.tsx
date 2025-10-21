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
  kg: number;                     // estimatedFootprintKg (deterministik)
  basePoints: number;             // pointsFromKgRegionAware(kg, region)
  provisionalPoints?: number;     // computeProvisional(basePoints)
  bonusMultiplier?: number;       // varsayılan 5
  analysisText?: string;          // AI metni (isteğe bağlı)
  recommendations?: string[];     // 3 maddelik öneri (opsiyonel)
};

export default function SurveyResultsCard({
  region,
  kg,
  basePoints,
  provisionalPoints,
  bonusMultiplier = 3,
  analysisText,
  recommendations = [],
}: Props) {
  const { t } = useTranslation();
  const r = useRouter();

  // 1) Duygu/ikon eşlemesi
  const sentiment = useMemo(() => {
    if (basePoints >= 20) return "good";
    if (basePoints >= 10) return "mid";
    return "bad";
  }, [basePoints]);

  const SentimentIcon = sentiment === "good" ? ThumbsUp : sentiment === "mid" ? Meh : ThumbsDown;

  // 2) Basit metafor (insanların anlaması için)
  const metaphor = useMemo(() => carbonMetaphor(kg, t), [kg, t]);

  // 3) “Bugün iyileştirmek için 3 madde”
  const top3 = useMemo(() => {
    if (recommendations && recommendations.length > 0) return recommendations.slice(0,3);
    return topThreeImprovements(region, kg, t);
  }, [region, kg, t, recommendations]);

  // 4) Eğer kötü ise: “Bugün puanı geri kazan” önerileri
  const recovery3 = useMemo(() => (sentiment === "bad" ? recoveryActionsToday(region, t) : []), [region, sentiment, t]);

  const { min, avg, max } = REGIONS[region];
  const isPenalty = kg > (REGIONS[region]?.penaltyThreshold || 30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center justify-center gap-2">
          <Leaf className="text-primary" />
          {t("survey_results_title") || "Survey Results"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KG + Metafor */}
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

        {/* Puan bildirimi */}
        {isPenalty ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("survey_penalty_title") || "Penalty applied"}</AlertTitle>
            <AlertDescription>
              {t("survey_penalty_description", { points: -10 }) ||
                "Your footprint exceeded the regional bound. −10 points applied."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="border-yellow-400/50 text-center bg-yellow-50/50 dark:bg-yellow-900/10">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">
              {t("survey_provisional_title") || "Provisional points granted"}
            </AlertTitle>
            <AlertDescription>
              {/* Geçici puan + base + bonus info */}
              {(t("survey_provisional_description", { points: provisionalPoints }) as string) ||
                `You received ${provisionalPoints} provisional points.`}
              <div className="mt-1 text-xs text-muted-foreground">
                {(t("survey_base_points_hint", { base: basePoints }) as string) || `Base today: ${basePoints} pts.`}
                {" · "}
                {(t("survey_bonus_hint", { x: bonusMultiplier }) as string) || `Receipt bonus: ×${bonusMultiplier}.`}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Analiz + ikon */}
        <Alert>
          <SentimentIcon className={sentiment === "good" ? "text-green-600 h-4 w-4"
            : sentiment === "mid" ? "text-amber-500 h-4 w-4" : "text-red-600 h-4 w-4"} />
          <AlertTitle>
            {sentiment === "good"
              ? (t("analysis_good_title") || "Great choices today")
              : sentiment === "mid"
              ? (t("analysis_mid_title") || "Decent, but room to improve")
              : (t("analysis_bad_title") || "High impact — needs improvement")}
          </AlertTitle>
          <AlertDescription>
            {analysisText || defaultAnalysisText(sentiment, t)}
          </AlertDescription>
        </Alert>

        {/* 3 öneri */}
        {top3.length > 0 && (
            <div>
            <h3 className="font-semibold mb-2">{t("survey_recommendations_title") || "3 ways to improve"}</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {top3.map((rec, i) => (
                <li key={i}>{rec}</li>
                ))}
            </ul>
            </div>
        )}

        {/* Kötüyse: bugün puanı geri kazanmak için 3 madde */}
        {recovery3.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">
                {t("survey_recovery_title") || "Regain points today"}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {recovery3.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {/* Doğrulama Merkezi */}
        <Button size="lg" className="w-full" onClick={() => r.push("/verify")}>
          <Receipt className="mr-2" /> {t("go_to_verify") || "Go to Verification Center"}
        </Button>

        {/* Lobiye Dön */}
        <Button size="lg" variant="outline" className="w-full" onClick={() => r.push("/")}>
          <Home className="mr-2" /> {t("back_to_lobby") || "Back to Lobby"}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* -----------------------------
   Yardımcı Fonksiyonlar
----------------------------- */
type TFunction = (key: string, options?: any) => any;

// Basit, anlaşılır benzetmeler (metafor). Sayılar yaklaşık tutulur.
function carbonMetaphor(kg: number, t: TFunction): string {
  if (kg <= 10) return t("metaphor_low");
  if (kg <= 25) return t("metaphor_medium_low");
  if (kg <= 50) return t("metaphor_medium");
  if (kg <= 70) return t("metaphor_high");
  return t("metaphor_very_high");
}

function defaultAnalysisText(sentiment: "good"|"mid"|"bad", t: TFunction): string {
  if (sentiment === "good") {
    return t("default_analysis_good");
  } else if (sentiment === "mid") {
    return t("default_analysis_mid");
  }
  return t("default_analysis_bad");
}

// Bölgeye ve banda göre 3 öneri
function topThreeImprovements(region: RegionKey, kg: number, t: TFunction): string[] {
  if (kg <= REGIONS[region].avg) {
    return t("improvements_low", { returnObjects: true });
  }
  if (kg <= REGIONS[region].max) {
    return t("improvements_medium", { returnObjects: true });
  }
  return t("improvements_high", { returnObjects: true });
}

// Kötüyse: bugün anında puan geri kazandıran 3 eylem (doğrulama merkezine yönelik)
function recoveryActionsToday(region: RegionKey, t: TFunction): string[] {
  return t("recovery_actions", { returnObjects: true });
}
