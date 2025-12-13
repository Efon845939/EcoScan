
// app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  type AuthError,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useFirebase } from "@/firebase";

type Mode = "login" | "signup";

type LoginFormState = {
  identifier: string; // e-posta veya kullanıcı adı
  password: string;
};

type SignupFormState = {
  username: string;
  email: string;
  password: string;
};

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();

  const [mode, setMode] = useState<Mode>("login");
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    identifier: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    username: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState<string>("Form hazır, henüz gönderilmedi.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  function switchMode(nextMode: Mode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setStatus("Form hazır, henüz gönderilmedi.");
  }

  function handleLoginChange(field: keyof LoginFormState, value: string) {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik yapıldı, henüz gönderilmedi.");
  }

  function handleSignupChange(field: keyof SignupFormState, value: string) {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik yapıldı, henüz gönderilmedi.");
  }

  async function handleForgotPassword() {
    const email = loginForm.identifier.trim();

    if (!email || !isValidEmail(email)) {
      setStatus("HATA: Şifreni sıfırlamak için geçerli bir e-posta gir.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus("Şifre sıfırlama bağlantısı e-posta adresine gönderildi.");
    } catch (err: any) {
      setStatus("HATA: Şifre sıfırlama e-postası gönderilemedi. Daha sonra tekrar dene.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    if (isLogin) {
      const { identifier, password } = loginForm;
      if (!identifier.trim() || !password.trim()) {
        setStatus("HATA: E-posta ve şifre zorunludur.");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setStatus("HATA: Şifre en az 6 karakter olmalı.");
        setIsSubmitting(false);
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, identifier, password);
        setStatus("Giriş başarılı. Ana sayfaya yönlendiriliyorsun...");
        setTimeout(() => router.push("/"), 500);
      } catch (err: any) {
        const e = err as AuthError;
        let msg = "Bilinmeyen bir hata oluştu. Lütfen tekrar dene.";

        if (
          e?.code === "auth/invalid-credential" ||
          e?.code === "auth/wrong-password" ||
          e?.code === "auth/user-not-found"
        ) {
          msg = "E-posta veya şifre hatalı.";
        } else if (e?.code === "auth/too-many-requests") {
          msg = "Çok fazla başarısız deneme yaptın. Bir süre sonra tekrar dene.";
        }
        setStatus(`HATA: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
    } else { // Signup
      const { username, email, password } = signupForm;
      if (!username.trim() || !email.trim() || !password.trim()) {
        setStatus("HATA: Kullanıcı adı, e-posta ve şifre zorunludur.");
        setIsSubmitting(false);
        return;
      }
      if (!isValidEmail(email)) {
        setStatus("HATA: Geçerli bir e-posta adresi gir.");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setStatus("HATA: Şifre en az 6 karakter olmalı.");
        setIsSubmitting(false);
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Use the form's username as the primary displayName in Auth
        await updateProfile(user, { displayName: username });

        // In Firestore, save both the user-chosen displayName and a derived, stable username
        await setDoc(doc(firestore, "users", user.uid), {
          uid: user.uid,
          username: email.split('@')[0], // Derived from email, stable
          displayName: username, // User-chosen, can be changed in profile
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalPoints: 0,
        });

        setStatus("Kayıt başarılı. Ana sayfaya yönlendiriliyorsun...");
        setTimeout(() => router.push("/"), 500);
      } catch (err: any) {
        const e = err as AuthError;
        let msg = "Bilinmeyen bir hata oluştu.";
        if (e?.code === 'auth/email-already-in-use') {
            msg = "Bu e-posta adresi zaten kullanımda."
        }
        setStatus(`HATA: ${msg}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
            <Link href="/" className="text-emerald-600 font-bold text-lg leading-none">
              ER
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            EcoScan Rewards
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isLogin
              ? "Giriş yaparak hesabına devam et."
              : "Kayıt olarak EcoScan Rewards dünyasına katıl."}
          </p>
        </div>

        <div className="mb-4 flex rounded-xl bg-emerald-50 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 rounded-lg transition ${
              isLogin
                ? "bg-white text-emerald-700 shadow-sm"
                : "bg-transparent text-emerald-600 hover:bg-emerald-100/70"
            }`}
          >
            Giriş yap
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 rounded-lg transition ${
              !isLogin
                ? "bg-white text-emerald-700 shadow-sm"
                : "bg-transparent text-emerald-600 hover:bg-emerald-100/70"
            }`}
          >
            Kaydol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(e) => handleLoginChange("identifier", e.target.value)}
                  placeholder="sen@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Şifre
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-medium text-emerald-600 hover:underline"
                  >
                    Şifremi unuttum
                  </button>
                </div>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => handleLoginChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Görünen İsim
                </label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e) => handleSignupChange("username", e.target.value)}
                  placeholder="örn. Eko Kahraman"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => handleSignupChange("email", e.target.value)}
                  placeholder="sen@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => handleSignupChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[36px] flex items-center">
            {status}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting
              ? isLogin
                ? "Giriş yapılıyor..."
                : "Kayıt yapılıyor..."
              : isLogin
              ? "Giriş yap"
              : "Kaydol"}
          </button>
        </form>
      </div>
    </div>
  );
}
