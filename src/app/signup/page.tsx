// This is a placeholder for the signup page.
// The login page now links here.
'use client';

import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md text-center">
                <h1 className="text-2xl font-bold">Sign Up Page</h1>
                <p className="text-slate-500">This is where the registration form will go.</p>
                <button
                    type="button"
                    className="mt-4 font-semibold text-green-700 hover:underline"
                    onClick={() => router.push('/login')}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}
