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

  // This page is now public, so no automatic redirect.
  // The MainHeader will show the correct button (Login or Profile).
  // AppContainer might have its own internal checks for specific actions.

  if (isUserLoading) {
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
      <MainHeader />
      <AppContainer />
    </main>
  );
}
