// app/page.tsx
'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContainer } from "@/components/app-container";
import { useUser } from "@/firebase";
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // If loading is not finished, do nothing.
    if (isUserLoading) return;

    // If loading is finished and there's no user, redirect to login.
    if (!user) {
      router.replace("/auth/login");
    }
  }, [user, isUserLoading, router]);

  // While loading, or if there's no user (before redirect kicks in),
  // show a loading spinner.
  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Loading EcoScan...</p>
      </div>
    );
  }

  // If user is logged in, show the main app.
  return (
    <main className="min-h-screen">
      <AppContainer />
    </main>
  );
}
