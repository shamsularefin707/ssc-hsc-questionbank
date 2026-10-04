// Question filtering for the bank page and the set builder.
import type { CompiledQuestion, Difficulty, Mcq, McqType, RichBi, Source } from './types';

export interface Filters {
  chapters?: string[];
  topics?: string[];
  difficulty?: Difficulty[];
  kind?: ('mcq' | 'cq')[];
  mcqType?: McqType[];
  source?: Source['kind'][];
  q?: string;
}

const any = <T>(list: T[] | undefined, pred: (v: T) => boolean) => !list?.length || list.some(pred);

function matches(q: CompiledQuestion, f: Filters, hits?: Set<string>): boolean {
  return (
    any(f.chapters, (c) => q.chapter === c) &&
    any(f.topics, (t) => q.topics.includes(t)) &&
    any(f.difficulty, (d) => q.difficulty === d) &&
    any(f.kind, (k) => q.kind === k) &&
    any(f.mcqType, (t) => q.kind === 'mcq' && q.mcq_type === t) &&
    any(f.source, (s) => q.source.kind === s) &&
    (!f.q?.trim() || !hits || hits.has(q.id))
  );
}

/**
 * Filters questions, preserving input order. If any question of an অভিন্ন তথ্যভিত্তিক set
 * matches, every question of that set is kept so the set never shows half its questions.
 */
export function filterQuestions(qs: CompiledQuestion[], f: Filters, searchHits?: Set<string>): CompiledQuestion[] {
  const keptSets = new Set<string>();
  const direct = new Set<string>();
  for (const q of qs) {
    if (!matches(q, f, searchHits)) continue;
    direct.add(q.id);
    if (q.kind === 'mcq' && q.stimulus_id) keptSets.add(setKey(q));
  }
  return qs.filter((q) => direct.has(q.id) || (q.kind === 'mcq' && !!q.stimulus_id && keptSets.has(setKey(q))));
}

const setKey = (q: Mcq<RichBi>) => `${q.chapter}/${q.stimulus_id}`;

export type DisplayItem = CompiledQuestion | { stimulusId: string; chapter: string; items: Mcq<RichBi>[] };

/** Groups ovinno questions under their shared stimulus, at the position of the first member. */
export function groupForDisplay(qs: CompiledQuestion[]): DisplayItem[] {
  const out: DisplayItem[] = [];
  const groups = new Map<string, { stimulusId: string; chapter: string; items: Mcq<RichBi>[] }>();
  for (const q of qs) {
    if (q.kind === 'mcq' && q.stimulus_id) {
      const key = setKey(q);
      let g = groups.get(key);
      if (!g) {
        g = { stimulusId: q.stimulus_id, chapter: q.chapter, items: [] };
        groups.set(key, g);
        out.push(g);
      }
      g.items.push(q);
    } else out.push(q);
  }
  return out;
}
