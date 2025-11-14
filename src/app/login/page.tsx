'use client';

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useTranslation } from "@/hooks/use-translation";
import { useAuth as useFirebaseAuth } from "@/hooks/use-auth";
import { useUser } from "@/firebase";
import { LogIn, Loader2 } from "lucide-react"; 

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, loading, error } = useFirebaseAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // If user is loaded and not anonymous, redirect to home.
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      router.push('/');
    }
  }
  
  if (isUserLoading || (user && !user.isAnonymous)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-neutral-950 dark:to-neutral-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-lg p-6 space-y-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-primary">
            <LogIn className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {t("auth.login.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("auth.login.subtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
            >
              {t("auth.fields.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.placeholders.email") as string}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
            >
              {t("auth.fields.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t("auth.placeholders.password") as string}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t(error)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
            <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
            {loading && (
                <Loader2 className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            <span>{t("auth.login.cta")}</span>
            </button>
             <button type="button" onClick={() => router.push('/signup')} className="w-full text-sm text-muted-foreground hover:text-primary transition">
                {t("auth.login.signup_link")}
            </button>
        </div>
      </form>
    </div>
  );
}