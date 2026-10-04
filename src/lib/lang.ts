// Global question/UI language, persisted per browser and shared across islands.
import { useEffect, useState } from 'preact/hooks';
import type { Lang } from './types';

const KEY = 'qb:lang';
const EVENT = 'qb:lang';

export function getLang(): Lang {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    if (v === 'en' || v === 'bn') return v;
  } catch {
    /* storage blocked: fall through */
  }
  return 'bn';
}

export function setLang(lang: Lang) {
  try {
    globalThis.localStorage?.setItem(KEY, lang);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent<Lang>(EVENT, { detail: lang }));
}

export function useLang(): Lang {
  const [lang, set] = useState<Lang>('bn');
  useEffect(() => {
    set(getLang());
    const on = (e: Event) => set((e as CustomEvent<Lang>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return lang;
}
