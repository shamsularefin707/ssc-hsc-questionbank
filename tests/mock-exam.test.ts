import { describe, expect, test } from 'vitest';
import { MOCK, advance, createMock, cqScore, remainingSeconds, scoreMcq, toggleCq } from '../src/lib/mock-exam';
import { mcq } from './helpers';

const T0 = 1_700_000_000_000;
const fresh = () => createMock('ssc', 'physics', ['02-motion'], 42, T0);

describe('mock exam timing', () => {
  test('MOCK matches the board format', () => {
    expect(MOCK).toEqual({ mcqCount: 25, mcqSeconds: 1500, cqOffered: 8, cqToAnswer: 5, cqSeconds: 9300 });
  });

  test('remaining MCQ time after 10 minutes is 900 s', () => {
    expect(remainingSeconds(fresh(), T0 + 600_000)).toBe(900);
  });

  test('floors partial seconds and never goes below 0', () => {
    expect(remainingSeconds(fresh(), T0 + 600_400)).toBe(899);
    expect(remainingSeconds(fresh(), T0 + 2_000_000)).toBe(0);
  });

  test('advance after the deadline starts CQs at the MCQ deadline, not at now', () => {
    const s = advance(fresh(), T0 + 2_000_000);
    expect(s.phase).toBe('cq');
    expect(s.cqStartedAt).toBe(T0 + 1_500_000);
    expect(remainingSeconds(s, T0 + 2_000_000)).toBe(9300 - 500);
  });

  test('submitting early starts CQs now', () => {
    const s = advance(fresh(), T0 + 60_000);
    expect(s.cqStartedAt).toBe(T0 + 60_000);
    expect(remainingSeconds(s, T0 + 60_000)).toBe(9300);
  });

  test('a reload (JSON round trip) gives the same remaining time', () => {
    const s = advance(fresh(), T0 + 100_000);
    const back = JSON.parse(JSON.stringify(s));
    expect(remainingSeconds(back, T0 + 500_000)).toBe(remainingSeconds(s, T0 + 500_000));
  });

  test('advance from cq finishes; done has 0 remaining and stays done', () => {
    const done = advance(advance(fresh(), T0 + 1000), T0 + 2000);
    expect(done.phase).toBe('done');
    expect(remainingSeconds(done, T0 + 2000)).toBe(0);
    expect(advance(done, T0 + 3000)).toBe(done);
  });
});

describe('mock exam scoring', () => {
  test('scoreMcq counts only answered and correct; total is the MCQ count', () => {
    const qs = [mcq('a'), mcq('b'), mcq('c')];
    const s = { ...fresh(), mcqAnswers: { a: 0, b: 1 } };
    expect(scoreMcq(s, qs)).toEqual({ correct: 1, total: 3 });
  });

  test('toggleCq picks at most 5', () => {
    let s = fresh();
    for (const id of ['1', '2', '3', '4', '5', '6']) s = toggleCq(s, id);
    expect(s.cqChosen).toEqual(['1', '2', '3', '4', '5']);
    expect(toggleCq(s, '3').cqChosen).toEqual(['1', '2', '4', '5']);
  });

  test('cqScore sums self-marks of chosen CQs, capped at each part', () => {
    const s = { ...fresh(), cqChosen: ['c1'], cqSelfMarks: { 'c1:ka': 1, 'c1:kha': 5, 'c1:ga': 2, 'c2:gha': 4 } };
    expect(cqScore(s)).toBe(1 + 2 + 2);
  });
});
