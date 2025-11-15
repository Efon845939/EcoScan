"use client";
import { useRouter } from "next/navigation";
import { useCooldown } from "@/hooks/use-cooldown";
import { Footprints } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

interface SurveyButtonProps {
  cooldownEndsAt?: number | { seconds: number; nanoseconds: number };
  onClick: () => void;
}

export default function SurveyButton({ cooldownEndsAt, onClick }: SurveyButtonProps) {
  const { t } = useTranslation();
  const { inCooldown, label } = useCooldown(cooldownEndsAt);

  return (
    <button
      type="button"
      onClick={onClick}
      // The button is no longer functionally disabled. It's just styled
      // to look disabled during cooldown, but it remains clickable.
      className={cn(
        "h-20 text-base md:h-24 w-full rounded-md px-4 py-3 font-semibold transition flex flex-col items-center justify-center select-none",
        inCooldown
          ? "bg-gray-300 text-gray-700 opacity-70 cursor-pointer" // Visually appears disabled but is clickable
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
