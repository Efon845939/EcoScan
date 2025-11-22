
// app/profile/page.tsx
'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser, useDoc, updateDocumentNonBlocking, useFirebase, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { updateProfile as updateAuthProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Profile = {
  username: string;
  email: string;
  displayName: string;
  about: string;
};

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [form, setForm] = useState<Profile>({
    username: "",
    email: "",
    displayName: "",
    about: "",
  });
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [status, setStatus] = useState<string>("Değişiklik yapılmadı.");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/auth/login');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    if (userProfile) {
      setForm({
        username: userProfile.username || '',
        email: userProfile.email || '',
        displayName: userProfile.displayName || '',
        about: userProfile.about || '',
      });
    }
    if (user) {
        setAvatarUrl(user.photoURL);
    }
  }, [userProfile, user]);

  function handleChange(field: keyof Profile, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setStatus("Değişiklik var, henüz kaydedilmedi.");
  }
  
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file || !user) {
          return;
      }
      
      setAvatarUploading(true);
      try {
          const storage = getStorage();
          const avatarRef = ref(storage, `avatars/${user.uid}`);
          await uploadBytes(avatarRef, file);
          const url = await getDownloadURL(avatarRef);

          await updateAuthProfile(user, { photoURL: url });
          if(userProfileRef) {
              await updateDocumentNonBlocking(userProfileRef, { photoURL: url, updatedAt: serverTimestamp() });
          }

          setAvatarUrl(url);
          setStatus("Profil fotoğrafı güncellendi.");
      } catch(err) {
          setStatus("HATA: Profil fotoğrafı yüklenemedi.");
      } finally {
          setAvatarUploading(false);
      }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userProfileRef || !auth.currentUser) return;

    setIsSaving(true);
    setStatus("Kaydediliyor...");
    
    try {
      // 1. Update basic profile info (username, displayName, about)
      const updatedData: Partial<Profile> = {
        username: form.username,
        displayName: form.displayName,
        about: form.about,
      };
      await updateDocumentNonBlocking(userProfileRef, {
        ...updatedData,
        updatedAt: serverTimestamp(),
      });
      if (auth.currentUser.displayName !== form.displayName) {
        await updateAuthProfile(auth.currentUser, { displayName: form.displayName });
      }

      // 2. Handle password change if requested
      if (oldPassword || newPassword || newPasswordAgain) {
        if (!oldPassword || !newPassword || !newPasswordAgain) {
          throw new Error("Şifre değiştirmek için tüm şifre alanlarını doldurun.");
        }
        if (newPassword !== newPasswordAgain) {
          throw new Error("Yeni şifreler birbiriyle eşleşmiyor.");
        }
        if (newPassword.length < 6) {
          throw new Error("Yeni şifre en az 6 karakter olmalıdır.");
        }

        if (!auth.currentUser.email) {
            throw new Error("Mevcut kullanıcının e-postası bulunamadı.")
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);

        setOldPassword("");
        setNewPassword("");
        setNewPasswordAgain("");
        setStatus("Profil ve şifre başarıyla güncellendi.");
      } else {
        setStatus("Profil başarıyla güncellendi.");
      }

    } catch (err: any) {
      let msg = err.message || "Profil güncellenirken bir sorun oluştu.";
      if (err.code === 'auth/wrong-password') {
          msg = "Mevcut şifreniz yanlış."
      }
      setStatus(`HATA: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  const initials =
    (form.displayName || form.username || "ER")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ER";

  if (isUserLoading || isProfileLoading || !user || user.isAnonymous) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4">Profil Yükleniyor...</p>
      </div>
    );
  }

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
          <a
            href="/"
            className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Ana Lobiye Dön
          </a>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
          <section className="bg-white/90 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl overflow-hidden">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Profil fotoğrafı" className="w-full h-full object-cover" />
                    ) : (
                        initials
                    )}
                </div>
                <label className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-emerald-200 text-emerald-700 cursor-pointer shadow-sm hover:bg-emerald-50">
                    ✎
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div>
                <div className="font-semibold text-gray-900">
                  {form.displayName || form.username || "Henüz ad ayarlanmadı"}
                </div>
                <div className="text-xs text-gray-500">
                  {form.email || "E-posta henüz kaydedilmedi"}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Kullanıcı adı:</span>
                <span className="font-medium">
                  {form.username || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Görünen ad:</span>
                <span className="font-medium">
                  {form.displayName || "-"}
                </span>
              </div>
            </div>

            {form.about && (
              <div className="border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="font-semibold mb-1 text-gray-700">Hakkında</div>
                <p className="whitespace-pre-wrap break-words">{form.about}</p>
              </div>
            )}
          </section>

          <section className="bg-white/90 border border-emerald-100 rounded-2xl shadow-sm p-5 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Hesap bilgilerini düzenle
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kullanıcı adı
                  </label>
                  <input
                    type="text"
                    value={form.username}
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
                    value={form.displayName}
                    onChange={(e) => handleChange("displayName", e.target.value)}
                    placeholder="Profilde gözükecek isim"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hakkında (isteğe bağlı)
                </label>
                <textarea
                  value={form.about}
                  onChange={(e) => handleChange("about", e.target.value)}
                  rows={3}
                  placeholder="Kendin hakkında kısa bir not bırakabilirsin..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-4 mt-4 border-t">
                 <h2 className="text-sm font-semibold text-gray-900">
                    Güvenlik
                 </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        E-posta (değiştirilemez)
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                         Şifreyi Değiştir
                        </label>
                        <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Mevcut şifre" className="w-full rounded-lg border-gray-300 text-sm"/>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Yeni şifre" className="w-full rounded-lg border-gray-300 text-sm"/>
                        <input type="password" value={newPasswordAgain} onChange={e => setNewPasswordAgain(e.target.value)} placeholder="Yeni şifre (tekrar)" className="w-full rounded-lg border-gray-300 text-sm"/>
                         <p className="text-[11px] text-gray-500">Değiştirmek istemiyorsanız boş bırakın.</p>
                    </div>
                </div>
              </div>


              <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-h-[36px]">
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

    