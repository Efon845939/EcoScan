import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-neutral-950 dark:to-neutral-900 px-4">
      {children}
    </div>
  );
}
