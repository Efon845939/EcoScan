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

  // Form fields for the unified form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!username.trim() || !email.trim() || !password.trim()) {
        throw new Error('Lütfen tüm alanları doldurun: kullanıcı adı, e-posta ve şifre.');
      }

      let cred;

      // 1. Attempt to sign in first
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // 2. If user does not exist, create a new account (auto-signup)
        if (err.code === 'auth/user-not-found') {
          cred = await createUserWithEmailAndPassword(auth, email, password);
          const user = cred.user;

          // Set the displayName in Firebase Auth
          await updateProfile(user, { displayName: username });

          // Create the user profile document in Firestore
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            uid: user.uid,
            username,
            email: user.email,
            emailVerified: user.emailVerified ?? false,
            phone: null,
            phoneVerified: false,
            country: 'TR', // Default country
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            totalPoints: 0,
            isDisabled: false,
            roles: ['user'],
          });
        } else {
          // For any other login error (e.g., wrong password), re-throw it
          throw err;
        }
      }

      // If either login or signup was successful, redirect to home
      router.push('/');

    } catch (err: any)
{
      console.error('Authentication error:', err);
      // Provide a user-friendly error message
      let friendlyMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      switch (err.code) {
          case 'auth/wrong-password':
              friendlyMessage = 'Girdiğiniz şifre yanlış. Lütfen kontrol edin.';
              break;
          case 'auth/invalid-email':
              friendlyMessage = 'Girdiğiniz e-posta adresi geçersiz.';
              break;
          case 'auth/email-already-in-use':
              friendlyMessage = 'Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.';
              break;
          default:
              friendlyMessage = err.message || 'Giriş veya kayıt sırasında bir hata oluştu.';
      }
      setError(friendlyMessage);
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">Giriş Yap veya Kaydol</h1>
        <p className="text-sm text-slate-600">
          Bilgilerinizi girin. Hesabınız varsa giriş yapılır, yoksa yeni bir hesap oluşturulur.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Kullanıcı adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="örnek: eco_savascisi"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'İşleniyor...' : 'Giriş Yap / Kaydol'}
          </button>
        </form>
      </div>
    </div>
  );
}