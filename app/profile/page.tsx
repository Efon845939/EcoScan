// app/profile/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";

type Profile = {
  username: string;
  email: string;
  displayName: string;
  region: string;
  bio: string;
};

type Impact = {
  totalPoints: number;
  monthPoints: number;
  updatedAt: number | null;
};

const PROFILE_KEY = "ecoscan_profile";
const IMPACT_KEY = "eco_local_impact"; // Daha önce impact için kullandığımız key ile uyumlu

const defaultProfile: Profile = {
  username: "",
  email: "",
  displayName: "",
  region: "",
  bio: "",
};

const defaultImpact: Impact = {
  totalPoints: 0,
  monthPoints: 0,
  updatedAt: null,
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
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // umursama
  }
}

function loadImpactFromLS(): Impact {
  if (typeof window === "undefined") return defaultImpact;
  try {
    const raw = window.localStorage.getItem(IMPACT_KEY);
    return raw ? { ...defaultImpact, ...(JSON.parse(raw) as Impact) } : defaultImpact;
  } catch {
    return defaultImpact;
  }
}

function formatDate(ts: number | null) {
  if (!ts) return "Hiç güncellenmedi";
  const d = new Date(ts);
  return d.toLocaleString("tr-TR"); // TR formatı
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [impact, setImpact] = useState<Impact>(defaultImpact);
  const [status, setStatus] = useState<string>("Değişiklik yapılmadı.");
  const [isSaving, setIsSaving] = useState(false);

  // İlk yüklemede localStorage'tan oku
  useEffect(() => {
    setProfile(loadProfileFromLS());
    setImpact(loadImpactFromLS());
  }, []);

  function handleChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik var, henüz kaydedilmedi.");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Şimdilik sadece localStorage'a yazıyoruz
      saveProfileToLS(profile);
      setStatus("Profil kaydedildi (şu an localStorage üzerinde).");
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Başlık */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              EcoScan Rewards – Profil
            </h1>
            <p className="text-sm text-gray-600">
              Hesap bilgilerini düzenle ve EcoScan istatistiklerini görüntüle.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol panel: profil kartı */}
          <section className="lg:col-span-1 bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
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
                <span className="text-gray-500">Bölge:</span>
                <span className="font-medium">
                  {profile.region || "-"}
                </span>
              </div>
            </div>

            {profile.bio && (
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="font-semibold mb-1 text-gray-700">Hakkında</div>
                <p className="whitespace-pre-wrap break-words">{profile.bio}</p>
              </div>
            )}
          </section>

          {/* Sağ panel: stats + form */}
          <section className="lg:col-span-2 space-y-5">
            {/* İstatistik kutuları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/90 border border-emerald-100 p-4 shadow-sm">
                <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  Toplam Puan
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {impact.totalPoints ?? 0}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Tüm zamanlar EcoScan puanın.
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-emerald-100 p-4 shadow-sm">
                <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  Bu Ayki Puan
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">
                  {impact.monthPoints ?? 0}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Bu ay topladığın puan.
                </div>
              </div>

              <div className="rounded-xl bg-white/90 border border-emerald-100 p-4 shadow-sm">
                <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  Son Güncelleme
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {formatDate(impact.updatedAt)}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  İstatistiklerin en son güncellenme zamanı.
                </div>
              </div>
            </div>

            {/* Profil düzenleme formu */}
            <div className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Profil bilgilerini düzenle
              </h2>
              <p className="text-xs text-gray-500">
                Buradaki bilgiler sadece bu cihazda saklanır. Sunucu tarafı bağlantısı
                daha sonra eklenecektir.
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
                      Bölge / Şehir
                    </label>
                    <input
                      type="text"
                      value={profile.region}
                      onChange={(e) => handleChange("region", e.target.value)}
                      placeholder="örn. İstanbul, Ankara, İzmir..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hakkında (isteğe bağlı)
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    rows={3}
                    placeholder="Kendin hakkında kısa bir not bırakabilirsin..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
