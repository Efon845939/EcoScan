"use client";
import { useRouter } from "next/navigation";
import { useCooldown } from "@/hooks/use-cooldown";
import { Footprints } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export default function SurveyButton({ cooldownEndsAt }: { cooldownEndsAt?: number | {seconds:number; nanoseconds:number} }) {
  const r = useRouter();
  const { t } = useTranslation();
  const { inCooldown, label } = useCooldown(cooldownEndsAt);

  const handleClick = () => {
    // The user should always be able to navigate to the survey page.
    r.push("/carbon-footprint");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      // The button is no longer functionally disabled. It's just styled
      // to look disabled during cooldown, but it remains clickable.
      className={cn(
        "h-20 text-base md:h-24 w-full rounded-md px-4 py-3 font-semibold transition flex flex-col items-center justify-center select-none",
        inCooldown
          ? "bg-gray-300 text-gray-700 opacity-70" // Visually appears disabled
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
