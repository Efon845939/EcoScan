// app/page.tsx
'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContainer } from "@/components/app-container";
import { useUser } from "@/firebase";
import { Loader2 } from 'lucide-react';
import { MainHeader } from "@/components/MainHeader";

export default function HomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // If loading is finished and there's no real user, redirect to login
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/auth/login');
    }
  }, [user, isUserLoading, router]);

  // While checking user auth, show a loader
  // Or if we are about to redirect, this prevents a flash of the old page
  if (isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Loading EcoScan...</p>
      </div>
    );
  }

  // If user is logged in, show the main app.
  return (
    <main className="min-h-screen bg-background">
      <AppContainer />
    </main>
  );
}
