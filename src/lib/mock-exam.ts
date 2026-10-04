// Board-format mock exam: 25 MCQs in 25 min, then answer 5 of 8 CQs in 2 h 35 min.
// Time is always computed from stored timestamps, so a reload or a backgrounded tab keeps the right clock.
import { CQ_MARKS, CQ_PARTS } from './copy-text';
import { paperChapters } from './papers';
import type { Level, Mcq, PaperIndex, RichBi } from './types';

export const MOCK = { mcqCount: 25, mcqSeconds: 1500, cqOffered: 8, cqToAnswer: 5, cqSeconds: 9300 } as const;

export interface MockState {
  id: string;
  level: Level;
  subject: string;
  chapters: string[];
  seed: number;
  /** Board paper id when the mock runs a real paper (Task 12) instead of a seeded set. */
  paper?: string;
  startedAt: number;
  cqStartedAt?: number;
  finishedAt?: number;
  mcqAnswers: Record<string, number>;
  cqChosen: string[];
  /** Keyed `${cqId}:${part}`. */
  cqSelfMarks: Record<string, number>;
  phase: 'mcq' | 'cq' | 'done';
}

export function createMock(level: Level, subject: string, chapters: string[], seed: number, now: number, paper?: string): MockState {
  return {
    id: now.toString(36),
    level,
    subject,
    chapters,
    seed,
    ...(paper ? { paper } : {}),
    startedAt: now,
    mcqAnswers: {},
    cqChosen: [],
    cqSelfMarks: {},
    phase: 'mcq',
  };
}

/** A mock that runs a real paper's questions, in its order. */
export const createMockFromPaper = (paper: PaperIndex, now: number): MockState => createMock(paper.level, paper.subject, paperChapters(paper), 0, now, paper.id);

const mcqDeadline = (s: MockState) => s.startedAt + MOCK.mcqSeconds * 1000;
const cqDeadline = (s: MockState) => (s.cqStartedAt ?? mcqDeadline(s)) + MOCK.cqSeconds * 1000;

/** Seconds left in the current phase, floored, never negative. */
export function remainingSeconds(s: MockState, now: number): number {
  if (s.phase === 'done') return 0;
  const deadline = s.phase === 'mcq' ? mcqDeadline(s) : cqDeadline(s);
  return Math.max(0, Math.floor((deadline - now) / 1000));
}

/** Moves to the next phase (on submit or when time is up). A late advance starts at the deadline, not at `now`. */
export function advance(s: MockState, now: number): MockState {
  if (s.phase === 'mcq') return { ...s, phase: 'cq', cqStartedAt: Math.min(now, mcqDeadline(s)) };
  if (s.phase === 'cq') return { ...s, phase: 'done', finishedAt: Math.min(now, cqDeadline(s)) };
  return s;
}

export function scoreMcq(s: MockState, mcqs: Mcq<RichBi>[]): { correct: number; total: number } {
  return { correct: mcqs.filter((q) => s.mcqAnswers[q.id] === q.answer).length, total: mcqs.length };
}

/** Picks or unpicks a CQ, allowing at most MOCK.cqToAnswer. */
export function toggleCq(s: MockState, id: string): MockState {
  if (s.cqChosen.includes(id)) return { ...s, cqChosen: s.cqChosen.filter((x) => x !== id) };
  if (s.cqChosen.length >= MOCK.cqToAnswer) return s;
  return { ...s, cqChosen: [...s.cqChosen, id] };
}

/** Self-marked CQ total over the chosen CQs, each part capped at its marks. */
export function cqScore(s: MockState): number {
  let total = 0;
  for (const id of s.cqChosen) for (const p of CQ_PARTS) total += Math.max(0, Math.min(CQ_MARKS[p], s.cqSelfMarks[`${id}:${p}`] ?? 0));
  return total;
}

export const mockKey = (id: string) => `qb:mock:${id}`;
export const MOCK_CURRENT = 'qb:mock:current';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Guards a mock read back from storage, which may be from an older version or edited by hand. */
export function isMockState(v: unknown): v is MockState {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === 'string' &&
    (v.level === 'ssc' || v.level === 'hsc') &&
    typeof v.subject === 'string' &&
    Array.isArray(v.chapters) &&
    typeof v.seed === 'number' &&
    typeof v.startedAt === 'number' &&
    (v.cqStartedAt === undefined || typeof v.cqStartedAt === 'number') &&
    (v.phase === 'mcq' || v.phase === 'cq' || v.phase === 'done') &&
    isRecord(v.mcqAnswers) &&
    Array.isArray(v.cqChosen) &&
    isRecord(v.cqSelfMarks)
  );
}
