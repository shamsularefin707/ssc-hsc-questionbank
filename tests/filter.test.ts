import { describe, expect, test } from 'vitest';
import { filterQuestions, groupForDisplay } from '../src/lib/filter';
import { cq, mcq } from './helpers';

const pool = [
  mcq('m1', { difficulty: 'easy', topics: ['speed'] }),
  mcq('m2', { difficulty: 'hard', topics: ['speed'], mcq_type: 'bohupodi' }),
  mcq('m3', { difficulty: 'easy', topics: ['graphs'], mcq_type: 'onudhabon', chapter: '02-b' }),
  mcq('o1', { difficulty: 'easy', topics: ['fall'], stimulus_id: 's1' }),
  mcq('o2', { difficulty: 'hard', topics: ['fall'], stimulus_id: 's1' }),
  cq('c1', { difficulty: 'easy', topics: ['speed'] }),
  mcq('b1', { difficulty: 'medium', source: { kind: 'board', exam: 'ssc', board: 'dhaka', year: 2023 } }),
];
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);

describe('filterQuestions', () => {
  test('ANDs across fields', () => {
    expect(ids(filterQuestions(pool, { difficulty: ['easy'], topics: ['speed'] }))).toEqual(['m1', 'c1']);
  });

  test('ORs within a field', () => {
    expect(ids(filterQuestions(pool, { mcqType: ['bohupodi', 'onudhabon'] }))).toEqual(['m2', 'm3']);
  });

  test('empty filters return everything', () => {
    expect(filterQuestions(pool, {})).toHaveLength(pool.length);
    expect(filterQuestions(pool, { difficulty: [] })).toHaveLength(pool.length);
  });

  test('kind, chapter and source filters', () => {
    expect(ids(filterQuestions(pool, { kind: ['cq'] }))).toEqual(['c1']);
    expect(ids(filterQuestions(pool, { chapters: ['02-b'] }))).toEqual(['m3']);
    expect(ids(filterQuestions(pool, { source: ['board'] }))).toEqual(['b1']);
  });

  test('an ovinno set is kept whole when one member matches', () => {
    expect(ids(filterQuestions(pool, { difficulty: ['hard'] }))).toEqual(['m2', 'o1', 'o2']);
  });

  test('search hits restrict results when q is set', () => {
    expect(ids(filterQuestions(pool, { q: 'x' }, new Set(['m3', 'c1'])))).toEqual(['m3', 'c1']);
  });
});

describe('groupForDisplay', () => {
  test('groups ovinno members under one stimulus in first-appearance order', () => {
    const grouped = groupForDisplay([pool[0], pool[3], pool[5], pool[4]]);
    expect(grouped.map((g) => ('stimulusId' in g ? `S:${g.stimulusId}:${ids(g.items)}` : g.id))).toEqual(['m1', 'S:s1:o1,o2', 'c1']);
  });
});
