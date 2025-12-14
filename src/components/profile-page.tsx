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
import {
  useFirebase,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut, sendEmailVerification, updateProfile } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { ChevronLeft, User, LogOut, Award, Loader2, MailCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

type ProfilePageProps = {
  onBack: () => void;
};

export function ProfilePageContent({ onBack }: ProfilePageProps) {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [userProfile, user]);

  const handleSave = async () => {
    if (!userProfileRef || !user || !auth) return;
    setIsSaving(true);
    try {
      // Update both Firestore and Auth profile
      await updateDocumentNonBlocking(userProfileRef, { displayName });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      toast({
        title: t('profile_profile_updated_title'),
        description: t('profile_profile_updated_desc'),
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setIsVerifying(true);
    try {
        await sendEmailVerification(user);
        toast({
            title: t('profile_verify_sent_title'),
            description: t('profile_verify_sent_desc')
        })
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: t('common_error'),
            description: error.message || t('profile_verify_send_failed')
        })
    } finally {
        setIsVerifying(false);
    }
  }

  const handleSignOut = () => {
    if (!auth) return;
    signOut(auth).then(() => {
        toast({ title: t('profile_signed_out_title'), description: t('profile_signed_out_desc') })
    }).catch((error) => {
        console.error("Sign out error", error);
        toast({variant: 'destructive', title: t('profile_sign_out_error_title'), description: t('profile_sign_out_error_desc')})
    });
  };

  if (isProfileLoading || isUserLoading) {
    return <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="relative flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-0"
            onClick={onBack}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('profile_back')}
          </Button>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <User />
            {t('profile_title')}
          </CardTitle>
        </div>
        <CardDescription className="text-center pt-2">
          {t('profile_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center space-x-4 rounded-full border bg-card p-4 shadow-sm">
          <Award className="h-8 w-8 text-yellow-500" />
          <span className="text-2xl font-bold">
            {userProfile?.totalPoints ?? 0}
          </span>
          <span className="text-base text-muted-foreground">{t('profile_total_points')}</span>
        </div>

        {user && !user.emailVerified && (
            <Alert>
                <MailCheck className="h-4 w-4" />
                <AlertTitle>{t('profile_verify_title')}</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    {t('profile_verify_desc')}
                    <Button variant="secondary" size="sm" onClick={handleSendVerification} disabled={isVerifying}>
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('profile_resend')}
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName">{t('profile_display_name')}</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your Name"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('profile_email')}</Label>
          <Input value={user?.email ?? 'Not available'} disabled />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t('profile_save')}
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2" />
          {t('profile_sign_out')}
        </Button>
      </CardFooter>
    </Card>
    </div>
  );
}
