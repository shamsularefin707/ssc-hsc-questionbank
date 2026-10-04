// Reads which questions a page shows from its URL: a built set (?level=…&seed=…) or a paper (?paper=id).
import { useEffect, useState } from 'preact/hooks';
import { DataLoadError, loadChapter, loadPapers, loadPool, type Pool } from './data-client';
import { paperChapters, resolvePaper } from './papers';
import { buildSet, decodeSet, encodeSet, type QuestionSet, type SetRequest } from './set-builder';
import type { Cq, Mcq, PaperIndex, RichBi } from './types';

export type QuestionSource = { kind: 'set'; req: SetRequest; seed: number } | { kind: 'paper'; id: string };

export interface Loaded {
  pool: Pool;
  mcqs: Mcq<RichBi>[];
  cqs: Cq<RichBi>[];
  /** A QuestionSet view of the questions, for export. */
  set: QuestionSet;
  paper?: PaperIndex;
}

const PAPER_ID = /^[a-z0-9-]+$/;

/** `paperParam` is 'paper' on practice/print/mock links and 'id' on the paper page itself. */
export function readSource(search: string, paperParam = 'paper'): QuestionSource | null {
  const id = new URLSearchParams(search).get(paperParam);
  if (id !== null) return PAPER_ID.test(id) ? { kind: 'paper', id } : null;
  const d = decodeSet(search);
  return d ? { kind: 'set', ...d } : null;
}

/** Link back to where the questions came from. */
export const sourceHref = (s: QuestionSource) => (s.kind === 'paper' ? `/paper?id=${s.id}` : `/${s.req.level}/${s.req.subject}/build${encodeSet(s.req, s.seed)}`);
export const sourceKey = (s: QuestionSource) => (s.kind === 'paper' ? `paper:${s.id}` : encodeSet(s.req, s.seed));

async function load(s: QuestionSource): Promise<Loaded> {
  if (s.kind === 'set') {
    const pool = await loadPool(s.req.level, s.req.subject, s.req.chapters);
    const set = buildSet(pool.questions, s.req, s.seed);
    return { pool, mcqs: set.mcqs, cqs: set.cqs, set };
  }
  const paper = (await loadPapers()).find((p) => p.id === s.id);
  if (!paper) throw new DataLoadError(`/data/papers.json#${s.id}`, 404);
  const pool = await loadPool(paper.level, paper.subject, paperChapters(paper));
  const { mcqs, cqs } = await resolvePaper(paper, (c) => loadChapter(paper.level, paper.subject, c));
  const set: QuestionSet = {
    request: { level: paper.level, subject: paper.subject, chapters: [], difficulty: [], mcqCount: mcqs.length, cqCount: cqs.length },
    seed: 0,
    mcqs,
    cqs,
    available: { mcq: mcqs.length, cq: cqs.length },
    shortfall: false,
  };
  return { pool, mcqs, cqs, set, paper };
}

export function useSource(paperParam = 'paper') {
  const [source, setSource] = useState<QuestionSource | null | undefined>(undefined);
  const [data, setData] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setSource(readSource(location.search, paperParam)), []);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setStatus('loading');
    load(source)
      .then((d) => !cancelled && (setData(d), setStatus('ready')))
      .catch((e) => {
        if (cancelled) return;
        if (!(e instanceof DataLoadError)) console.error(e);
        setStatus(e instanceof DataLoadError && e.status === 404 && source.kind === 'paper' ? 'missing' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [source, attempt]);

  return { source, data, status, retry: () => setAttempt((a) => a + 1) };
}
