// app/auth/login/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "@/hooks/use-translation";

type Mode = "login" | "signup";

type LoginFormState = {
  identifier: string; // email (şimdilik)
  password: string;
};

type SignupFormState = {
  username: string;
  email: string;
  password: string;
};

function isValidEmail(value: string) {
  // basit kontrol, yeterli
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
  const v = window.localStorage.getItem("app-language") || "en";
  return (SUPPORTED_LANGS.some((x) => x.code === v) ? v : "en") as LangCode;
}

export default function LoginPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { t, language, setLanguage } = useTranslation();

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
  const [status, setStatus] = useState<string>(t("login_status_ready"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İlk açılışta dili localStorage’dan al (yoksa en)
  useEffect(() => {
    const stored = getStoredLang();
    if (stored && stored !== language) {
      setLanguage(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // dil değişince status string’i de çeviriden gelsin
    setStatus(t("login_status_ready"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const onChangeLang = (next: LangCode) => {
    setLanguage(next);
    // useTranslation zaten localStorage'a yazar, ama garanti olsun:
    try {
      window.localStorage.setItem("app-language", next);
    } catch {}
  };

  function onInputChange() {
    setStatus(t("login_status_changed"));
  }

  async function handleForgotPassword() {
    if (!auth) {
      setStatus(t("login_error_no_auth"));
      return;
    }
    const email = loginForm.identifier.trim();

    if (!email || !isValidEmail(email)) {
      setStatus(t("login_forgot_password_invalid_email"));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus(t("login_forgot_password_sent"));
    } catch (err: any) {
      const e = err as AuthError;
      setStatus(`${t("common_error")}: ${e?.message ?? "Unknown error"}`);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!auth || !firestore) {
      setStatus(t("login_error_no_auth"));
      return;
    }

    setIsSubmitting(true);

    if (mode === "login") {
      const identifier = loginForm.identifier.trim();
      const password = loginForm.password;

      if (!identifier || !isValidEmail(identifier)) {
        setStatus(t("login_error_email_invalid"));
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setStatus(t("login_error_password_short"));
        setIsSubmitting(false);
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, identifier, password);
        setStatus(t("login_login_success"));
        setTimeout(() => router.push("/"), 400);
      } catch (err: any) {
        const e2 = err as AuthError;
        setStatus(`${t("login_error_login_failed")}: ${e2?.message ?? ""}`.trim());
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // signup
    const username = signupForm.username.trim();
    const email = signupForm.email.trim().toLowerCase();
    const password = signupForm.password;

    if (!username || username.length < 3) {
      setStatus(t("login_error_username_short"));
      setIsSubmitting(false);
      return;
    }
    if (!email || !isValidEmail(email)) {
      setStatus(t("login_error_email_invalid"));
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setStatus(t("login_error_password_short"));
      setIsSubmitting(false);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Auth displayName
      await updateProfile(cred.user, { displayName: username });

      // Firestore user doc
      await setDoc(
        doc(firestore, "users", cred.user.uid),
        {
          username,
          displayName: username,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setStatus(t("login_signup_success"));
      setTimeout(() => router.push("/profile"), 400);
    } catch (err: any) {
      const e3 = err as AuthError;
      setStatus(`${t("login_error_signup_failed")}: ${e3?.message ?? ""}`.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeLang = useMemo(() => (language || "en") as LangCode, [language]);

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
              <h1 className="text-2xl font-bold text-gray-900">{t("login_title")}</h1>
              <p className="text-sm text-gray-600 mt-1">{t("login_subtitle")}</p>
            </div>

            {/* Language switcher */}
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

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition ${
                mode === "login"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t("login_mode_login")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium border transition ${
                mode === "signup"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t("login_mode_signup")}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "login" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {t("login_identifier_label")}
                </label>
                <input
                  value={loginForm.identifier}
                  onChange={(e) => {
                    setLoginForm((s) => ({ ...s, identifier: e.target.value }));
                    onInputChange();
                  }}
                  placeholder={t("login_identifier_placeholder")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {t("login_password_label")}
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => {
                    setLoginForm((s) => ({ ...s, password: e.target.value }));
                    onInputChange();
                  }}
                  placeholder={t("login_password_placeholder")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  {t("login_forgot_password")}
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {isSubmitting ? t("common_loading") : t("login_submit_login")}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {t("login_username_label")}
                </label>
                <input
                  value={signupForm.username}
                  onChange={(e) => {
                    setSignupForm((s) => ({ ...s, username: e.target.value }));
                    onInputChange();
                  }}
                  placeholder={t("login_username_placeholder")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {t("login_email_label")}
                </label>
                <input
                  value={signupForm.email}
                  onChange={(e) => {
                    setSignupForm((s) => ({ ...s, email: e.target.value }));
                    onInputChange();
                  }}
                  placeholder={t("login_email_placeholder")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  {t("login_password_label")}
                </label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => {
                    setSignupForm((s) => ({ ...s, password: e.target.value }));
                    onInputChange();
                  }}
                  placeholder={t("login_password_placeholder")}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {isSubmitting ? t("common_loading") : t("login_submit_signup")}
              </button>
            </>
          )}
        </form>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{status}</p>
        </div>
      </div>
    </div>
  );
}
