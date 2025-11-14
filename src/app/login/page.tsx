'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useUser, auth, firestore as db } from '@/firebase';
import { useTranslation } from '@/hooks/use-translation';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('TR');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      router.push('/');
    }
  }, [user?.uid, user?.isAnonymous, isUserLoading, router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName || email.split('@')[0],
          email: user.email,
          emailVerified: user.emailVerified ?? false,
          phone: null,
          phoneVerified: false,
          country: 'TR',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalPoints: 0,
          isDisabled: false,
          roles: ['user'],
        });
      }

      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.code || 'auth.error.unknown');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await updateProfile(user, { displayName: username });

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        username,
        email: user.email,
        emailVerified: user.emailVerified ?? false,
        phone: phone || null,
        phoneVerified: false,
        country,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalPoints: 0,
        isDisabled: false,
        roles: ['user'],
      });
      
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.code || 'auth.error.unknown');
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === 'login';

  if (isUserLoading || (user && !user.isAnonymous)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-neutral-950 dark:to-neutral-900 px-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-neutral-900/80 rounded-2xl shadow-xl p-6 space-y-6">
        <div className="flex rounded-full bg-neutral-100 dark:bg-neutral-800 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
              isLogin
                ? 'bg-white dark:bg-neutral-900 shadow text-emerald-600'
                : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t('auth.login.tab')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
              !isLogin
                ? 'bg-white dark:bg-neutral-900 shadow text-emerald-600'
                : 'text-neutral-600 dark:text-neutral-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('auth.signup.tab')}</span>
          </button>
        </div>

        <div>
          <h1 className="text-xl font-semibold">
            {isLogin ? t('auth.login.title') : t('auth.signup.title')}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {isLogin ? t('auth.login.subtitle') : t('auth.signup.subtitle')}
          </p>
        </div>

        <form
          onSubmit={isLogin ? handleLogin : handleSignup}
          className="space-y-4"
        >
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {t('auth.fields.username')}
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('auth.placeholders.username') as string}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('auth.fields.country')}
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="TR">{t('auth.countries.tr')}</option>
                    <option value="KW">{t('auth.countries.kw')}</option>
                    <option value="US">{t('auth.countries.us')}</option>
                    <option value="DE">{t('auth.countries.de')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {t('auth.fields.phone')}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={t('auth.placeholders.phone') as string}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {t('auth.fields.email')}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.placeholders.email') as string}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {t('auth.fields.password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.placeholders.password') as string}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t(`auth.error.${error}`, {
                defaultValue: t('auth.error.unknown'),
              })}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <span>
              {isLogin ? t('auth.login.cta') : t('auth.signup.cta')}
            </span>
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          {isLogin ? t('auth.login.footer') : t('auth.signup.footer')}
        </p>
      </div>
    </div>
  );
}
