// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { TranslationProvider } from "@/hooks/use-translation";
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: "EcoScan",
  description: "EcoScan Rewards",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
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
