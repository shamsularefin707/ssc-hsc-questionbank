import { toRich } from '../src/lib/compile';
import type { Cq, Difficulty, Mcq, McqType, RichBi, Source } from '../src/lib/types';

const r = (en: string, bn = en) => toRich({ bn, en });

export function mcq(id: string, o: Partial<{ chapter: string; topics: string[]; difficulty: Difficulty; mcq_type: McqType; stimulus_id: string; source: Source }> = {}): Mcq<RichBi> {
  return {
    id, kind: 'mcq', level: 'ssc', subject: 'physics', chapter: o.chapter ?? '01-a', topics: o.topics ?? ['t1'],
    difficulty: o.difficulty ?? 'easy', source: o.source ?? { kind: 'original' }, status: 'reviewed',
    mcq_type: o.mcq_type ?? (o.stimulus_id ? 'ovinno' : 'gyanmulok'), stimulus_id: o.stimulus_id,
    stem: r(`Stem ${id}`), options: [r('A'), r('B'), r('C'), r('D')], answer: 0, explanation: r('Because'),
  };
}

export function cq(id: string, o: Partial<{ chapter: string; topics: string[]; difficulty: Difficulty }> = {}): Cq<RichBi> {
  const p = { question: r('Q'), solution: r('S') };
  return {
    id, kind: 'cq', level: 'ssc', subject: 'physics', chapter: o.chapter ?? '01-a', topics: o.topics ?? ['t1'],
    difficulty: o.difficulty ?? 'easy', source: { kind: 'original' }, status: 'reviewed',
    stimulus: r(`Stimulus ${id}`), parts: { ka: p, kha: p, ga: p, gha: p },
  };
}
