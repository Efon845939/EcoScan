// src/app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { auth, firestore as db } from '@/firebase';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Cloud Functions base URL (env ile yönet)
// Örn: NEXT_PUBLIC_FUNCTIONS_BASE_URL=https://europe-west4-<PROJECT_ID>.cloudfunctions.net
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ||
  'https://europe-west4-<PROJECT_ID>.cloudfunctions.net'; // <PROJECT_ID>’yi güncelle

export default function LoginPage() {
  const router = useRouter();

  // mode: login / signup
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // LOGIN form state
  const [loginIdentifier, setLoginIdentifier] = useState(''); // kullanıcı adı veya e-posta
  const [loginPassword, setLoginPassword] = useState('');

  // SIGNUP form state
  const [suUsername, setSuUsername] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suCode, setSuCode] = useState('');

  const [signupStep, setSignupStep] = useState<'form' | 'code'>('form'); // önce form, sonra kod

  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);

  const isLogin = mode === 'login';

  // ---------- LOGIN FLOW ----------
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!loginIdentifier.trim() || !loginPassword.trim()) {
        throw new Error('Lütfen e-posta / kullanıcı adı ve şifre gir.');
      }

      // Basit versiyon: loginIdentifier’ı e-posta kabul ediyoruz.
      // Eğer username login istiyorsan backend tarafında mapping tablosu kurarsın.
      const email = loginIdentifier;

      const cred = await signInWithEmailAndPassword(auth, email, loginPassword);
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

  // ---------- SIGNUP: STEP 1 – KOD GÖNDER ----------
  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setError(null);
    setSignupMessage(null);

    try {
      if (!suUsername.trim() || !suEmail.trim() || !suPassword.trim()) {
        throw new Error('Lütfen kullanıcı adı, e-posta ve şifre gir.');
      }

      // Cloud Function: requestEmailCode
      const res = await fetch(`${FUNCTIONS_BASE_URL}/requestEmailCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kod gönderilemedi.');
      }

      setSignupMessage(
        'Onay kodu e-posta adresine gönderildi. Lütfen gelen kutunu kontrol et.'
      );
      setSignupStep('code');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Kod gönderilirken bir hata oluştu.');
    } finally {
      setSignupLoading(false);
    }
  }

  // ---------- SIGNUP: STEP 2 – KAYIT OL ----------
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setError(null);

    try {
      if (!suCode.trim()) {
        throw new Error('Lütfen e-postana gelen onay kodunu gir.');
      }

      // Cloud Function: signupWithEmailCode
      const res = await fetch(`${FUNCTIONS_BASE_URL}/signupWithEmailCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suEmail,
          password: suPassword,
          username: suUsername,
          code: suCode,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Kayıt işlemi başarısız.');
      }

      // Backend başarılıysa auth tarafında zaten oturum açtırmış olabilir.
      // Eğer custom token döndürürsen burada signInWithCustomToken ile devam edersin.
      // Şimdilik success varsayıp /'a atıyoruz:
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setSignupLoading(false);
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6">
        {/* TAB BAR */}
        <div className="flex rounded-full bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full ${
              isLogin
                ? 'bg-white shadow text-emerald-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Giriş yap
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full ${
              !isLogin
                ? 'bg-white shadow text-emerald-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Kayıt ol
          </button>
        </div>

        {/* LOGIN FORM */}
        {isLogin && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">EcoScan Giriş</h1>
              <p className="text-sm text-slate-600">
                Kullanıcı adın veya e-posta adresin ve şifrenle giriş yap.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Kullanıcı adı veya e-posta
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="kullanici_adi veya ornek@mail.com"
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
                {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center">
              Hesabın yok mu?{' '}
              <button
                type="button"
                className="text-emerald-600 font-semibold"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
              >
                Kayıt ol
              </button>
            </p>
          </div>
        )}

        {/* SIGNUP FORM */}
        {!isLogin && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">EcoScan Kayıt</h1>
              <p className="text-sm text-slate-600">
                Kullanıcı adı, e-posta ve şifreni gir. E-posta adresine gelen
                onay kodunu yazarak kaydını tamamla.
              </p>
            </div>

            {/* STEP 1: FORM + “Kodu Gönder” */}
            {signupStep === 'form' && (
              <form onSubmit={handleSendCode} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Kullanıcı adı</label>
                  <input
                    type="text"
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="örnek: eco_efon"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">E-posta</label>
                  <input
                    type="email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="ornek@mail.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Şifre</label>
                  <input
                    type="password"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
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

                {signupMessage && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    {signupMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signupLoading ? 'Kod gönderiliyor...' : 'Onay kodu gönder'}
                </button>
              </form>
            )}

            {/* STEP 2: CODE + “Kayıt ol” */}
            {signupStep === 'code' && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    E-postana gelen onay kodu
                  </label>
                  <input
                    type="text"
                    value={suCode}
                    onChange={(e) => setSuCode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="6 haneli kod"
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
                  disabled={signupLoading}
                  className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {signupLoading ? 'Kayıt yapılıyor...' : 'Kayıt ol'}
                </button>

                <button
                  type="button"
                  className="w-full text-xs text-slate-500 underline mt-1"
                  onClick={() => {
                    setSignupStep('form');
                    setError(null);
                  }}
                >
                  E-postayı değiştirmek istiyorum
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
