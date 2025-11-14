'use client';

import { useState, useEffect, ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { TranslationProvider } from '@/hooks/use-translation';

export function RootProviders({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  }

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <FirebaseClientProvider>
      <TranslationProvider language={language} setLanguage={handleSetLanguage}>
        {children}
      </TranslationProvider>
    </FirebaseClientProvider>
  );
}
