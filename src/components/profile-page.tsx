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
import {
  signOut,
  sendEmailVerification,
  updateProfile,
  updateEmail,
} from 'firebase/auth';
import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  User,
  LogOut,
  Award,
  Loader2,
  MailCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ProfilePageProps = {
  onBack: () => void;
};

export function ProfilePageContent({ onBack }: ProfilePageProps) {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } =
    useDoc(userProfileRef);

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [emailValue, setEmailValue] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }

    // Keep email editor in sync with auth email (used for 'Update Email')
    const e = (user?.email || '').trim().toLowerCase();
    setEmailValue(e);
    setOriginalEmail(e);
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
        title: 'Profile Updated',
        description: 'Your display name has been saved.',
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update your profile.',
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
        title: 'Verification Email Sent',
        description: 'Please check your inbox to verify your email address.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send verification email.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!userProfileRef || !auth?.currentUser) return;

    const newEmail = emailValue.trim().toLowerCase();
    if (!newEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Enter a valid email address.',
      });
      return;
    }
    if (!emailChanged) {
      toast({ title: 'No changes', description: 'Email did not change.' });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await updateEmail(auth.currentUser, newEmail);
      // Keep Firestore profile in sync
      await updateDocumentNonBlocking(userProfileRef, { email: newEmail });
      setOriginalEmail(newEmail);
      toast({
        title: 'Email Updated',
        description: 'Your sign-in email was updated.',
      });
    } catch (err: any) {
      console.error('EMAIL_UPDATE_ERROR', err);
      if (err?.code === 'auth/requires-recent-login') {
        toast({
          variant: 'destructive',
          title: 'Security check',
          description:
            'Email change requires recent login. Sign out and sign in again, then retry.',
        });
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Failed to update email.',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleSignOut = () => {
    if (!auth) return;
    signOut(auth)
      .then(() => {
        toast({
          title: 'Signed Out',
          description: 'You have been successfully signed out.',
        });
      })
      .catch((error) => {
        console.error('Sign out error', error);
        toast({
          variant: 'destructive',
          title: 'Sign Out Error',
          description: 'Failed to sign out.',
        });
      });
  };

  if (isProfileLoading || isUserLoading) {
    return <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />;
  }

  const emailChanged =
    emailValue.trim().toLowerCase() !== originalEmail.trim().toLowerCase();

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
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <User />
              Your Profile
            </CardTitle>
          </div>
          <CardDescription>Manage your account details and points.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-4 rounded-lg border bg-muted/50 p-4">
            <Award className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold">{userProfile?.totalPoints ?? 0}</p>
            </div>
          </div>

          {user && !user.emailVerified && (
            <Alert>
              <MailCheck className="h-4 w-4" />
              <AlertTitle>Email not verified</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>Please verify your email to secure your account.</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSendVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Resend'
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="you@example.com"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateEmail}
                disabled={!emailChanged || isUpdatingEmail}
                title={!emailChanged ? 'Change the email first' : ''}
              >
                {isUpdatingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update Email
              </Button>
              {!emailChanged ? (
                <span className="text-[11px] text-muted-foreground self-center">
                  Email değişmeden güncelleme yapılamaz.
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Save Changes'
            )}
          </Button>

          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
