
// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
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
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [status, setStatus] = useState<string>("Değişiklik yapılmadı.");

  // Health check state
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [healthDetails, setHealthDetails] = useState<string | null>(null);
  const [healthRunning, setHealthRunning] = useState(false);

  // Ek debug state
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.replace("/auth/login");
    }
  }, [isUserLoading, firebaseUser, router]);

  useEffect(() => {
    if (firebaseUser) {
      const fetchProfile = async () => {
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userProfileData: any = {};
        if (userDocSnap.exists()) {
          userProfileData = userDocSnap.data();
        }

        setProfile({
          username: userProfileData.username ?? "",
          displayName:
            userProfileData.displayName ?? firebaseUser.displayName ?? "",
          email: firebaseUser.email || "",
          about: userProfileData.about ?? "",
          photoURL:
            userProfileData.photoURL ?? firebaseUser.photoURL ?? null,
        });
      };

      fetchProfile();
    }
  }, [firebaseUser, firestore]);

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
        username: profile.username.trim(),
        displayName: profile.displayName.trim(),
        about: profile.about.trim(),
        email: profile.email,
        photoURL: profile.photoURL ?? null,
        updatedAt: new Date(),
      };

      await setDoc(userProfileRef, dataToSave, { merge: true });

      if(auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.displayName.trim() || undefined,
          photoURL: profile.photoURL || undefined,
        });
      }


      setStatus("Profil kaydedildi.");
    } catch (err: any) {
      console.error("PROFILE_SAVE_ERROR", err);
      setStatus(`HATA: Profil kaydedilirken bir sorun oluştu.`);
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

  async function runHealthCheck() {
    setHealthRunning(true);
    setHealthStatus("Health check çalışıyor...");
    setHealthDetails(null);

    const steps: string[] = [];

    try {
      steps.push("=== GENEL DURUM ===");

      if (!auth || !firestore) {
        steps.push("HATA: useFirebase içinden auth veya firestore gelmedi.");
        setHealthStatus("HATA: Firebase context eksik.");
        return;
      }

      const projectId =
        // @ts-ignore
        (auth.app && auth.app.options && auth.app.options.projectId) ||
        "BULUNAMADI";
      const appName = auth.app ? auth.app.name : "BULUNAMADI";

      steps.push(`App adı: ${appName}`);
      steps.push(`Proje ID (config'ten): ${projectId}`);

      if (!firebaseUser) {
        steps.push("HATA: Giriş yapılmamış. Health check için kullanıcı yok.");
        setHealthStatus("HATA: Giriş yapmamışsın.");
        return;
      }

      steps.push("=== KULLANICI ===");
      steps.push(`UID: ${firebaseUser.uid}`);
      steps.push(`Email: ${firebaseUser.email ?? "yok"}`);

      // ADIM 1: users read
      steps.push("=== ADIM 1: users dokümanı READ testi ===");
      const userDocRef = doc(firestore, "users", firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      steps.push(
        `users/${firebaseUser.uid} dokümanı: ${snap.exists() ? "VAR" : "YOK"}`
      );

      // ADIM 2: users write (merge)
      steps.push("=== ADIM 2: users dokümanı WRITE testi ===");
      await setDoc(
        userDocRef,
        {
          lastHealthCheckAt: new Date(),
          lastHealthCheckSource: "profile-page",
        },
        { merge: true }
      );
      steps.push("users/{uid} içine lastHealthCheckAt yazıldı.");

      // ADIM 3: Storage upload (opsiyonel)
      steps.push("=== ADIM 3: Storage upload testi ===");
      try {
        const storage = getStorage();
        const testRef = ref(
          storage,
          `dev_test/${firebaseUser.uid}-healthcheck.txt`
        );
        const blob = new Blob(
          [`health-check ${new Date().toISOString()}`],
          { type: "text/plain" }
        );
        await uploadBytes(testRef, blob);
        steps.push("Storage upload BAŞARILI.");
      } catch (storageErr: any) {
        steps.push("Storage upload BAŞARISIZ (opsiyonel).");
        if (storageErr?.code) steps.push(`Storage hata kodu: ${storageErr.code}`);
        if (storageErr?.message) steps.push(`Storage mesaj: ${storageErr.message}`);
      }

      setHealthStatus("Health check tamamlandı.");
    } catch (err: any) {
      console.error("HEALTH_CHECK_ERROR", err);
      steps.push("=== HATA ===");
      if (err?.code) steps.push(`Hata kodu: ${err.code}`);
      if (err?.message) steps.push(`Mesaj: ${err.message}`);
      setHealthStatus("HATA: Health check başarısız.");
    } finally {
      setHealthDetails(steps.join("\n"));
      setHealthRunning(false);
    }
  }

  function showDebugInfo() {
    const lines: string[] = [];

    lines.push("=== DEBUG BİLGİLERİ ===");

    if (!auth || !firestore) {
      lines.push("auth veya firestore yok (useFirebase bozuk).");
    } else {
      const projectId =
        // @ts-ignore
        (auth.app && auth.app.options && auth.app.options.projectId) ||
        "BULUNAMADI";
      const appName = auth.app ? auth.app.name : "BULUNAMADI";

      lines.push(`App adı: ${appName}`);
      lines.push(`Project ID: ${projectId}`);
    }

    if (firebaseUser) {
      lines.push(`UID: ${firebaseUser.uid}`);
      lines.push(`Email: ${firebaseUser.email ?? "YOK"}`);
    } else {
      lines.push("Kullanıcı: YOK (login değil).");
    }

    setDebugInfo(lines.join("\n"));
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kullanıcı adı
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) =>
                      handleChange("username", e.target.value)
                    }
                    placeholder="örn. eco_kahraman"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  E-posta (değiştirilemez)
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                />
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
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {saving ? "Kaydediliyor..." : "Profili kaydet"}
              </button>
            </form>
          </section>
        </div>

        {/* Geliştirici / Health Check bölümü */}
        <section className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Geliştirici testleri / Health Check
          </h2>
          <p className="text-xs text-gray-500">
            Butonlar çalışmıyorsa veya Firebase bağlantısını test etmek
            istiyorsan buradan temel kontrolleri yapabilirsin.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={healthRunning}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-medium px-3 py-2 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {healthRunning ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Health check çalışıyor...
                </>
              ) : (
                "Health check çalıştır"
              )}
            </button>

            <button
              type="button"
              onClick={showDebugInfo}
              className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-2 hover:bg-emerald-50 transition"
            >
              Debug bilgilerini göster
            </button>
          </div>

          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs font-medium text-gray-800">
              {healthStatus || "Henüz test çalıştırılmadı."}
            </div>
            {healthDetails && (
              <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-gray-600 max-h-40 overflow-auto">
                {healthDetails}
              </pre>
            )}
          </div>

          {debugInfo && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="text-xs font-medium text-blue-900 mb-1">
                Debug
              </div>
              <pre className="whitespace-pre-wrap break-words text-[11px] text-blue-800 max-h-40 overflow-auto">
                {debugInfo}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

    