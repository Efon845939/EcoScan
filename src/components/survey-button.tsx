
"use client";
import { useCooldown } from "@/hooks/use-cooldown";
import { Footprints } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export default function SurveyButton({ cooldownEndsAt, onClick }: { cooldownEndsAt?: number | {seconds:number; nanoseconds:number}, onClick: () => void }) {
  const { t } = useTranslation();
  const { inCooldown, label } = useCooldown(cooldownEndsAt);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inCooldown}
      className={cn(
        "h-20 text-base md:h-24 w-full rounded-md px-4 py-3 font-semibold transition flex flex-col items-center justify-center select-none",
        inCooldown
          ? "bg-gray-300 text-gray-700 cursor-not-allowed opacity-70"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
      title={inCooldown ? t('scan_card_footprint_cooldown') : t('scan_card_footprint_button')}
    >
        <Footprints className="mr-2" />
      {inCooldown ? (
          <span className="text-center text-sm leading-tight">{t('scan_card_footprint_cooldown')}<br /><span className="font-mono text-base">{label}</span></span>
      ) : (
        t('scan_card_footprint_button')
      )}
    </button>
  );
}
