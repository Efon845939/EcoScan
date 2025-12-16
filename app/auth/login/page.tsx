"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

type LoginFormState = {
  username: string;
  email: string;
  password: string;
};

const SUPPORTED_LANGS = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
  { code: "de", label: "DE" },
  { code: "es", label: "ES" },
  { code: "ru", label: "RU" },
  { code: "ar", label: "AR" },
  { code: "ja", label: "JA" },
  { code: "zh", label: "ZH" },
  { code: "bs", label: "BS" },
] as const;

type LangCode = (typeof SUPPORTED_LANGS)[number]["code"];

function getStoredLang(): LangCode {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem("app-language") || "en";
    return (SUPPORTED_LANGS.some((x) => x.code === v) ? v : "en") as LangCode;
  } catch {
    return "en";
  }
}

export default function LoginPage() {
  const { t, language, setLanguage } = useTranslation();

  const [form, setForm] = useState<LoginFormState>({
    username: "",
    email: "",
    password: "",
  });

  const [status, setStatus] = useState<string>(t("login_status_ready"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== language) setLanguage(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setStatus(t("login_status_ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function handleChange(field: keyof LoginFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus(t("login_status_changed"));
  }

  function isValidEmail(email: string): boolean {
    return /\S+@\S+\.\S+/.test(email);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { username, email, password } = form;

    if (!username.trim() || !email.trim() || !password.trim()) {
      setStatus(t("login_error_fill_all"));
      return;
    }
    if (!isValidEmail(email)) {
      setStatus(t("login_error_email_invalid"));
      return;
    }
    if (password.length < 6) {
      setStatus(t("login_error_password_short"));
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("[EcoScan Rewards] Login form values:", form);
      setStatus(t("login_mock_success"));
    } catch (err: any) {
      setStatus(`${t("common_error")}: ${err?.message || t("common_unknown_error")}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeLang = ((language || "en") as LangCode);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8">
        <div className="mb-6 text-center relative">
          <div className="absolute right-0 top-0">
            <label className="sr-only">{t("language_label")}</label>
            <select
              value={activeLang}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-xs rounded-md border border-gray-200 bg-white px-2 py-1"
              aria-label={t("language_label")}
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
            <Link href="/" className="text-emerald-600 font-bold text-lg leading-none">
              ER
            </Link>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {t("login_header")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{t("login_subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {status}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? t("login_submitting") : t("login_submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
