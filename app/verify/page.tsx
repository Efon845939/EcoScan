'use client';
import { VerificationCenter } from '@/components/verification-center';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();
  return <VerificationCenter onBack={() => router.push('/')} />;
}
