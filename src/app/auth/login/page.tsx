"use client";

import { FormEvent, useState } from "react";

type LoginFormState = {
  username: string;
  email: string;
  password: string;
};

export default function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({
    username: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  function handleChange(
    field: keyof LoginFormState,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
    setInfoMessage(null);
  }

  function isValidEmail(email: string): boolean {
    // Basit bir e-posta regex'i; ileri seviye doğrulama sunucuda yapılmalı
    return /\S+@\S+\.\S+/.test(email);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const { username, email, password } = form;

    // Basit client-side doğrulama
    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Lütfen tüm alanları doldurun.");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsSubmitting(true);
    try {
      // ŞİMDİLİK SADECE MOCK:
      // Buraya ileride Firebase Auth (email/password) ya da kendi API'nizi bağlayabilirsiniz.
      console.log("EcoScan Rewards login form:", form);
      setInfoMessage("Giriş formu alındı (şu an mock). Backend daha sonra bağlanacak.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
            <span className="text-emerald-600 font-bold text-lg">ER</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            EcoScan Rewards
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Kullanıcı adı, e-posta ve şifren ile giriş yap.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kullanıcı adı
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
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
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
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
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </div>
          )}
          {!errorMessage && infoMessage && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {infoMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-gray-500 text-center">
          Google girişi yok. Sadece kullanıcı adı, e-posta ve şifre ile giriş
          taslağı hazırlanmıştır.
        </p>
      </div>
    </div>
  );
}
