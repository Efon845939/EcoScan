
// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateEmail, sendEmailVerification } from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";

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
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading } = useUser();

  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [status, setStatus] = useState<string>("Değişiklik yapılmadı.");
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verifySending, setVerifySending] = useState(false);

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
          username: userProfileData.username ?? firebaseUser.email?.split('@')[0] ?? "",
          displayName:
            userProfileData.displayName ?? firebaseUser.displayName ?? "",
          email: initialEmail,
          about: userProfileData.about ?? "",
          photoURL:
            userProfileData.photoURL ?? firebaseUser.photoURL ?? null,
        });
        setEmailVerified(!!auth.currentUser?.emailVerified);
      };

      fetchProfile();
    }
  }, [firebaseUser, firestore, auth.currentUser]);

  const emailChanged = profile.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase();

  function handleChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik var, henüz kaydedilmedi.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!firebaseUser) {
      setStatus("HATA: Giriş yapmamışsın, profil kaydedilemedi.");
      return;
    }

    setSaving(true);
    setStatus("Kaydediliyor...");

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

      setStatus("Profil kaydedildi.");
    } catch (err: any) {
      console.error("PROFILE_SAVE_ERROR", err);
      setStatus("HATA: Profil kaydedilirken bir sorun oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!firebaseUser || !auth.currentUser) {
      setStatus("HATA: Profil fotoğrafı için önce giriş yapmalısın.");
      return;
    }

    setAvatarUploading(true);
    setStatus("Profil fotoğrafı yükleniyor...");

    try {
      const storage = getStorage();
      const avatarRef = ref(storage, `avatars/${firebaseUser.uid}`);
      await uploadBytes(avatarRef, file);
      const url = await getDownloadURL(avatarRef);

      setProfile((prev) => ({ ...prev, photoURL: url }));

      const userProfileRef = doc(firestore, "users", firebaseUser.uid);
      await setDoc(
        userProfileRef,
        { photoURL: url, updatedAt: new Date() },
        { merge: true }
      );

      await updateProfile(auth.currentUser, { photoURL: url });

      setStatus("Profil fotoğrafı güncellendi.");
    } catch (err: any) {
      console.error("AVATAR_UPLOAD_ERROR", err);
      setStatus("HATA: Profil fotoğrafı yüklenemedi.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleEmailUpdate() {
    if (!auth?.currentUser) {
      setStatus("HATA: E-posta güncellemek için giriş yapmalısın.");
      return;
    }

    if (!emailChanged) {
        setStatus("E-posta değişmedi, güncelleme yapılmadı.");
        return;
    }
    
    if (!auth.currentUser.emailVerified) {
      setStatus("HATA: E-postanı değiştirmeden önce mevcut e-posta adresini doğrulamalısın.");
      return;
    }
  
    const newEmail = profile.email.trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
      setStatus("HATA: Geçerli bir e-posta gir.");
      return;
    }
  
    setSaving(true);
    setStatus("E-posta güncelleniyor...");
  
    try {
      await updateEmail(auth.currentUser, newEmail);
  
      const userProfileRef = doc(firestore, "users", auth.currentUser.uid);
      await setDoc(
        userProfileRef,
        { email: newEmail, updatedAt: new Date() },
        { merge: true }
      );
  
      setOriginalEmail(newEmail);
      setStatus("E-posta güncellendi. Yeni e-postanı doğrulaman gerekebilir.");
    } catch (err: any) {
      console.error("EMAIL_UPDATE_ERROR", err);
  
      if (err?.code === "auth/requires-recent-login") {
        setStatus(
          "HATA: Güvenlik nedeniyle e-posta değiştirmek için yeniden giriş yapmalısın. Çıkış yapıp tekrar giriş yap, sonra tekrar dene."
        );
        return;
      }
      
      if (err?.code === "auth/operation-not-allowed") {
        setStatus(
          "HATA: E-postanı değiştirebilmek için önce mevcut e-posta adresini doğrulamalısın."
        );
        return;
      }
  
      if (err?.code) {
        setStatus(`HATA: E-posta güncellenemedi (${err.code}).`);
      } else {
        setStatus("HATA: E-posta güncellenemedi.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendVerifyEmail() {
    if (!auth.currentUser) {
      setStatus("HATA: Doğrulama maili göndermek için giriş yapmalısın.");
      return;
    }
  
    setVerifySending(true);
    setStatus("Doğrulama e-postası gönderiliyor...");
  
    try {
      await auth.currentUser.reload();
      await sendEmailVerification(auth.currentUser);
  
      setStatus("Doğrulama e-postası gönderildi. Spam/Promotions da kontrol et.");
    } catch (err: any) {
      console.error("SEND_VERIFY_EMAIL_ERROR (raw):", err);
      const code = err?.code || "unknown";
      setStatus(`HATA: Doğrulama maili gönderilemedi (${code}).`);
    } finally {
      setVerifySending(false);
    }
  }
  
  async function handleRefreshEmailVerified() {
    if (!auth.currentUser) {
      setStatus("HATA: Giriş yok.");
      return;
    }
  
    setStatus("Doğrulama durumu güncelleniyor...");
    try {
      await auth.currentUser.reload();
      setEmailVerified(!!auth.currentUser.emailVerified);
      setStatus(
        auth.currentUser.emailVerified
          ? "E-posta doğrulandı ✅"
          : "Henüz doğrulanmadı."
      );
    } catch (err: any) {
      console.error("EMAIL_VERIFIED_REFRESH_ERROR", err);
      setStatus("HATA: Doğrulama durumu güncellenemedi.");
    }
  }

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="ml-3 text-sm text-gray-600">Profil yükleniyor...</p>
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
              EcoScan Rewards – Profil
            </h1>
            <p className="text-sm text-gray-600">
              Hesap bilgilerini düzenle. Puan, bölge ve diğer ayarlar ayrı
              sayfalardan yönetilir.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Ana Lobiye Dön
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
          <section className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl overflow-hidden">
                  {profile.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt="Profil fotoğrafı"
                      className="w-full h-full object-cover"
                    />
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
                  <span>Yükleniyor...</span>
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">
                  {profile.displayName ||
                    profile.username ||
                    "Henüz ad ayarlanmadı"}
                </div>
                <div className="text-xs text-gray-500">
                  {profile.email || "E-posta henüz kaydedilmedi"}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Kullanıcı adı:</span>
                <span className="font-medium">
                  {profile.username || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Görünen ad:</span>
                <span className="font-medium">
                  {profile.displayName || "-"}
                </span>
              </div>
            </div>

            {profile.about && (
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="font-semibold mb-1 text-gray-700">
                  Hakkında
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {profile.about}
                </p>
              </div>
            )}
          </section>

          <section className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Hesap bilgilerini düzenle
            </h2>
            <p className="text-xs text-gray-500">
              Buradaki bilgiler Firebase hesabınla birlikte saklanır.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kullanıcı adı (değiştirilemez)
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
                  Görünen ad
                </label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) =>
                    handleChange("displayName", e.target.value)
                  }
                  placeholder="Profilde gözükecek isim"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  E-posta
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
                    {emailVerified ? "Email doğrulandı" : "Email doğrulanmadı"}
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
                          Gönderiliyor...
                        </>
                      ) : (
                        "Doğrulama e-postası gönder"
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleRefreshEmailVerified}
                    className="inline-flex items-center justify-center rounded-lg bg-white text-gray-700 border border-gray-200 text-xs font-medium px-3 py-2 hover:bg-gray-50 transition"
                  >
                    Durumu yenile
                  </button>
                </div>
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={handleEmailUpdate}
                        disabled={!emailChanged || saving || avatarUploading}
                        className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-2 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                        E-postayı güncelle
                    </button>
                    {!emailChanged ? (
                        <p className="mt-1 text-[11px] text-gray-500">
                            E-postayı değiştirmeden güncelleme yapılamaz.
                        </p>
                    ) : (
                         <p className="mt-1 text-[11px] text-gray-500">
                            Not: E-posta değiştirmek için bazı durumlarda yeniden giriş yapman gerekebilir.
                        </p>
                    )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hakkında (isteğe bağlı)
                </label>
                <textarea
                  value={profile.about}
                  onChange={(e) => handleChange("about", e.target.value)}
                  rows={3}
                  placeholder="Kendin hakkında kısa bir not bırakabilirsin..."
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
                {saving && !emailChanged ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {saving && !emailChanged ? "Kaydediliyor..." : "Profili kaydet"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
