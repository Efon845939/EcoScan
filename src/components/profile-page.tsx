// src/components/profile-page.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  updateProfile,
  updateEmail,
  sendEmailVerification,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

const SUPPORTED_LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'ru', label: 'RU' },
  { code: 'ar', label: 'AR' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: 'ZH' },
  { code: 'bs', label: 'BS' },
] as const;

type LangCode = (typeof SUPPORTED_LANGS)[number]['code'];

type ProfilePageProps = {
  onBack?: () => void; // opsiyonel
};

type ProfileState = {
  displayName: string;
  email: string;
  photoURL: string;
};

export default function ProfilePageContent({ onBack }: ProfilePageProps) {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();

  const [profile, setProfile] = useState<ProfileState>({
    displayName: '',
    email: '',
    photoURL: '',
  });

  const [originalEmail, setOriginalEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingVerify, setIsRefreshingVerify] = useState(false);
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const activeLang = useMemo(() => ((language || 'en') as LangCode), [language]);

  useEffect(() => {
    async function load() {
      if (!firestore || !user) return;

      try {
        const snap = await getDoc(doc(firestore, 'users', user.uid));
        const data = snap.exists() ? (snap.data() as any) : {};

        const initialEmail = (user.email || '').trim().toLowerCase();
        setOriginalEmail(initialEmail);

        setProfile({
          displayName: (data?.displayName ?? user.displayName ?? '').toString(),
          email: initialEmail,
          photoURL: (data?.photoURL ?? user.photoURL ?? '').toString(),
        });
      } catch (e) {
        toast({
          title: t('common_error'),
          description: t('profile_update_failed'),
          variant: 'destructive',
        });
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore]);

  const onChangeLang = (next: LangCode) => {
    setLanguage(next);
    try {
      window.localStorage.setItem('app-language', next);
    } catch {}
  };

  async function handleUpload(file: File, firebaseUser: User) {
    if (!auth || !firestore) return;
    setIsUploading(true);

    try {
      const storage = getStorage();
      const fileRef = ref(storage, `avatars/${firebaseUser.uid}/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Auth + Firestore
      await updateProfile(firebaseUser, { photoURL: url });
      await setDoc(
        doc(firestore, 'users', firebaseUser.uid),
        { photoURL: url, updatedAt: serverTimestamp() },
        { merge: true }
      );

      setProfile((p) => ({ ...p, photoURL: url }));

      toast({
        title: t('profile_profile_updated_title'),
        description: t('profile_profile_updated_desc'),
      });
    } catch (e) {
      toast({
        title: t('common_error'),
        description: t('profile_update_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!auth || !firestore || !user) return;

    setIsSaving(true);

    try {
      // displayName
      const displayName = profile.displayName.trim();
      await updateProfile(user, { displayName });

      // email (değiştiyse)
      const email = profile.email.trim().toLowerCase();
      if (email && email !== originalEmail) {
        await updateEmail(user, email);
        setOriginalEmail(email);
      }

      await setDoc(
        doc(firestore, 'users', user.uid),
        {
          displayName,
          email: profile.email.trim().toLowerCase(),
          photoURL: profile.photoURL ?? '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: t('profile_profile_updated_title'),
        description: t('profile_profile_updated_desc'),
      });
    } catch (e) {
      toast({
        title: t('common_error'),
        description: t('profile_update_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshVerification() {
    if (!user) return;
    setIsRefreshingVerify(true);
    try {
      await user.reload();
      toast({
        title: t('profile_verify_status_refreshed_title'),
        description: user.emailVerified ? t('profile_verified_now') : t('profile_not_verified_yet'),
      });
    } catch (e) {
      toast({
        title: t('common_error'),
        description: t('profile_verify_refresh_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingVerify(false);
    }
  }

  async function resendVerification() {
    if (!user) return;
    setIsSendingVerify(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: t('profile_verify_sent_title'),
        description: t('profile_verify_sent_desc'),
      });
    } catch (e) {
      toast({
        title: t('common_error'),
        description: t('profile_verify_send_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingVerify(false);
    }
  }

  async function handleSignOut() {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: t('profile_signed_out_title'),
        description: t('profile_signed_out_desc'),
      });
      router.push('/');
    } catch (e) {
      toast({
        title: t('profile_sign_out_error_title'),
        description: t('profile_sign_out_error_desc'),
        variant: 'destructive',
      });
    }
  }

  if (isUserLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{t('common_loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 space-y-3">
        <Alert>
          <AlertTitle>{t('common_error')}</AlertTitle>
          <AlertDescription>{t('profile_email_not_available')}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/auth/login')}>{t('profile_back')}</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('profile_title')}</h1>
          <p className="text-sm text-muted-foreground">{t('profile_desc')}</p>
        </div>

        {/* Language switcher */}
        <div className="shrink-0">
          <Label className="text-xs">{t('language_label')}</Label>
          <select
            value={activeLang}
            onChange={(e) => onChangeLang(e.target.value as LangCode)}
            className="mt-1 text-sm rounded-md border px-2 py-1 bg-background"
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

      <Card>
        <CardHeader>
          <CardTitle>{t('profile_total_points')}</CardTitle>
          <CardDescription>{t('profile_verify_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('profile_display_name')}</Label>
            <Input
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              placeholder={t('profile_display_name_placeholder')}
            />
          </div>

          <div>
            <Label>{t('profile_email')}</Label>
            <Input
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div>
            <Label>Photo</Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file, user);
                }}
              />
              {isUploading ? (
                <span className="text-xs text-muted-foreground">{t('common_loading')}</span>
              ) : null}
            </div>
          </div>

          {!user.emailVerified ? (
            <Alert>
              <AlertTitle>{t('profile_verify_title')}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{t('profile_not_verified_yet')}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={resendVerification}
                    disabled={isSendingVerify}
                  >
                    {t('profile_resend')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={refreshVerification}
                    disabled={isRefreshingVerify}
                  >
                    {t('profile_verified_now')}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>{t('profile_verify_title')}</AlertTitle>
              <AlertDescription>{t('profile_verified_now')}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            <Button onClick={() => (onBack ? onBack() : router.push('/'))}>
              {t('profile_back')}
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              {t('profile_sign_out')}
            </Button>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common_loading') : t('profile_save')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
