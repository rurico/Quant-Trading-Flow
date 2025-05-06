import type { Locale, Translations, Language } from '@/types/flow';
import en from './en.json';
import ja from './ja.json';
import ko from './ko.json';
import zhCN from './zh-CN.json';
import zhHK from './zh-HK.json';
import zhTW from './zh-TW.json';
import ru from './ru.json';
export const defaultLocale: Locale = 'zh-CN';
export const availableLanguages: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-HK', name: '繁體中文 (香港)' },
  { code: 'zh-TW', name: '繁體中文 (台灣)' },
  { code: 'ru', name: 'Русский' },
];
export const translations: Record<Locale, Translations> = {
  en: en as Translations,
  ja: ja as Translations,
  ko: ko as Translations,
  'zh-CN': zhCN as Translations,
  'zh-HK': zhHK as Translations,
  'zh-TW': zhTW as Translations,
  ru: ru as Translations,
};
