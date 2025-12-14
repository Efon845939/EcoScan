// app/profile/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ProfilePageContent } from '@/components/profile-page';

export default function ProfilePage() {
  const router = useRouter();

  return (
    <ProfilePageContent
      onBack={() => router.push('/')}
    />
  );
}
