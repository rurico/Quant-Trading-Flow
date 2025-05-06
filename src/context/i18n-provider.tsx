// src/context/i18n-provider.tsx
'use client';

import type { ReactNode} from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import type { Locale, Translations, Language } from '@/types/flow';
import { translations, defaultLocale, availableLanguages } from '@/locales/config';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  availableLanguages: Language[];
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && availableLanguages.some(lang => lang.code === storedLocale)) {
      return storedLocale;
    }
    // 基本的浏览器语言检测（可以改进）
    const browserLang = navigator.language.split('-')[0];
    const matchedLang = availableLanguages.find(lang => lang.code.startsWith(browserLang));
    if (matchedLang) {
      return matchedLang.code;
    }
  }
  return defaultLocale;
};


export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, _setLocale] = useState<Locale>(defaultLocale); // 使用默认值初始化，将在 useEffect 中更新
  const [loadedTranslations, setLoadedTranslations] = useState<Translations>(translations[defaultLocale]);

  useEffect(() => {
    const initialLocale = getInitialLocale();
    _setLocale(initialLocale);
    setLoadedTranslations(translations[initialLocale]);
  }, []);


  const setLocale = useCallback((newLocale: Locale) => {
    if (availableLanguages.some(lang => lang.code === newLocale)) {
      _setLocale(newLocale);
      setLoadedTranslations(translations[newLocale]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', newLocale);
      }
    } else {
      console.warn(`语言环境 '${newLocale}' 不可用。回退到默认值。`);
      _setLocale(defaultLocale);
      setLoadedTranslations(translations[defaultLocale]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', defaultLocale);
      }
    }
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let current: any = loadedTranslations;
    let translation: string | undefined = undefined;

    for (const k of keys) {
      if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, k)) {
        current = current[k];
      } else {
        current = undefined; // 路径中断
        break;
      }
    }

    if (typeof current === 'string') {
      translation = current;
    }
    
    let result = translation || key; // 如果未找到翻译，则回退到键本身

    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        const regex = new RegExp(`{{${placeholder}}}`, 'g');
        result = result.replace(regex, String(replacements[placeholder]));
      });
    }
    return result;
  }, [loadedTranslations]);

  const value = {
    locale,
    setLocale,
    t,
    availableLanguages
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}