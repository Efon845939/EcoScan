// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TranslationProvider } from '@/hooks/use-translation';
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-white text-black">
        <FirebaseClientProvider>
          <TranslationProvider>
            {children}
            <Toaster />
          </TranslationProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
