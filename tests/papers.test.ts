import { describe, expect, test, vi } from 'vitest';
import { createMockFromPaper } from '../src/lib/mock-exam';
import { paperChapters, resolvePaper } from '../src/lib/papers';
import type { ChapterData, PaperIndex } from '../src/lib/types';
import paperJson from './fixtures/papers/two-chapter.json';
import { cq, mcq } from './helpers';

const paper = paperJson as PaperIndex;
const chapter = (slug: string, questions: ChapterData['questions']): ChapterData => ({ level: 'ssc', subject: 'physics', chapter: slug, title: { bn: slug, en: slug }, stimuli: {}, questions });
const data: Record<string, ChapterData> = {
  '01-a': chapter('01-a', [mcq('a1', { chapter: '01-a' }), mcq('a2', { chapter: '01-a' })]),
  '02-b': chapter('02-b', [mcq('b1', { chapter: '02-b' }), mcq('b2', { chapter: '02-b' }), cq('c2', { chapter: '02-b' })]),
};

describe('resolvePaper', () => {
  test('keeps the paper order across two chapters and loads each chapter once', async () => {
    const load = vi.fn(async (c: string) => data[c]);
    const { mcqs, cqs } = await resolvePaper(paper, load);
    expect(mcqs.map((q) => q.id)).toEqual(['b2', 'a1', 'b1']);
    expect(cqs.map((q) => q.id)).toEqual(['c2']);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('skips ids that are missing from the chapter data', async () => {
    const { mcqs } = await resolvePaper({ ...paper, mcq: ['a1', 'gone'] }, async (c) => data[c]);
    expect(mcqs.map((q) => q.id)).toEqual(['a1']);
  });

  test('paperChapters lists distinct chapters in first-seen order', () => {
    expect(paperChapters(paper)).toEqual(['02-b', '01-a']);
  });
});

describe('createMockFromPaper', () => {
  test('records the paper and its chapters so the mock uses exactly its questions', () => {
    const s = createMockFromPaper(paper, 1000);
    expect(s.paper).toBe('ssc-physics-rajshahi-2024');
    expect(s.chapters).toEqual(['02-b', '01-a']);
    expect(s.level).toBe('ssc');
    expect(s.subject).toBe('physics');
    expect(s.phase).toBe('mcq');
  });
});

describe('groupAdmission', () => {
  const adm = (id: string, category: 'medical' | 'varsity', institution: string, session: string, unit?: string): PaperIndex => ({
    id, level: 'hsc', subject: 'physics', title: { bn: id, en: id }, mcq: ['x'], cq: [],
    source: { kind: 'admission', category, institution, session, ...(unit ? { unit } : {}) },
  });
  test('filters by category, groups by institution, newest session first then unit', async () => {
    const { groupAdmission } = await import('../src/lib/papers');
    const g = groupAdmission([adm('a', 'varsity', 'du', '2022-23', 'ka'), adm('b', 'varsity', 'du', '2023-24', 'kha'), adm('c', 'varsity', 'du', '2023-24', 'ka'), adm('d', 'varsity', 'cu', '2023-24'), adm('e', 'medical', 'dgme', '2023-24'), paper], 'varsity');
    expect(g.map((x) => x.institution)).toEqual(['cu', 'du']);
    expect(g[1].papers.map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });
});

test('readSource reads a paper id or a set, and rejects junk', async () => {
  const { readSource } = await import('../src/lib/use-source');
  expect(readSource('?paper=ssc-physics-dhaka-2023')).toEqual({ kind: 'paper', id: 'ssc-physics-dhaka-2023' });
  expect(readSource('?id=abc', 'id')).toEqual({ kind: 'paper', id: 'abc' });
  expect(readSource('?paper=../x')).toBeNull();
  expect(readSource('?level=ssc&subject=physics&mcq=5&cq=0&seed=1')?.kind).toBe('set');
  expect(readSource('')).toBeNull();
});
