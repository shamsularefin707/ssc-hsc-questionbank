// Builds a question set by picking matching questions from the bank. It only selects; it never invents or pads.
import { filterQuestions } from './filter';
import { mulberry32, shuffle } from './rng';
import type { CompiledQuestion, Cq, Difficulty, Level, Mcq, McqType, RichBi } from './types';

export interface SetRequest {
  level: Level;
  subject: string;
  chapters: string[];
  topics?: string[];
  difficulty: Difficulty[];
  mcqTypes?: McqType[];
  mcqCount: number;
  cqCount: number;
}

export interface QuestionSet {
  request: SetRequest;
  seed: number;
  mcqs: Mcq<RichBi>[];
  cqs: Cq<RichBi>[];
  available: { mcq: number; cq: number };
  shortfall: boolean;
}

export function buildSet(pool: CompiledQuestion[], req: SetRequest, seed: number): QuestionSet {
  const rand = mulberry32(seed);
  const common = { chapters: req.chapters, topics: req.topics, difficulty: req.difficulty };
  const mcqPool = filterQuestions(pool, { ...common, kind: ['mcq'], mcqType: req.mcqTypes }) as Mcq<RichBi>[];
  const cqPool = filterQuestions(pool, { ...common, kind: ['cq'] }) as Cq<RichBi>[];

  // Each অভিন্ন তথ্যভিত্তিক set is one unit, so it is either taken whole or skipped.
  const units: Mcq<RichBi>[][] = [];
  const setUnits = new Map<string, Mcq<RichBi>[]>();
  for (const q of mcqPool) {
    if (!q.stimulus_id) {
      units.push([q]);
      continue;
    }
    const key = `${q.chapter}/${q.stimulus_id}`;
    let unit = setUnits.get(key);
    if (!unit) {
      unit = [];
      setUnits.set(key, unit);
      units.push(unit);
    }
    unit.push(q);
  }

  const mcqs: Mcq<RichBi>[] = [];
  for (const unit of shuffle(units, rand)) {
    if (mcqs.length + unit.length <= req.mcqCount) mcqs.push(...unit);
    if (mcqs.length === req.mcqCount) break;
  }
  const cqs = shuffle(cqPool, rand).slice(0, req.cqCount);

  return {
    request: req,
    seed,
    mcqs,
    cqs,
    available: { mcq: mcqPool.length, cq: cqPool.length },
    shortfall: mcqs.length < req.mcqCount || cqs.length < req.cqCount,
  };
}

const LIST_KEYS = ['chapters', 'topics', 'difficulty', 'mcqTypes'] as const;
const SLUG = /^[a-z0-9-]+$/;
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const MCQ_TYPES: McqType[] = ['gyanmulok', 'onudhabon', 'bohupodi', 'ovinno'];
const MAX_COUNT = 200;

export function encodeSet(req: SetRequest, seed: number): string {
  const p = new URLSearchParams();
  p.set('level', req.level);
  p.set('subject', req.subject);
  for (const k of LIST_KEYS) if (req[k]?.length) p.set(k, req[k]!.join(','));
  p.set('mcq', String(req.mcqCount));
  p.set('cq', String(req.cqCount));
  p.set('seed', String(seed));
  return `?${p.toString().replace(/%2C/g, ',')}`;
}

export function decodeSet(search: string): { req: SetRequest; seed: number } | null {
  const p = new URLSearchParams(search);
  const level = p.get('level');
  const subject = p.get('subject') ?? '';
  if ((level !== 'ssc' && level !== 'hsc') || !SLUG.test(subject)) return null;
  const int = (k: string) => {
    const v = p.get(k);
    return v !== null && /^\d+$/.test(v) ? Number(v) : NaN;
  };
  const mcqCount = int('mcq'), cqCount = int('cq'), seed = int('seed');
  if ([mcqCount, cqCount, seed].some(Number.isNaN) || mcqCount > MAX_COUNT || cqCount > MAX_COUNT) return null;
  const list = (k: string) => p.get(k)?.split(',').filter(Boolean) ?? [];
  const chapters = list('chapters').filter((c) => SLUG.test(c));
  const topics = list('topics').filter((t) => SLUG.test(t));
  const difficulty = list('difficulty').filter((d): d is Difficulty => DIFFICULTIES.includes(d as Difficulty));
  const mcqTypes = list('mcqTypes').filter((t): t is McqType => MCQ_TYPES.includes(t as McqType));
  const req: SetRequest = { level, subject, chapters, difficulty, mcqCount, cqCount };
  if (topics.length) req.topics = topics;
  if (mcqTypes.length) req.mcqTypes = mcqTypes;
  return { req, seed };
}
