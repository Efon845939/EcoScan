"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { en } from '@/lib/locales';

// The shape of the context
interface TranslationContextType {
  translations: Record<string, any>;
  t: (key: string, options?: Record<string, string | number>) => string;
}

// Create the context with a default value
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// The provider component
export function TranslationProvider({
  children,
  language,
}: {
  children: ReactNode;
  language: string;
}) {
  const [translations, setTranslations] = useState(en);

  useEffect(() => {
    async function loadTranslations() {
      try {
        const localeModule = await import(`@/lib/locales/${language}.json`);
        setTranslations(localeModule.default);
      } catch (error) {
        console.warn(`Could not load locale for ${language}, defaulting to English.`);
        setTranslations(en);
      }
    }
    loadTranslations();
  }, [language]);

  const t = (key: string, options: Record<string, string | number> = {}) => {
    const keys = key.split('.');
    let text = translations;

    for (const k of keys) {
      if (text && typeof text === 'object' && k in text) {
        text = text[k];
      } else {
        // Fallback to English if key not found
        let fallbackText = en;
        for (const fk of keys) {
             if (fallbackText && typeof fallbackText === 'object' && fk in fallbackText) {
                fallbackText = fallbackText[fk];
             } else {
                return key; // Return the key if not found in fallback either
             }
        }
        text = fallbackText;
        break;
      }
    }

    let final_text = String(text);
    for(const option in options) {
        final_text = final_text.replace(`{${option}}`, String(options[option]));
    }
    
    return final_text;
  };

  return (
    <TranslationContext.Provider value={{ translations, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

// The custom hook
export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
