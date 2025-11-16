// app/auth/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("");

    if (isLogin) {
      const { identifier, password } = loginForm;
      if (!identifier.trim() || !password.trim()) {
        setStatus("HATA: E-posta/kullanıcı adı ve şifre zorunludur.");
        return;
      }
      if (password.length < 6) {
        setStatus("HATA: Şifre en az 6 karakter olmalı.");
        return;
      }

      setIsSubmitting(true);
      try {
        console.log("[EcoScan Rewards] LOGIN", loginForm);
        setStatus("Giriş başarılı (mock). Profil sayfasına yönlendiriliyorsun...");
        setTimeout(() => router.push("/profile"), 500);
      } catch (err: any) {
        setStatus(`HATA: ${err?.message || "Bilinmeyen bir hata oluştu."}`);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const { username, email, password } = signupForm;
      if (!username.trim() || !email.trim() || !password.trim()) {
        setStatus("HATA: Kullanıcı adı, e-posta ve şifre zorunludur.");
        return;
      }
      if (!isValidEmail(email)) {
        setStatus("HATA: Geçerli bir e-posta adresi gir.");
        return;
      }
      if (password.length < 6) {
        setStatus("HATA: Şifre en az 6 karakter olmalı.");
        return;
      }

      setIsSubmitting(true);
      try {
        console.log("[EcoScan Rewards] SIGNUP", signupForm);
        setStatus("Kayıt başarılı (mock). Profil sayfasına yönlendiriliyorsun...");
        setTimeout(() => router.push("/profile"), 500);
      } catch (err: any) {
        setStatus(`HATA: ${err?.message || "Bilinmeyen bir hata oluştu."}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8">
        {/* Logo + başlık */}
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

        {/* Giriş / Kaydol sekmeleri */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              {/* Giriş modu: identifier + password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta veya kullanıcı adı
                </label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(e) => handleLoginChange("identifier", e.target.value)}
                  placeholder="sen@example.com veya eco_kahraman"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
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
              {/* Kaydol modu: username + email + password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı adı
                </label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e) => handleSignupChange("username", e.target.value)}
                  placeholder="örn. eco_kahraman"
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

          {/* Durum mesajı */}
          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {status}
          </div>

          {/* Submit butonu */}
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
