// src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore as db } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState<'email' | 'phone'>('email');

  const [identifier, setIdentifier] = useState(''); // email (şimdilik)
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!identifier.trim() || !password.trim()) {
        throw new Error('Lütfen e-posta ve şifre gir.');
      }

      // Şimdilik sadece e-posta ile login
      const email = identifier.trim();

      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // Firestore profil dokümanı var mı, yoksa oluştur
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
      setError(err?.code || err?.message || 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
    >
      <div className="w-full max-w-md bg-[#fdfdfd] rounded-2xl shadow-lg p-8 space-y-6 border border-gray-200">
        {/* Başlık */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome Back!
          </h1>
          <p className="text-sm text-slate-500">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Tab bar: Email / Phone */}
        <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-medium overflow-hidden">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 py-2 rounded-md transition-colors ${
              tab === 'email'
                ? 'bg-white shadow text-slate-900'
                : 'bg-transparent text-slate-500 hover:bg-gray-200'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setTab('phone')}
            className={`flex-1 py-2 rounded-md transition-colors ${
              tab === 'phone'
                ? 'bg-white shadow text-slate-900'
                : 'bg-transparent text-slate-500 hover:bg-gray-200'
            }`}
          >
            Phone
          </button>
        </div>

        {/* Şimdilik sadece email tab aktif, phone boş/disable */}
        {tab === 'phone' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 text-center">
            Phone login is not implemented yet. Please use the Email tab.
          </div>
        )}

        {/* Email login formu */}
        {tab === 'email' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-green-700 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login with Email'}
            </button>
          </form>
        )}

        {/* OR Divider */}
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="h-px flex-1 bg-gray-200" />
          <span>OR</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Social Logins Placeholder */}
        <div className="text-center text-xs text-slate-400 h-8 flex items-center justify-center border border-dashed rounded-lg bg-gray-50">
          Social login buttons (e.g., Google, Apple)
        </div>

        {/* Alt metin: hesabın yok mu? */}
        <p className="text-sm text-slate-600 text-center">
          Don’t have an account?{' '}
          <button
            type="button"
            className="font-semibold text-green-700 hover:underline"
            onClick={() => router.push('/signup')}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
