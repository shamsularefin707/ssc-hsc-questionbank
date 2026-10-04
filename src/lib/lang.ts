// Global question/UI language, persisted per browser and shared across islands.
import { useEffect, useState } from 'preact/hooks';
import { storage } from './storage';
import type { Lang } from './types';

const KEY = 'qb:lang';
const EVENT = 'qb:lang';

export function getLang(): Lang {
  const v = storage.get<unknown>(KEY, 'bn');
  return v === 'en' ? 'en' : 'bn';
}

export function setLang(lang: Lang) {
  storage.set(KEY, lang); // if storage is blocked the choice lasts for this page only
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent<Lang>(EVENT, { detail: lang }));
}

/** The <html lang> the inline head script already set, so islands don't flash Bangla first. */
const initialLang = (): Lang => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'bn');

export function useLang(): Lang {
  const [lang, set] = useState<Lang>(initialLang);
  useEffect(() => {
    set(getLang());
    const on = (e: Event) => set((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return lang;
}
