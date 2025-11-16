// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";

type Profile = {
  username: string;
  email: string;
  displayName: string;
  about: string;
  password: string; // Şimdilik sadece mock; gerçek sistemde hash olacak.
};

const PROFILE_KEY = "ecoscan_profile_basic";

const defaultProfile: Profile = {
  username: "",
  email: "",
  displayName: "",
  about: "",
  password: "",
};

function loadProfileFromLS(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? { ...defaultProfile, ...(JSON.parse(raw) as Profile) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

function saveProfileToLS(profile: Profile) {
  if (typeof window === "undefined") return;
  try {
    // Not: gerçek sistemde şifreyi böyle saklamayacağız.
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // boş ver
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [status, setStatus] = useState<string>("Değişiklik yapılmadı.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfile(loadProfileFromLS());
  }, []);

  function handleChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik var, henüz kaydedilmedi.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      saveProfileToLS(profile);
      setStatus("Profil kaydedildi (şu an sadece bu cihazda).");
    } catch (err: any) {
      setStatus(`HATA: ${err?.message || "Profil kaydedilirken bir sorun oluştu."}`);
    } finally {
      setIsSaving(false);
    }
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
        {/* Üst başlık */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              EcoScan Rewards – Profil
            </h1>
            <p className="text-sm text-gray-600">
              Hesap bilgilerini düzenle. Puan, bölge ve diğer ayarlar ayrı sayfalardan yönetilir.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Ana Lobiye Dön
          </a>
        </header>

        {/* Ana içerik: sol avatar, sağ form */}
        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
          {/* Sol panel: avatar + özet */}
          <section className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                {initials}
              </div>
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
                <div className="font-semibold mb-1 text-gray-700">Hakkında</div>
                <p className="whitespace-pre-wrap break-words">{profile.about}</p>
              </div>
            )}
          </section>

          {/* Sağ panel: profil formu */}
          <section className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Hesap bilgilerini düzenle
            </h2>
            <p className="text-xs text-gray-500">
              Buradaki bilgiler sadece bu cihazda saklanır. Gerçek şifre sistemi ve sunucu tarafı daha
              sonra eklenecektir.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="sen@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Şifre (mock)
                  </label>
                  <input
                    type="password"
                    value={profile.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Not: Şifre şu an sadece örnek olarak tutuluyor. Gerçek projede burada güvenli bir sistem olacak.
                  </p>
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

              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {status}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isSaving ? "Kaydediliyor..." : "Profili kaydet"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
