import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DataLoadError, loadPool, type Pool } from '../lib/data-client';
import { LABELS } from '../lib/copy-text';
import { DIFFICULTY, MCQ_TYPE, UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { scorePractice } from '../lib/practice';
import { randomSeed } from '../lib/rng';
import { buildSet, decodeSet, encodeSet, type SetRequest } from '../lib/set-builder';
import { pushResult } from '../lib/storage';
import type { Lang, Mcq, RichBi, Stimulus } from '../lib/types';
import { BookmarkButton } from './BookmarkButton';
import { Icon } from './Icon';

const ROMAN = ['i', 'ii', 'iii'];
const rich = (b: RichBi, lang: Lang) => (lang === 'bn' ? b.bnHtml : b.enHtml);
const Html = ({ html, class: cls = 'q-body' }: { html: string; class?: string }) => <div class={cls} dangerouslySetInnerHTML={{ __html: html }} />;

/**
 * One MCQ with clickable options.
 * - practice: the first choice locks and reveals the answer.
 * - exam: choices stay changeable and nothing is revealed.
 * - review: read-only, answer revealed (an unanswered question still shows the correct option).
 */
export function McqCard({ q, n, total, stimulus, chosen, onChoose, lang, mode = 'practice' }: { q: Mcq<RichBi>; n: number; total: number; stimulus?: Stimulus<RichBi>; chosen?: number; onChoose?: (i: number) => void; lang: Lang; mode?: 'practice' | 'exam' | 'review' }) {
  const locked = mode === 'review' || (mode === 'practice' && chosen !== undefined);
  const L = LABELS[lang].options;
  return (
    <article class="card practice-card" aria-labelledby={`pq-${q.id}`}>
      <p class="meta" id={`pq-${q.id}`}>
        {UI.questionOf[lang]} {digits(n, lang)} {UI.of[lang]} {digits(total, lang)} · {DIFFICULTY[q.difficulty][lang]} · {MCQ_TYPE[q.mcq_type][lang]}
      </p>
      {stimulus && (
        <div class="practice-stimulus">
          <p class="stimulus-label">{UI.stimulus[lang]}</p>
          <Html html={rich(stimulus.text, lang)} />
          {stimulus.figures?.map((f) => (
            <figure class="figure" key={f.file}>
              <img src={f.file} alt={f.alt[lang]} loading="lazy" />
            </figure>
          ))}
        </div>
      )}
      <Html html={rich(q.stem, lang)} />
      {q.statements && (
        <ol class="statements q-body">
          {q.statements.map((s, i) => (
            <li key={i}>
              <span class="opt-label">{ROMAN[i]}.</span>
              <span dangerouslySetInnerHTML={{ __html: rich(s, lang) }} />
            </li>
          ))}
        </ol>
      )}
      {q.figures?.map((f) => (
        <figure class="figure" key={f.file}>
          <img src={f.file} alt={f.alt[lang]} loading="lazy" />
        </figure>
      ))}
      <div class="choices q-body" role="group" aria-label={UI.questionOf[lang]}>
        {q.options.map((o, i) => {
          const state = !locked ? (i === chosen ? 'selected' : undefined) : i === q.answer ? 'correct' : i === chosen ? 'wrong' : undefined;
          return (
            <button key={i} type="button" class="choice" data-state={state} aria-disabled={locked} aria-pressed={mode === 'exam' ? i === chosen : undefined} onClick={() => !locked && onChoose?.(i)}>
              <span class="opt-label">({L[i]})</span>
              <span class="choice-text" dangerouslySetInnerHTML={{ __html: rich(o, lang) }} />
              {state === 'correct' && (
                <span class="choice-mark">
                  <Icon name="check" />
                  {i === chosen ? UI.correct[lang] : UI.correctAnswer[lang]}
                </span>
              )}
              {state === 'wrong' && (
                <span class="choice-mark">
                  <Icon name="x" />
                  {UI.incorrect[lang]}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {locked && (
        <div class="solution">
          <h4>{UI.explanation[lang]}</h4>
          <Html html={rich(q.explanation, lang)} />
        </div>
      )}
      <div class="card-actions">
        <BookmarkButton id={q.id} lang={lang} />
      </div>
    </article>
  );
}

export function Practice() {
  const lang = useLang();
  const [link, setLink] = useState<{ req: SetRequest; seed: number } | null | undefined>(undefined);
  const [pool, setPool] = useState<Pool | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const saved = useRef(false);
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLink(decodeSet(location.search)), []);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    setState('loading');
    loadPool(link.req.level, link.req.subject, link.req.chapters)
      .then((p) => !cancelled && (setPool(p), setState('ready')))
      .catch((e) => {
        if (cancelled) return;
        if (!(e instanceof DataLoadError)) console.error(e);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [link, retry]);

  const mcqs = useMemo(() => (pool && link ? buildSet(pool.questions, link.req, link.seed).mcqs : []), [pool, link]);
  const score = scorePractice(mcqs, answers);

  useEffect(() => {
    if (!score.done || saved.current || !link) return;
    saved.current = true;
    pushResult({ at: Date.now(), setKey: encodeSet(link.req, link.seed), correct: score.correct, total: score.total });
    scoreRef.current?.focus();
  }, [score.done]);

  if (link === undefined) return null;
  if (link === null)
    return (
      <div class="state">
        <h2>{UI.badLink[lang]}</h2>
        <p>{UI.badLinkHint[lang]}</p>
        <a class="btn" href="/">
          {UI.goHome[lang]}
        </a>
      </div>
    );
  if (state === 'error')
    return (
      <div class="state" role="alert">
        <h2>{UI.loadError[lang]}</h2>
        <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={() => setRetry((r) => r + 1)}>
          {UI.tryAgain[lang]}
        </button>
      </div>
    );
  if (state === 'loading') return <div class="skeleton" aria-busy="true" />;

  const builderHref = `/${link.req.level}/${link.req.subject}/build${encodeSet(link.req, link.seed)}`;
  if (!mcqs.length)
    return (
      <div class="state">
        <h2>{UI.practiceNoMcq[lang]}</h2>
        <a class="btn" href={builderHref}>
          {UI.editSet[lang]}
        </a>
      </div>
    );

  const stimulusOf = (q: Mcq<RichBi>) => (q.stimulus_id ? pool!.stimuli.get(`${q.chapter}/${q.stimulus_id}`) : undefined);
  const choose = (id: string, i: number) => setAnswers((a) => (id in a ? a : { ...a, [id]: i }));
  const card = (q: Mcq<RichBi>, i: number) => <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={stimulusOf(q)} chosen={answers[q.id]} onChoose={(c) => choose(q.id, c)} lang={lang} />;
  const newSet = () => {
    location.search = encodeSet(link.req, randomSeed());
  };

  return (
    <div class="practice">
      <div class="results-bar">
        <span class="summary" aria-live="polite">
          {digits(score.answered, lang)}/{digits(score.total, lang)} {UI.answered[lang]}
        </span>
        <button type="button" class="btn-text" onClick={() => setShowAll((v) => !v)}>
          {showAll ? UI.showOne[lang] : UI.showAll[lang]}
        </button>
      </div>
      {score.done && (
        <div class="state score" tabIndex={-1} ref={scoreRef}>
          <h2>
            {UI.score[lang]}: {digits(score.correct, lang)}/{digits(score.total, lang)}
          </h2>
          <div class="card-actions">
            <button type="button" class="btn btn-primary" onClick={newSet}>
              {UI.newSet[lang]}
            </button>
            <a class="btn" href={builderHref}>
              {UI.editSet[lang]}
            </a>
          </div>
        </div>
      )}
      {showAll ? (
        <div class="cards">{mcqs.map(card)}</div>
      ) : (
        <>
          <div class="cards">{card(mcqs[index], index)}</div>
          <div class="pager">
            <button type="button" class="btn" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <Icon name="arrowLeft" />
              {UI.previous[lang]}
            </button>
            <button type="button" class="btn" disabled={index === mcqs.length - 1} onClick={() => setIndex((i) => i + 1)}>
              {UI.next[lang]}
              <Icon name="arrowRight" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
