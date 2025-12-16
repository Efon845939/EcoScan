"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

type LoginFormState = {
  username: string;
  email: string;
  password: string;
};

type LangCode = "en" | "tr" | "de" | "es" | "ru" | "ar" | "ja" | "zh" | "bs";

const SUPPORTED_LANGS: { code: LangCode; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "de", label: "DE" },
  { code: "es", label: "ES" },
  { code: "ru", label: "RU" },
  { code: "ar", label: "AR" },
  { code: "ja", label: "JA" },
  { code: "zh", label: "ZH" },
  { code: "bs", label: "BS" },
];

function getStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem("app-language") || "en";
  return (SUPPORTED_LANGS.some((x) => x.code === v) ? v : "en") as LangCode;
}

export default function LoginPage() {
  const { t, language, setLanguage } = useTranslation();

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    email: "",
    password: "",
  });

  // KRİTİK: status’u metin değil KEY olarak tutuyoruz.
  const [statusKey, setStatusKey] = useState<string>("login_status_ready");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İlk açılışta localStorage dilini uygula
  useEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== language) setLanguage(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dil değişince status aynı KEY ile yeniden çevrilsin diye ekstra iş yok.
  // Ama “bazen boş kalıyor” gibi buglar varsa burada default’a çekebilirsin:
  useEffect(() => {
    if (!statusKey) setStatusKey("login_status_ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function handleChange(field: keyof LoginFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatusKey("login_status_changed");
  }

  function isValidEmail(email: string): boolean {
    return /\S+@\S+\.\S+/.test(email);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { username, email, password } = form;

    if (!username.trim() || !email.trim() || !password.trim()) {
      setStatusKey("login_error_fill_all");
      return;
    }
    if (!isValidEmail(email)) {
      setStatusKey("login_error_invalid_email");
      return;
    }
    if (password.length < 6) {
      setStatusKey("login_error_password_short");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("[EcoScan Rewards] Login form values:", form);
      setStatusKey("login_mock_success");
    } catch (err: any) {
      // Mesajı i18n içine gömmeyelim; genel hata key’i + console’da detay yeter
      console.error(err);
      setStatusKey("common_error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeLang = useMemo(() => (language || "en") as LangCode, [language]);

  const onChangeLang = (next: LangCode) => {
    setLanguage(next);
    try {
      window.localStorage.setItem("app-language", next);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="text-center flex-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                <Link href="/" className="text-emerald-600 font-bold text-lg leading-none">
                  ER
                </Link>
              </div>

              {/* SIGN IN geri geldi */}
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {t("login_title")}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{t("login_subtitle")}</p>
            </div>

            {/* Dil seçici */}
            <div className="shrink-0">
              <label className="block text-xs text-gray-500 mb-1">{t("language_label")}</label>
              <select
                value={activeLang}
                onChange={(e) => onChangeLang(e.target.value as LangCode)}
                className="text-sm rounded-lg border border-gray-200 bg-white px-2 py-1"
                aria-label="Language"
              >
                {SUPPORTED_LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kullanıcı adı */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("login_username_label")}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder={t("login_username_placeholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* E-posta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("login_email_label")}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={t("login_email_placeholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("login_password_label")}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder={t("login_password_placeholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Durum: artık her zaman seçili dile göre render olur */}
          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {t(statusKey)}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? t("login_submitting") : t("login_submit_login")}
          </button>
        </form>
      </div>
    </div>
  );
}
