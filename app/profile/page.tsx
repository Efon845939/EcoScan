"use client";

// app/profile/page.tsx
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateEmail, sendEmailVerification } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";

type Profile = {
  username: string;
  email: string;
  displayName: string;
  about: string;
  photoURL: string | null;
};

const defaultProfile: Profile = {
  username: "",
  email: "",
  displayName: "",
  about: "",
  photoURL: null,
};

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading } = useUser();

  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [status, setStatus] = useState<string>(t("profile_status_no_changes"));
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verifySending, setVerifySending] = useState(false);

  useEffect(() => {
    setStatus(t("profile_status_no_changes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.replace("/auth/login");
    }
  }, [isUserLoading, firebaseUser, router]);

  useEffect(() => {
    if (firebaseUser) {
      const fetchProfile = async () => {
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userProfileData: any = {};
        if (userDocSnap.exists()) {
          userProfileData = userDocSnap.data();
        }

        const initialEmail = (firebaseUser.email || "").trim().toLowerCase();
        setOriginalEmail(initialEmail);

        setProfile({
          username: userProfileData.username ?? firebaseUser.email?.split("@")[0] ?? "",
          displayName: userProfileData.displayName ?? firebaseUser.displayName ?? "",
          email: initialEmail,
          about: userProfileData.about ?? "",
          photoURL: userProfileData.photoURL ?? firebaseUser.photoURL ?? null,
        });

        setEmailVerified(!!auth.currentUser?.emailVerified);
      };

      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, firestore, auth]);

  const emailChanged =
    profile.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();

  function handleChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setStatus(t("profile_status_unsaved"));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!firebaseUser) {
      setStatus(t("profile_error_not_signed_in"));
      return;
    }

    setSaving(true);
    setStatus(t("profile_status_saving"));

    try {
      const userProfileRef = doc(firestore, "users", firebaseUser.uid);

      const dataToSave = {
        displayName: profile.displayName.trim(),
        about: profile.about.trim(),
        updatedAt: new Date(),
      };

      await setDoc(userProfileRef, dataToSave, { merge: true });

      setProfile((p) => ({
        ...p,
        displayName: dataToSave.displayName,
        about: dataToSave.about,
      }));

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.displayName.trim() || undefined,
        });
      }

      setStatus(t("profile_status_saved"));
    } catch (err: any) {
      console.error("PROFILE_SAVE_ERROR", err);
      setStatus(t("profile_error_save_failed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!firebaseUser || !auth.currentUser) {
      setStatus(t("profile_error_avatar_requires_login"));
      return;
    }

    setAvatarUploading(true);
    setStatus(t("profile_status_avatar_uploading"));

    try {
      const storage = getStorage();
      const avatarRef = ref(storage, `avatars/${firebaseUser.uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);

      setProfile((prev) => ({ ...prev, photoURL: url }));

      const userProfileRef = doc(firestore, "users", firebaseUser.uid);
      await setDoc(userProfileRef, { photoURL: url, updatedAt: new Date() }, { merge: true });

      await updateProfile(auth.currentUser, { photoURL: url });

      setStatus(t("profile_status_avatar_updated"));
    } catch (err: any) {
      console.error("AVATAR_UPLOAD_ERROR", err);
      setStatus(t("profile_error_avatar_failed"));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleEmailUpdate() {
    if (!auth?.currentUser) {
      setStatus(t("profile_error_email_update_requires_login"));
      return;
    }

    if (!emailChanged) {
      setStatus(t("profile_status_email_unchanged"));
      return;
    }

    if (!auth.currentUser.emailVerified) {
      setStatus(t("profile_error_email_change_requires_verified"));
      return;
    }

    const newEmail = profile.email.trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      setStatus(t("profile_error_email_invalid"));
      return;
    }

    setSaving(true);
    setStatus(t("profile_status_email_updating"));

    try {
      await updateEmail(auth.currentUser, newEmail);

      const userProfileRef = doc(firestore, "users", auth.currentUser.uid);
      await setDoc(userProfileRef, { email: newEmail, updatedAt: new Date() }, { merge: true });

      setOriginalEmail(newEmail);
      setStatus(t("profile_status_email_updated"));
    } catch (err: any) {
      console.error("EMAIL_UPDATE_ERROR", err);

      if (err?.code === "auth/requires-recent-login") {
        setStatus(t("profile_error_email_requires_recent_login"));
        return;
      }

      if (err?.code === "auth/operation-not-allowed") {
        setStatus(t("profile_error_email_change_requires_verified"));
        return;
      }

      if (err?.code) {
        setStatus(t("profile_error_email_update_failed_with_code", { code: String(err.code) }));
      } else {
        setStatus(t("profile_error_email_update_failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendVerifyEmail() {
    if (!auth.currentUser) {
      setStatus(t("profile_error_verify_requires_login"));
      return;
    }

    setVerifySending(true);
    setStatus(t("profile_status_verify_sending"));

    try {
      await auth.currentUser.reload();
      await sendEmailVerification(auth.currentUser);

      setStatus(t("profile_status_verify_sent"));
    } catch (err: any) {
      console.error("SEND_VERIFY_EMAIL_ERROR (raw):", err);
      const code = err?.code || "unknown";
      setStatus(t("profile_error_verify_send_failed_with_code", { code: String(code) }));
    } finally {
      setVerifySending(false);
    }
  }

  async function handleRefreshEmailVerified() {
    if (!auth.currentUser) {
      setStatus(t("profile_error_no_session"));
      return;
    }

    setStatus(t("profile_status_verify_refreshing"));
    try {
      await auth.currentUser.reload();
      setEmailVerified(!!auth.currentUser.emailVerified);
      setStatus(auth.currentUser.emailVerified ? t("profile_email_verified_ok") : t("profile_not_verified_yet"));
    } catch (err: any) {
      console.error("EMAIL_VERIFIED_REFRESH_ERROR", err);
      setStatus(t("profile_verify_refresh_failed"));
    }
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="ml-3 text-sm text-gray-600">{t("profile_loading")}</p>
      </div>
    );
  }

  const initials =
    (profile.displayName || profile.username || "ER")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ER";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("profile_header", { title: t("profile_title") })}
            </h1>
            <p className="text-sm text-gray-600">{t("profile_page_subtitle")}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {t("profile_back_lobby")}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
          <section className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl overflow-hidden">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={t("profile_avatar_alt")} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-emerald-200 text-[10px] text-emerald-700 cursor-pointer shadow">
                  ✎
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              {avatarUploading && (
                <div className="flex items-center text-[11px] text-gray-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  <span>{t("profile_uploading")}</span>
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">
                  {profile.displayName || profile.username || t("profile_name_not_set")}
                </div>
                <div className="text-xs text-gray-500">
                  {profile.email || t("profile_email_not_saved")}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("profile_username_label")}:</span>
                <span className="font-medium">{profile.username || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("profile_display_name")}:</span>
                <span className="font-medium">{profile.displayName || "-"}</span>
              </div>
            </div>

            {profile.about && (
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="font-semibold mb-1 text-gray-700">{t("profile_about_title")}</div>
                <p className="whitespace-pre-wrap break-words">{profile.about}</p>
              </div>
            )}
          </section>

          <section className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">{t("profile_edit_title")}</h2>
            <p className="text-xs text-gray-500">{t("profile_edit_desc")}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("profile_username_immutable")}
                </label>
                <input
                  type="text"
                  value={profile.username}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("profile_display_name")}
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  placeholder={t("profile_display_name_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("profile_email")}
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full border ${
                      emailVerified
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {emailVerified ? t("profile_email_verified_badge") : t("profile_email_not_verified_badge")}
                  </span>

                  {!emailVerified ? (
                    <button
                      type="button"
                      onClick={handleSendVerifyEmail}
                      disabled={verifySending}
                      className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-2 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {verifySending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          {t("profile_sending")}
                        </>
                      ) : (
                        t("profile_verify_send_button")
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleRefreshEmailVerified}
                    className="inline-flex items-center justify-center rounded-lg bg-white text-gray-700 border border-gray-200 text-xs font-medium px-3 py-2 hover:bg-gray-50 transition"
                  >
                    {t("profile_refresh_status")}
                  </button>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleEmailUpdate}
                    disabled={!emailChanged || saving || avatarUploading}
                    className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-2 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {t("profile_update_email")}
                  </button>

                  {!emailChanged ? (
                    <p className="mt-1 text-[11px] text-gray-500">{t("profile_email_no_change_hint")}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-500">{t("profile_email_change_note")}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("profile_about_label")}
                </label>
                <textarea
                  value={profile.about}
                  onChange={(e) => handleChange("about", e.target.value)}
                  rows={3}
                  placeholder={t("profile_about_placeholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[36px] flex items-center">
                {status}
              </div>

              <button
                type="submit"
                disabled={saving || avatarUploading}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving && !emailChanged ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving && !emailChanged ? t("profile_saving_button") : t("profile_save_button")}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
