"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { Footprints } from "lucide-react";

type Props = {
  cooldownEndsAt?: number; // epoch ms or undefined
};

function formatTimeLeft(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


export default function SurveyButton({ cooldownEndsAt }: Props) {
  const r = useRouter();
  const { t } = useTranslation();
  const now = Date.now();
  const inCooldown = typeof cooldownEndsAt === "number" && cooldownEndsAt > now;
  const timeLeft = inCooldown ? cooldownEndsAt - now : 0;

  const handleClick = () => {
    if (inCooldown) {
      // “disabled” görünse bile tıklayınca doğrulamaya gider
      r.push("/verify");
    } else {
      r.push("/carbon-footprint"); // anket
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-disabled={inCooldown}
      className={cn(
        "w-full h-20 text-base md:h-24 rounded-md px-4 py-3 font-semibold transition flex flex-col items-center justify-center",
        inCooldown
          ? "bg-gray-300 text-gray-600 cursor-pointer opacity-70"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
      title={inCooldown ? t('scan_card_footprint_cooldown') : t('scan_card_footprint_button')}
    >
        <Footprints className="mr-2" />
      {inCooldown ? (
          <span className="text-center text-sm leading-tight">{t('scan_card_footprint_cooldown')}<br /><span className="font-mono text-base">{formatTimeLeft(timeLeft)}</span></span>
      ) : (
        t('scan_card_footprint_button')
      )}
    </button>
  );
}
