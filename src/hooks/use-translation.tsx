
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { en } from '@/lib/locales';

// The shape of the context
interface TranslationContextType {
  translations: Record<string, any>;
  t: (key: string, options?: Record<string, string | number | boolean | object>) => any;
  language: string;
  setLanguage: (language: string) => void;
}

// Create the context with a default value
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// The provider component
export function TranslationProvider({
  children
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState('en');
  const [translations, setTranslations] = useState(en);

  // 1. On mount, read language from localStorage (client-side only)
  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem('app-language');
      if (storedLang) {
        setLanguageState(storedLang);
      }
    } catch (e) {
      console.warn("Could not access localStorage to get language.");
    }
  }, []);

  // 2. When language state changes, update translations and html attributes (client-side only)
  useEffect(() => {
    const html = document.documentElement;

    if (language === 'ar') {
        html.setAttribute('dir', 'rtl');
    } else {
        html.setAttribute('dir', 'ltr');
    }
    html.setAttribute('lang', language);
    
    // Load translation file
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

  // Function to set language and persist it
  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app-language', lang);
    } catch (e) {
       console.warn("Could not access localStorage to set language.");
    }
  }

  const t = (key: string, options: Record<string, string | number | boolean | object> = {}) => {
    const keys = key.split('.');
    let text: any = translations;

    for (const k of keys) {
      if (text && typeof text === 'object' && k in text) {
        text = text[k];
      } else {
        // Fallback to English if key not found
        let fallbackText: any = en;
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

    if (options.returnObjects) {
      return text;
    }

    if (typeof text !== 'string') {
        return key; // Return key if translation is not a string
    }

    let final_text = String(text);
    for(const option in options) {
        if (option !== 'returnObjects') {
            final_text = final_text.replace(`{${option}}`, String(options[option]));
        }
    }
    
    return final_text;
  };

  return (
    <TranslationContext.Provider value={{ translations, t, language, setLanguage }}>
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
