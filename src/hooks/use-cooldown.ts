"use client";
import { useEffect, useState } from "react";

export function useCooldown(cooldownEndsAt?: number | { seconds: number; nanoseconds: number }) {
  const endMs =
    typeof cooldownEndsAt === "number"
      ? cooldownEndsAt
      : cooldownEndsAt
      ? cooldownEndsAt.seconds * 1000
      : 0;

  const [now, setNow] = useState(Date.now());
  const diff = Math.max(0, endMs - now);
  const inCooldown = diff > 0;

  useEffect(() => {
    if (!inCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inCooldown]);

  const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  return { inCooldown, label: `${h}:${m}:${s}` };
}
