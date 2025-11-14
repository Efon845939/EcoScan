'use client';

import { ReactNode, useMemo } from 'react';
import { initializeFirebase } from '@/firebase';
import { FirebaseProvider } from '@/firebase/provider';

/**
 * This provider is responsible for initializing Firebase on the client-side.
 * It ensures that `initializeApp` is called only once.
 * It should be used at the root of your client-side component tree.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    // This hook ensures that Firebase is initialized only once per client session.
    return initializeFirebase();
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
