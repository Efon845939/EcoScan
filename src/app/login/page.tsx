// src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { auth, firestore as db } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup State
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signupEmail,
        signupPassword
      );
      const user = userCredential.user;

      await updateProfile(user, { displayName: signupUsername });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        username: signupUsername,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalPoints: 0,
        isDisabled: false,
        roles: ['user'],
        country: 'TR',
        phone: null,
        phoneVerified: false,
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at top left, #d1fae5, transparent), radial-gradient(circle at top right, #bfdbfe, transparent)',
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex rounded-full bg-slate-100 p-1">
          <button
            onClick={() => switchMode('login')}
            className={`w-1/2 py-2 text-sm font-medium rounded-full transition-all ${
              isLogin ? 'bg-white shadow text-emerald-600' : 'text-slate-500'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`w-1/2 py-2 text-sm font-medium rounded-full transition-all ${
              !isLogin ? 'bg-white shadow text-emerald-600' : 'text-slate-500'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {isLogin ? (
          // Login Form
          <form onSubmit={handleLogin} className="space-y-3">
            <h1 className="text-xl font-semibold text-center">Giriş Yap</h1>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-posta</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ornek@mail.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Şifre</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
             {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        ) : (
          // Signup Form
          <form onSubmit={handleSignup} className="space-y-3">
            <h1 className="text-xl font-semibold text-center">Hesap Oluştur</h1>
            <div className="space-y-1">
              <label className="text-sm font-medium">Kullanıcı Adı</label>
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="örnek: eco_savascisi"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-posta</label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ornek@mail.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Şifre</label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>
             {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
