import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { RootProviders } from '@/components/root-providers';

export const metadata: Metadata = {
  title: 'EcoScan Rewards',
  description: 'Scan products, recycle correctly, and earn rewards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#0b0f15] bg-[radial-gradient(900px_900px_at_0%_0%,rgba(34,197,94,0.10),transparent_60%),radial-gradient(900px_900px_at_100%_0%,rgba(59,130,246,0.10),transparent_60%)] dark:bg-[radial-gradient(900px_900px_at_0%_0%,rgba(34,197,94,0.18),transparent_60%),radial-gradient(900px_900px_at_100%_0%,rgba(59,130,246,0.18),transparent_60%)] antialiased font-body">
        <RootProviders>
            {children}
            <Toaster />
        </RootProviders>
      </body>
    </html>
  );
}
