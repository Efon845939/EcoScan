
// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, updateEmail } from "firebase/auth";
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
  const [storageTestEnabled, setStorageTestEnabled] = useState(false);

  // Ek debug state
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [clickPing, setClickPing] = useState(0);
  const [lastClickAt, setLastClickAt] = useState<string>("");

  const [saveDebug, setSaveDebug] = useState<string>("");
  const [saveCount, setSaveCount] = useState(0);

  function appendSave(line: string) {
    setSaveDebug((prev) => (prev ? prev + "\n" + line : line));
  }
  
  function appendHealth(line: string) {
    setHealthDetails((prev) => (prev ? prev + "\n" + line : line));
  }

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
          username: userProfileData.username ?? firebaseUser.email?.split('@')[0] ?? "",
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

    const ts = new Date().toISOString();
    setSaveCount((n) => n + 1);
    setSaveDebug("");
    appendSave(`✅ submit geldi (#${saveCount + 1}) @ ${ts}`);

    if (!firebaseUser) {
      appendSave("⛔ firebaseUser yok (login değil).");
      setStatus("HATA: Giriş yapmamışsın, profil kaydedilemedi.");
      return;
    }

    setSaving(true);
    setStatus("Kaydediliyor...");
    const t0 = performance.now();

    try {
      // 1) Firestore write (SADECE displayName ve about güncellenecek)
      appendSave("➡️ ADIM 1: Firestore setDoc(users/{uid}) başlıyor...");
      const userProfileRef = doc(firestore, "users", firebaseUser.uid);

      const dataToSave = {
        displayName: profile.displayName.trim(),
        about: profile.about.trim(),
        updatedAt: new Date(),
      };

      await setDoc(userProfileRef, dataToSave, { merge: true });
      appendSave("✅ ADIM 1: Firestore write OK.");
      
      appendSave("➡️ ADIM 1.5: Firestore read-back (hemen geri oku)...");
      const afterSnap = await getDoc(userProfileRef);
      appendSave(`✅ ADIM 1.5: read-back OK (exists=${afterSnap.exists() ? "yes" : "no"})`);

      if (afterSnap.exists()) {
        const d: any = afterSnap.data();
        appendSave(`↩️ read-back displayName: ${String(d.displayName ?? "")}`);
        appendSave(`↩️ read-back username: ${String(d.username ?? "")}`);
      }
      
       setProfile((p) => ({
        ...p,
        displayName: dataToSave.displayName,
        about: dataToSave.about,
      }));

      // 2) Auth updateProfile
      appendSave("➡️ ADIM 2: Auth updateProfile başlıyor...");
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profile.displayName.trim() || undefined,
        });
        appendSave("✅ ADIM 2: Auth updateProfile OK.");
        appendSave(`↩️ auth.currentUser.displayName: ${auth.currentUser?.displayName ?? ""}`);
      } else {
        appendSave("⚠️ ADIM 2: auth.currentUser yok, updateProfile atlandı.");
      }

      const ms = Math.round(performance.now() - t0);
      appendSave(`✅ BİTTİ: Toplam süre ~${ms}ms`);
      setStatus("Profil kaydedildi.");
    } catch (err: any) {
      console.error("PROFILE_SAVE_ERROR", err);
      appendSave("⛔ HATA: catch'e düştü.");
      if (err?.code) appendSave(`error code: ${err.code}`);
      if (err?.message) appendSave(`error msg: ${err.message}`);
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
    
    // Check if the user's current email is verified
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
      // 1) Auth e-posta güncelle
      await updateEmail(auth.currentUser, newEmail);
  
      // 2) Firestore'da da email alanını güncelle (profil dokümanı tutarlılık için)
      const userProfileRef = doc(firestore, "users", auth.currentUser.uid);
      await setDoc(
        userProfileRef,
        { email: newEmail, updatedAt: new Date() },
        { merge: true }
      );
  
      setStatus("E-posta güncellendi. Yeni e-postanı doğrulaman gerekebilir.");
    } catch (err: any)
     {
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

  function uiPing() {
    const ts = new Date().toISOString();
    setClickPing((n) => n + 1);
    setLastClickAt(ts);
    setHealthStatus("UI Ping: Buton tıklandı ✅");
    setHealthDetails(`Ping #${clickPing + 1}\nZaman: ${ts}`);
  }

  async function runHealthCheck() {
    setHealthRunning(true);
    setHealthStatus("Health check çalışıyor...");
    setHealthDetails("");

    function appendHealth(line: string) {
      setHealthDetails(prev => (prev ? prev + "\n" + line : line));
    }

    appendHealth("=== GENEL DURUM ===");

    if (!auth || !firestore) {
      appendHealth("HATA: useFirebase içinden auth veya firestore gelmedi.");
      setHealthStatus("HATA: Firebase context eksik.");
      setHealthRunning(false);
      return;
    }
    
    const projectId = (auth.app && auth.app.options && auth.app.options.projectId) || "BULUNAMADI";
    const appName = auth.app ? auth.app.name : "BULUNAMADI";

    appendHealth(`App adı: ${appName}`);
    appendHealth(`Proje ID (config'ten): ${projectId}`);

    if (!firebaseUser) {
      appendHealth("HATA: Giriş yapılmamış. Health check için kullanıcı yok.");
      setHealthStatus("HATA: Giriş yapmamışsın.");
      setHealthRunning(false);
      return;
    }

    appendHealth("=== KULLANICI ===");
    appendHealth(`UID: ${firebaseUser.uid}`);
    appendHealth(`Email: ${firebaseUser.email ?? "yok"}`);

    try {
      appendHealth("=== ADIM 1: users dokümanı READ testi ===");
      const userDocRef = doc(firestore, "users", firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      appendHealth(`users/${firebaseUser.uid} dokümanı: ${snap.exists() ? "VAR" : "YOK"}`);

      appendHealth("=== ADIM 2: users dokümanı WRITE testi ===");
      await setDoc(userDocRef, { lastHealthCheckAt: new Date(), lastHealthCheckSource: "profile-page" }, { merge: true });
      appendHealth("users/{uid} içine lastHealthCheckAt yazıldı.");
      
      if (storageTestEnabled) {
        appendHealth("=== ADIM 3: Storage upload testi ===");
        try {
          const storage = getStorage();
          const testRef = ref(storage, `dev_test/${firebaseUser.uid}-healthcheck.txt`);
          const blob = new Blob([`health-check ${new Date().toISOString()}`], { type: "text/plain" });
          await uploadBytes(testRef, blob);
          appendHealth("Storage upload BAŞARILI.");
        } catch (storageErr: any) {
          appendHealth("Storage upload BAŞARISIZ.");
          if (storageErr?.code) appendHealth(`Storage hata kodu: ${storageErr.code}`);
          if (storageErr?.message) appendHealth(`Storage mesaj: ${storageErr.message}`);
        }
      } else {
        appendHealth("=== ADIM 3: Storage upload testi ===");
        appendHealth("Atlandı (toggle kapalı).");
      }
      setHealthStatus("Health check tamamlandı.");
    } catch (err: any) {
      console.error("HEALTH_CHECK_ERROR", err);
      appendHealth("=== HATA ===");
      if (err?.code) appendHealth(`Hata kodu: ${err.code}`);
      if (err?.message) appendHealth(`Mesaj: ${err.message}`);
      setHealthStatus("HATA: Health check başarısız.");
    } finally {
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
                <p className="mt-1 text-[11px] text-gray-500">
                  Not: E-posta değiştirmek için bazı durumlarda yeniden giriş yapman gerekebilir.
                </p>
              </div>
              <button
                  type="button"
                  onClick={handleEmailUpdate}
                  disabled={saving || avatarUploading}
                  className="inline-flex items-center justify-center rounded-lg bg-white text-emerald-700 border border-emerald-200 text-xs font-medium px-3 py-2 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  E-postayı güncelle
                </button>

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

              {saveDebug && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                  <div className="text-xs font-medium text-purple-900 mb-1">
                    Save Debug
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-purple-800 max-h-48 overflow-auto">
                    {saveDebug}
                  </pre>
                </div>
              )}

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
              onClick={uiPing}
              className="inline-flex items-center justify-center rounded-lg bg-black text-white text-xs font-medium px-3 py-2 hover:opacity-90 transition"
            >
              UI Ping Test
            </button>

            <button
              type="button"
              onClick={() => {
                const ts = new Date().toISOString();
                setLastClickAt(ts);
                setHealthStatus("Tıklandı, health check başlıyor...");
                setHealthDetails("");
                runHealthCheck();
              }}
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
          
          <div className="pl-1">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={storageTestEnabled}
                onChange={(e) => setStorageTestEnabled(e.target.checked)}
              />
              Storage testini de çalıştır (yavaş olabilir)
            </label>
          </div>
          
          <div className="text-[11px] text-gray-500">
            Ping sayısı: {clickPing} | Son tıklama: {lastClickAt || "-"} | Running: {String(healthRunning)}
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
