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

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(''); // onay kodu

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!username.trim()) {
        throw new Error('KULLANICI_ADI_GEREKLI');
      }
      if (!code.trim()) {
        // Şimdilik “kod boş olmasın” şartı. Gerçek OTP’yi backend’e bağlayınca burada kontrol edeceksin.
        throw new Error('ONAY_KODU_GEREKLI');
      }

      let cred;

      // 1) Önce giriş dene
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err?.code === 'auth/user-not-found') {
          // 2) Kullanıcı yoksa → KAYIT OL
          cred = await createUserWithEmailAndPassword(auth, email, password);
          const user = cred.user;

          // Auth displayName
          await updateProfile(user, { displayName: username });

          // Firestore profil dokümanı
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
        } else {
          // Diğer login hatalarını fırlat
          throw err;
        }
      }

      // TODO: Buraya gerçek OTP doğrulama entegrasyonunu eklersin.
      // Şu an sadece "kod boş değilse" geçiyor.

      router.push('/');
    } catch (err: any) {
      console.error(err);
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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top left, #d1fae5, transparent), radial-gradient(circle at top right, #bfdbfe, transparent)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          EcoScan Giriş & Kaydol
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#4b5563',
            marginBottom: 16,
          }}
        >
          Kullanıcı adını, e-posta adresini, şifreni ve onay kodunu gir. Hesabın
          varsa giriş yaparsın, yoksa aynı bilgilerle yeni hesap açılır.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <label style={{ fontSize: 14 }}>
            Kullanıcı adı
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="örnek: eco_efon"
              required
            />
          </label>

          <label style={{ fontSize: 14 }}>
            E-posta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="ornek@mail.com"
              required
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="••••••••"
              required
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Onay kodu
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                marginTop: 4,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 14,
              }}
              placeholder="6 haneli kod"
              required
            />
          </label>

          {error && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#b91c1c',
                backgroundColor: '#fee2e2',
                borderRadius: 8,
                padding: '6px 8px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: loading ? '#16a34aaa' : '#059669',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'İşleniyor...' : 'Giriş yap / Kaydol'}
          </button>
        </form>
      </div>
    </div>
  );
}
