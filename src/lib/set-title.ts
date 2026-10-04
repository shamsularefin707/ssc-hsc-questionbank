// Title used for printed and exported sets, e.g. "SSC Physics · Question set".
import type { Lang, SubjectManifest } from './types';

const LEVEL = { ssc: { bn: 'এসএসসি', en: 'SSC' }, hsc: { bn: 'এইচএসসি', en: 'HSC' } } as const;
const SET = { bn: 'প্রশ্নসেট', en: 'Question set' } as const;

export const setTitle = (m: Pick<SubjectManifest, 'level' | 'title'>, lang: Lang) => `${LEVEL[m.level][lang]} ${m.title[lang]} · ${SET[lang]}`;
