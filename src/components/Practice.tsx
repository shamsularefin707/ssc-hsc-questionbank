import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LABELS } from '../lib/copy-text';
import { DIFFICULTY, MCQ_TYPE, UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { scorePractice, stimulusLeaders } from '../lib/practice';
import { randomSeed } from '../lib/rng';
import { encodeSet } from '../lib/set-builder';
import { sourceHref, sourceKey, useSource } from '../lib/use-source';
import { pushResult } from '../lib/storage';
import type { Lang, Mcq, RichBi, Stimulus } from '../lib/types';
import { BookmarkButton } from './BookmarkButton';
import { Icon } from './Icon';
import { SourceState } from './SourceState';

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
  const src = useSource();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const saved = useRef(false);
  const scoreRef = useRef<HTMLDivElement>(null);

  const mcqs = src.data?.mcqs ?? [];
  const score = scorePractice(mcqs, answers);

  useEffect(() => {
    if (!score.done || saved.current || !src.source) return;
    saved.current = true;
    pushResult({ at: Date.now(), setKey: sourceKey(src.source), correct: score.correct, total: score.total });
    scoreRef.current?.focus();
  }, [score.done]);

  if (!src.source || src.status !== 'ready' || !src.data) return <SourceState src={src} lang={lang} />;
  const source = src.source;
  const pool = src.data.pool;
  const backHref = sourceHref(source);
  if (!mcqs.length)
    return (
      <div class="state">
        <h2>{UI.practiceNoMcq[lang]}</h2>
        <a class="btn" href={backHref}>
          {source.kind === 'paper' ? UI.backToPaper[lang] : UI.editSet[lang]}
        </a>
      </div>
    );

  const stimulusOf = (q: Mcq<RichBi>) => (q.stimulus_id ? pool.stimuli.get(`${q.chapter}/${q.stimulus_id}`) : undefined);
  const choose = (id: string, i: number) => setAnswers((a) => (id in a ? a : { ...a, [id]: i }));
  const leaders = stimulusLeaders(mcqs);
  // One at a time, every question shows its stimulus; in the full list, only the first of each set.
  const card = (q: Mcq<RichBi>, i: number) => <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={!showAll || leaders.has(q.id) ? stimulusOf(q) : undefined} chosen={answers[q.id]} onChoose={(c) => choose(q.id, c)} lang={lang} />;
  const again = () => {
    if (source.kind === 'set') location.search = encodeSet(source.req, randomSeed());
    else location.reload();
  };

  return (
    <div class="practice">
      {src.data.paper && <p class="meta">{src.data.paper.title[lang]}</p>}
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
            <button type="button" class="btn btn-primary" onClick={again}>
              {source.kind === 'set' ? UI.newSet[lang] : UI.practiseAgain[lang]}
            </button>
            <a class="btn" href={backHref}>
              {source.kind === 'paper' ? UI.backToPaper[lang] : UI.editSet[lang]}
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
