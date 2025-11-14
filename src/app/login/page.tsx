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
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at top left, #d1fae5, transparent), radial-gradient(circle at top right, #bfdbfe, transparent)',
      }}
    >
      <div className="w-full max-w-md bg-[#fdf7ec] rounded-2xl shadow-xl p-6 space-y-6 border border-[#e5dcc7]">
        {/* Başlık */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            Welcome Back!
          </h1>
          <p className="text-sm text-slate-600">
            Hesabına erişmek için bilgilerini gir.
          </p>
        </div>

        {/* Tab bar: Email / Phone */}
        <div className="flex rounded-lg bg-[#e4dfd1] text-sm font-medium overflow-hidden">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 py-2 border-r border-[#d6cfbf] ${
              tab === 'email'
                ? 'bg-white text-slate-900'
                : 'bg-transparent text-slate-600'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setTab('phone')}
            className={`flex-1 py-2 ${
              tab === 'phone'
                ? 'bg-white text-slate-900'
                : 'bg-transparent text-slate-600'
            }`}
          >
            Phone
          </button>
        </div>

        {/* Şimdilik sadece email tab aktif, phone boş/disable */}
        {tab === 'phone' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Telefonla giriş henüz aktif değil. Şimdilik e-posta sekmesini
            kullan.
          </div>
        )}

        {/* Email login formu */}
        {tab === 'email' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">
                Email
              </label>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-[#d4cbb5] bg-[#fdfaf2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#d4cbb5] bg-[#fdfaf2] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-emerald-700 hover:underline"
                  // ileride /reset-password'e yönlendirirsin
                  onClick={() => alert('Şifre sıfırlama ekranı henüz yapılmadı.')}
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#256029] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4f21] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login with Email'}
            </button>
          </form>
        )}

        {/* OR Divider */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-[#e2d9c4]" />
          <span>OR</span>
          <div className="h-px flex-1 bg-[#e2d9c4]" />
        </div>

        {/* Buraya istersen Google / Apple butonları eklersin */}
        <div className="text-center text-xs text-slate-400">
          (Buraya Google / Apple ile giriş butonları gelebilir)
        </div>

        {/* Alt metin: hesabın yok mu? */}
        <p className="text-xs text-slate-600 text-center">
          Don’t have an account?{' '}
          <button
            type="button"
            className="font-semibold text-emerald-700 hover:underline"
            onClick={() => router.push('/signup')}
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
