// Encodes bank filters in the URL query so views can be shared.
import type { Filters } from './filter';
import type { Difficulty, McqType, Source } from './types';

export type { Filters } from './filter';

const LISTS = {
  chapters: null,
  topics: null,
  difficulty: ['easy', 'medium', 'hard'] as Difficulty[],
  kind: ['mcq', 'cq'] as const,
  mcqType: ['gyanmulok', 'onudhabon', 'bohupodi', 'ovinno'] as McqType[],
  source: ['original', 'board', 'admission'] as Source['kind'][],
} as const;

type ListKey = keyof typeof LISTS;
const ORDER: (ListKey | 'q')[] = ['chapters', 'topics', 'difficulty', 'kind', 'mcqType', 'source', 'q'];
const SLUG = /^[a-z0-9-]+$/;

export function encodeFilters(f: Filters): string {
  const params = new URLSearchParams();
  for (const key of ORDER) {
    if (key === 'q') {
      if (f.q?.trim()) params.set('q', f.q.trim());
      continue;
    }
    const v = f[key];
    if (v?.length) params.set(key, v.join(','));
  }
  const s = params.toString().replace(/%2C/g, ',');
  return s ? `?${s}` : '';
}

export function decodeFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const out: Filters = {};
  for (const key of Object.keys(LISTS) as ListKey[]) {
    const raw = params.get(key);
    if (!raw) continue;
    const allowed = LISTS[key] as readonly string[] | null;
    const values = raw.split(',').filter((v) => (allowed ? allowed.includes(v) : SLUG.test(v)));
    if (values.length) (out as Record<string, string[]>)[key] = values;
  }
  const q = params.get('q')?.trim();
  if (q) out.q = q;
  return out;
}
