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

  // login / signup modu
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // sadece signup’ta kullanılacak
  const [username, setUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // ---- LOGIN ----
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
      } else {
        // ---- SIGNUP ----
        if (!username.trim()) {
          throw new Error('USERNAME_REQUIRED');
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        // Auth displayName
        await updateProfile(user, { displayName: username });

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
      }

      // başarı → ana sayfaya
      router.push('/');
    } catch (err: any) {
      console.error(err);
      const code = err?.code || err?.message || 'Bilinmeyen hata';
      setError(code);
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
        {/* Mode switch */}
        <div
          style={{
            display: 'flex',
            marginBottom: 16,
            backgroundColor: '#f3f4f6',
            borderRadius: 999,
            padding: 4,
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: isLogin ? '#ffffff' : 'transparent',
              color: isLogin ? '#047857' : '#4b5563',
              boxShadow: isLogin ? '0 2px 6px rgba(0,0,0,0.09)' : 'none',
            }}
          >
            Giriş
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: !isLogin ? '#ffffff' : 'transparent',
              color: !isLogin ? '#047857' : '#4b5563',
              boxShadow: !isLogin ? '0 2px 6px rgba(0,0,0,0.09)' : 'none',
            }}
          >
            Kayıt ol
          </button>
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          EcoScan {isLogin ? 'Giriş' : 'Kayıt'}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#4b5563',
            marginBottom: 16,
          }}
        >
          {isLogin
            ? 'Hesabına giriş yap ve puanlarını takip et.'
            : 'Yeni hesabını oluştur, kullanıcı adını seç ve puan kazanmaya başla.'}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {/* sadece signup modunda kullanıcı adı */}
          {!isLogin && (
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
          )}

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
              Hata: {error}
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
            {loading
              ? 'İşleniyor...'
              : isLogin
              ? 'Giriş yap'
              : 'Kayıt ol ve giriş yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
