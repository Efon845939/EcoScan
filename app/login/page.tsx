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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();

  // Form alanları
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(''); // onay kodu

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('✅ Form submit tetiklendi');

    try {
      if (!username.trim()) {
        throw new Error('KULLANICI_ADI_GEREKLI');
      }
      if (!code.trim()) {
        throw new Error('ONAY_KODU_GEREKLI');
      }

      let cred;

      // 1) Önce giriş dene
      try {
        console.log('🔐 Giriş deneniyor...');
        cred = await signInWithEmailAndPassword(auth, email, password);
        console.log('🔓 Giriş başarılı');
      } catch (err: any) {
        console.log('❌ Login hata kodu:', err?.code);

        if (err?.code === 'auth/user-not-found') {
          // 2) Kullanıcı yoksa → KAYIT ol
          console.log('👤 Kullanıcı yok, yeni hesap oluşturuluyor...');
          cred = await createUserWithEmailAndPassword(auth, email, password);
          const user = cred.user;

          // displayName
          await updateProfile(user, { displayName: username });

          // Firestore profil
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            uid: user.uid,
            username,
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

          console.log('📄 Firestore profil oluşturuldu:', user.uid);
        } else {
          // Diğer login hatalarını aynen fırlat
          throw err;
        }
      }

      // 3) Buraya gerçek OTP doğrulamasını backend ile bağlayacaksın.
      // Şimdilik sadece "kod boş değilse" geçiyor.

      console.log('🌍 / sayfasına yönlendiriliyor...');
      router.push('/');
    } catch (err: any) {
      console.error('🔥 Hata:', err);
      const msg =
        err?.message === 'KULLANICI_ADI_GEREKLI'
          ? 'Lütfen bir kullanıcı adı gir.'
          : err?.message === 'ONAY_KODU_GEREKLI'
          ? 'Lütfen onay kodunu gir.'
          : err?.code || err?.message || 'Bilinmeyen hata';
      setError(msg);
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
        <h1 className="text-xl font-semibold">EcoScan Giriş & Kaydol</h1>
        <p className="text-sm text-slate-600">
          Kullanıcı adı, e-posta, şifre ve onay kodunu gir. Hesabın varsa giriş
          yapılır, yoksa otomatik olarak yeni hesap oluşturulur.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Kullanıcı adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="örnek: eco_efon"
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

          <div className="space-y-1">
            <label className="text-sm font-medium">Onay kodu</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'İşleniyor...' : 'Giriş yap / Kaydol'}
          </button>
        </form>
      </div>
    </div>
  );
}
