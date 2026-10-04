import { describe, expect, test } from 'vitest';
import { mulberry32, shuffle } from '../src/lib/rng';
import { buildSet, decodeSet, encodeSet, type SetRequest } from '../src/lib/set-builder';
import { cq, mcq } from './helpers';

const singles = Array.from({ length: 12 }, (_, i) => mcq(`m${i}`, { difficulty: i % 2 ? 'hard' : 'easy' }));
const cqs = Array.from({ length: 5 }, (_, i) => cq(`c${i}`));
const req = (o: Partial<SetRequest> = {}): SetRequest => ({
  level: 'ssc', subject: 'physics', chapters: ['01-a'], difficulty: [], mcqCount: 5, cqCount: 2, ...o,
});
const ids = (qs: { id: string }[]) => qs.map((q) => q.id);

describe('rng', () => {
  test('mulberry32 is deterministic and in [0, 1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  test('shuffle does not mutate and keeps every element', () => {
    const arr = [1, 2, 3, 4, 5];
    const out = shuffle(arr, mulberry32(1));
    expect(arr).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(arr);
  });
});

describe('buildSet', () => {
  const pool = [...singles, ...cqs];

  test('same seed gives the same set; a different seed changes it', () => {
    const a = buildSet(pool, req(), 7), b = buildSet(pool, req(), 7), c = buildSet(pool, req(), 8);
    expect(ids(a.mcqs)).toEqual(ids(b.mcqs));
    expect(ids(a.cqs)).toEqual(ids(b.cqs));
    expect(ids(a.mcqs)).not.toEqual(ids(c.mcqs));
  });

  test('returns everything that matches and reports a shortfall, never padding', () => {
    const s = buildSet(pool, req({ mcqCount: 50, difficulty: ['hard'] }), 1);
    expect(s.mcqs).toHaveLength(6);
    expect(s.mcqs.every((q) => q.difficulty === 'hard')).toBe(true);
    expect(s.available.mcq).toBe(6);
    expect(s.shortfall).toBe(true);
  });

  test('no shortfall when the pool is big enough', () => {
    const s = buildSet(pool, req(), 3);
    expect(s.mcqs).toHaveLength(5);
    expect(s.cqs).toHaveLength(2);
    expect(s.shortfall).toBe(false);
  });

  test('never splits an ovinno pair', () => {
    const small = [mcq('o1', { stimulus_id: 's' }), mcq('o2', { stimulus_id: 's' }), mcq('single')];
    for (let seed = 0; seed < 20; seed++) {
      expect(ids(buildSet(small, req({ mcqCount: 1, cqCount: 0 }), seed).mcqs)).toEqual(['single']);
      const two = ids(buildSet(small, req({ mcqCount: 2, cqCount: 0 }), seed).mcqs);
      expect(two.includes('o1')).toBe(two.includes('o2'));
    }
  });

  test('ovinno members stay adjacent and in order', () => {
    const small = [mcq('a'), mcq('o1', { stimulus_id: 's' }), mcq('b'), mcq('o2', { stimulus_id: 's' })];
    for (let seed = 0; seed < 20; seed++) {
      const out = ids(buildSet(small, req({ mcqCount: 4, cqCount: 0 }), seed).mcqs);
      expect(out.indexOf('o2') - out.indexOf('o1')).toBe(1);
    }
  });

  test('mcqTypes and topics restrict the pool', () => {
    const p = [mcq('x', { mcq_type: 'bohupodi', topics: ['t2'] }), mcq('y', { topics: ['t2'] }), mcq('z', { mcq_type: 'bohupodi' })];
    expect(ids(buildSet(p, req({ mcqTypes: ['bohupodi'], topics: ['t2'], cqCount: 0 }), 1).mcqs)).toEqual(['x']);
  });
});

describe('encodeSet / decodeSet', () => {
  test('round-trips', () => {
    const r = req({ topics: ['t1', 't2'], difficulty: ['easy', 'medium'], mcqTypes: ['ovinno'] });
    expect(decodeSet(encodeSet(r, 123456))).toEqual({ req: r, seed: 123456 });
  });

  test('rejects junk', () => {
    expect(decodeSet('?junk')).toBeNull();
    expect(decodeSet('?level=ssc&subject=physics&chapters=01-a&mcq=abc&cq=1&seed=1')).toBeNull();
  });
});
