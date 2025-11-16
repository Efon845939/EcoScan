// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "EcoScan",
  description: "EcoScan Rewards",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
