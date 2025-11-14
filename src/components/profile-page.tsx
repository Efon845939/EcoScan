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
import {
  useFirebase,
  useUser,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { ChevronLeft, User, LogOut, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ProfilePageProps = {
  onBack: () => void;
};

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [userProfile, user]);

  const handleSave = async () => {
    if (!userProfileRef) return;
    setIsSaving(true);
    try {
      await updateDocumentNonBlocking(userProfileRef, { displayName });
      toast({
        title: 'Profile Updated',
        description: 'Your display name has been saved.',
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

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
        // Sign-out successful.
        // Handled by the onAuthStateChanged listener in the provider
    }).catch((error) => {
        // An error happened.
        console.error("Sign out error", error);
        toast({variant: 'destructive', title: "Sign Out Error", description: "Failed to sign out."})
    });
  };

  return (
    <Card className="w-full">
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
        <CardDescription className="text-center pt-2">
          View and manage your account details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center space-x-4 rounded-full border bg-card p-4 shadow-sm">
          <Award className="h-8 w-8 text-yellow-500" />
          <span className="text-2xl font-bold">
            {userProfile?.totalPoints ?? 0}
          </span>
          <span className="text-base text-muted-foreground">Total Points</span>
        </div>

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
          <Input value={user?.email ?? 'Not available'} disabled />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2" />
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
}
