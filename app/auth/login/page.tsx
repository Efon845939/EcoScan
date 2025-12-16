// app/auth/login/page.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
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
  identifier: string; // email
  password: string;
};

type SignupFormState = {
  username: string; // display name
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

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
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

  // IMPORTANT: Keep status as a translation key so it updates instantly when language changes.
  const [statusKey, setStatusKey] = useState<string>("login_status_ready");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === "login";

  const activeLang = useMemo(() => {
    const code = (language || "en") as LangCode;
    return SUPPORTED_LANGS.some((x) => x.code === code) ? code : "en";
  }, [language]);

  function switchMode(nextMode: Mode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setStatusKey("login_status_ready");
  }

  function handleLoginChange(field: keyof LoginFormState, value: string) {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
    setStatusKey("login_status_changed");
  }

  function handleSignupChange(field: keyof SignupFormState, value: string) {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
    setStatusKey("login_status_changed");
  }

  async function handleForgotPassword() {
    const email = loginForm.identifier.trim();

    if (!email || !isValidEmail(email)) {
      setStatusKey("login_error_reset_email_invalid");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setStatusKey("login_reset_email_sent");
    } catch (err: any) {
      setStatusKey("login_reset_email_failed");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatusKey("");
    setIsSubmitting(true);

    if (isLogin) {
      const { identifier, password } = loginForm;

      if (!identifier.trim() || !password.trim()) {
        setStatusKey("login_error_email_password_required");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setStatusKey("login_error_password_short");
        setIsSubmitting(false);
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, identifier, password);
        setStatusKey("login_login_success_redirect");
        setTimeout(() => router.push("/"), 500);
      } catch (err: any) {
        const e = err as AuthError;

        if (
          e?.code === "auth/invalid-credential" ||
          e?.code === "auth/wrong-password" ||
          e?.code === "auth/user-not-found"
        ) {
          setStatusKey("login_error_wrong_credentials");
        } else if (e?.code === "auth/too-many-requests") {
          setStatusKey("login_error_too_many_requests");
        } else {
          setStatusKey("login_error_unknown");
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const { username, email, password } = signupForm;

      if (!username.trim() || !email.trim() || !password.trim()) {
        setStatusKey("login_error_username_email_password_required");
        setIsSubmitting(false);
        return;
      }
      if (!isValidEmail(email)) {
        setStatusKey("login_error_invalid_email");
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setStatusKey("login_error_password_short");
        setIsSubmitting(false);
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: username });

        await setDoc(doc(firestore, "users", user.uid), {
          uid: user.uid,
          username: email.split("@")[0], // derived from email, stable
          displayName: username, // user-chosen, can be changed in profile
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalPoints: 0,
        });

        setStatusKey("login_signup_success_redirect");
        setTimeout(() => router.push("/"), 500);
      } catch (err: any) {
        const e = err as AuthError;
        if (e?.code === "auth/email-already-in-use") {
          setStatusKey("login_error_email_in_use");
        } else {
          setStatusKey("login_error_unknown");
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8 relative">
        {/* Language selector (doesn't mess with layout) */}
        <div className="absolute top-3 right-3">
          <label className="sr-only">{t("language_label")}</label>
          <select
            value={activeLang}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs rounded-md border border-emerald-200 bg-white px-2 py-1 text-emerald-800"
            aria-label={t("language_label")}
          >
            {SUPPORTED_LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
            <Link href="/" className="text-emerald-600 font-bold text-lg leading-none">
              ER
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {t("login_brand_title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isLogin ? t("login_subtitle_login") : t("login_subtitle_signup")}
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
            {t("login_tab_login")}
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
            {t("login_tab_signup")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("login_email_label")}
                </label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(e) => handleLoginChange("identifier", e.target.value)}
                  placeholder={t("login_email_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("login_password_label")}
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-medium text-emerald-600 hover:underline"
                  >
                    {t("login_forgot_password")}
                  </button>
                </div>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => handleLoginChange("password", e.target.value)}
                  placeholder={t("login_password_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("login_display_name_label")}
                </label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(e) => handleSignupChange("username", e.target.value)}
                  placeholder={t("login_display_name_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("login_email_label")}
                </label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => handleSignupChange("email", e.target.value)}
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
                  value={signupForm.password}
                  onChange={(e) => handleSignupChange("password", e.target.value)}
                  placeholder={t("login_password_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[36px] flex items-center">
            {statusKey ? t(statusKey) : ""}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isSubmitting
              ? isLogin
                ? t("login_submitting_login")
                : t("login_submitting_signup")
              : isLogin
              ? t("login_button_login")
              : t("login_button_signup")}
          </button>
        </form>
      </div>
    </div>
  );
}
