// components/MainHeader.tsx
"use client";

import Link from "next/link";
import { useUser } from "@/firebase";

export function MainHeader() {
  const { user, isUserLoading } = useUser();

  const isRealUser = user && !user.isAnonymous;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white/80 backdrop-blur">
      <Link href="/" className="text-sm font-semibold text-emerald-700">
        EcoScan Rewards
      </Link>

      {isUserLoading ? (
        <div className="h-6 w-16 bg-gray-200 rounded-md animate-pulse"></div>
      ) : isRealUser ? (
        <Link
          href="/profile"
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Profilim
        </Link>
      ) : (
        <Link
          href="/auth/login"
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          Giriş yap
        </Link>
      )}
    </header>
  );
}
