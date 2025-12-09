
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
import { doc, setDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!isUserLoading && !firebaseUser) {
      router.replace("/auth/login");
    }
  }, [isUserLoading, firebaseUser, router]);

  useEffect(() => {
    if (firebaseUser) {
      // Fetch Firestore profile data
      const fetchProfile = async () => {
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let userProfileData = {};
        if (userDocSnap.exists()) {
          userProfileData = userDocSnap.data();
        }

        setProfile({
          username: (userProfileData as any).username ?? "",
          displayName: (userProfileData as any).displayName ?? firebaseUser.displayName ?? "",
          email: firebaseUser.email || "",
          about: (userProfileData as any).about ?? "",
          photoURL: (userProfileData as any).photoURL ?? firebaseUser.photoURL ?? null,
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

      await updateProfile(firebaseUser, {
        displayName: profile.displayName.trim() || undefined,
        photoURL: profile.photoURL || undefined,
      });

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
    if (!firebaseUser) {
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
      await setDoc(userProfileRef, { photoURL: url, updatedAt: new Date() }, { merge: true });

      await updateProfile(firebaseUser, { photoURL: url });

      setStatus("Profil fotoğrafı güncellendi.");
    } catch (err: any) {
      console.error("AVATAR_UPLOAD_ERROR", err);
      setStatus("HATA: Profil fotoğrafı yüklenemedi.");
    } finally {
      setAvatarUploading(false);
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
              Hesap bilgilerini düzenle. Puan, bölge ve diğer ayarlar ayrı sayfalardan yönetilir.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
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
                    <Loader2 className="mr-1 h-3 w-3 animate-spin"/>
                    <span>Yükleniyor...</span>
                 </div>
              )}
              <div>
                <div className="font-semibold text-gray-900">
                  {profile.displayName || profile.username || "Henüz ad ayarlanmadı"}
                </div>
                <div className="text-xs text-gray-500">
                  {profile.email || "E-posta henüz kaydedilmedi"}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Kullanıcı adı:</span>
                <span className="font-medium">{profile.username || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Görünen ad:</span>
                <span className="font-medium">{profile.displayName || "-"}</span>
              </div>
            </div>

            {profile.about && (
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="font-semibold mb-1 text-gray-700">Hakkında</div>
                <p className="whitespace-pre-wrap break-words">{profile.about}</p>
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
                    onChange={(e) => handleChange("username", e.target.value)}
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
                    onChange={(e) => handleChange("displayName", e.target.value)}
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
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                {saving ? "Kaydediliyor..." : "Profili kaydet"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

