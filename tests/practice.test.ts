import { expect, test } from 'vitest';
import { scorePractice } from '../src/lib/practice';
import { mcq } from './helpers';

test('scorePractice counts answered and correct (answer index 0 in helpers)', () => {
  const qs = [mcq('a'), mcq('b'), mcq('c')];
  expect(scorePractice(qs, {})).toEqual({ correct: 0, answered: 0, total: 3, done: false });
  expect(scorePractice(qs, { a: 0, b: 2 })).toEqual({ correct: 1, answered: 2, total: 3, done: false });
  expect(scorePractice(qs, { a: 0, b: 2, c: 0 })).toEqual({ correct: 2, answered: 3, total: 3, done: true });
});

test('answers for questions outside the set are ignored', () => {
  expect(scorePractice([mcq('a')], { zzz: 0 })).toEqual({ correct: 0, answered: 0, total: 1, done: false });
});

test('an empty set is never done', () => {
  expect(scorePractice([], {}).done).toBe(false);
});

test('stimulusLeaders marks only the first question of each shared-stimulus set', async () => {
  const { stimulusLeaders } = await import('../src/lib/practice');
  const qs = [mcq('a'), mcq('p1', { stimulus_id: 's' }), mcq('p2', { stimulus_id: 's' }), mcq('q1', { stimulus_id: 's', chapter: '02-b' })];
  expect([...stimulusLeaders(qs)]).toEqual(['p1', 'q1']);
});
