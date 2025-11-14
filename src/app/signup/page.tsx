// src/app/signup/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore as db } from '@/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// IMPORTANT: Replace <PROJECT_ID> with your actual Firebase Project ID
const FUNCTIONS_BASE_URL =
  process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ||
  'https://europe-west4-studio-8170073529-138bb.cloudfunctions.net';

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'code'>('form');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Request a verification code
  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!username.trim() || !email.trim() || !password.trim()) {
        throw new Error('Please fill in all fields: username, email, and password.');
      }

      const res = await fetch(`${FUNCTIONS_BASE_URL}/requestEmailCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setMessage('Verification code sent to your email. Please check your inbox.');
      setStep('code');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred while sending the code.');
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Sign up with the verification code
  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!code.trim()) {
        throw new Error('Please enter the verification code from your email.');
      }

      const res = await fetch(`${FUNCTIONS_BASE_URL}/signupWithEmailCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // If the backend returns a custom token, sign the user in
      if (data.token && data.uid) {
        await signInWithCustomToken(auth, data.token);
        
        // The backend function should ideally create the profile,
        // but we can create it here as a fallback if needed.
        const userRef = doc(db, 'users', data.uid);
        await setDoc(
          userRef,
          {
            uid: data.uid,
            username,
            email,
            emailVerified: true, // Verified via OTP
            phone: null,
            phoneVerified: false,
            country: 'TR',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            totalPoints: 0,
            isDisabled: false,
            roles: ['user'],
          },
          { merge: true } // Merge to avoid overwriting if CF created it first
        );
      }

      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred during sign-up.');
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
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">
            Create your EcoScan account
          </h1>
          <p className="text-sm text-slate-600">
            Enter your details and complete the email verification to get started.
          </p>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSendCode} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., eco_warrior"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="name@example.com"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleSignup} className="space-y-3">
             {message && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {message}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="6-digit code from your email"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <button
              type="button"
              className="w-full text-xs text-slate-500 underline mt-1"
              onClick={() => {
                setStep('form');
                setError(null);
                setMessage(null);
              }}
            >
              Want to change your email or password?
            </button>
          </form>
        )}
        
        <p className="text-sm text-slate-600 text-center">
          Already have an account?{' '}
          <button
            type="button"
            className="font-semibold text-emerald-700 hover:underline"
            onClick={() => router.push('/login')}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
