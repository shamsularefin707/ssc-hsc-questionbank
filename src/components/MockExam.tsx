import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CQ_MARKS, CQ_PARTS, LABELS } from '../lib/copy-text';
import { DataLoadError, loadPool, type Pool } from '../lib/data-client';
import { UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { MOCK, MOCK_CURRENT, advance, cqScore, createMock, mockKey, remainingSeconds, scoreMcq, toggleCq, type MockState } from '../lib/mock-exam';
import { randomSeed } from '../lib/rng';
import { buildSet } from '../lib/set-builder';
import { storage } from '../lib/storage';
import type { Cq, Lang, Mcq, PaperIndex, RichBi, SubjectManifest } from '../lib/types';
import { McqCard } from './Practice';
import { CqBody } from './QuestionCard';

/** MM:SS, or H:MM:SS when an hour or more is left. */
export function clock(sec: number, lang: Lang): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return digits(h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`, lang);
}

/** The questions a mock uses: a real board paper's, or a seeded draw from the chosen chapters. */
function mockQuestions(pool: Pool, state: MockState, paper?: PaperIndex): { mcqs: Mcq<RichBi>[]; cqs: Cq<RichBi>[] } {
  if (paper) {
    const byId = new Map(pool.questions.map((q) => [q.id, q]));
    return {
      mcqs: paper.mcq.map((id) => byId.get(id)).filter((q): q is Mcq<RichBi> => q?.kind === 'mcq'),
      cqs: paper.cq.map((id) => byId.get(id)).filter((q): q is Cq<RichBi> => q?.kind === 'cq'),
    };
  }
  const set = buildSet(pool.questions, { level: state.level, subject: state.subject, chapters: state.chapters, difficulty: [], mcqCount: MOCK.mcqCount, cqCount: MOCK.cqOffered }, state.seed);
  return { mcqs: set.mcqs, cqs: set.cqs };
}

function loadSaved(): MockState | null {
  const id = storage.get<string | null>(MOCK_CURRENT, null);
  return id ? storage.get<MockState | null>(mockKey(id), null) : null;
}

export function MockExam({ manifest, paper }: { manifest: SubjectManifest; paper?: PaperIndex }) {
  const lang = useLang();
  const [state, setState] = useState<MockState | null | undefined>(undefined);
  const [chapters, setChapters] = useState<string[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [announce, setAnnounce] = useState('');
  const warned = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Resume a saved mock for this subject (and this paper, if any).
  useEffect(() => {
    const s = loadSaved();
    setState(s && s.level === manifest.level && s.subject === manifest.subject && s.paper === paper?.id ? s : null);
  }, []);

  // Persist on every change.
  const update = (next: MockState) => {
    setState(next);
    storage.set(mockKey(next.id), next);
    storage.set(MOCK_CURRENT, next.id);
  };

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    setLoadState('loading');
    loadPool(state.level, state.subject, state.chapters)
      .then((p) => !cancelled && (setPool(p), setLoadState('ready')))
      .catch((e) => {
        if (cancelled) return;
        if (!(e instanceof DataLoadError)) console.error(e);
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [state?.id, retry]);

  // The interval only triggers re-renders; the time shown is always computed from timestamps.
  useEffect(() => {
    if (!state || state.phase === 'done') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state?.id, state?.phase]);

  const left = state ? remainingSeconds(state, now) : 0;
  useEffect(() => {
    if (!state || state.phase === 'done') return;
    if (left === 0) {
      warned.current = false;
      update(advance(state, Date.now()));
      topRef.current?.scrollIntoView();
    } else if (left <= 300 && !warned.current) {
      warned.current = true;
      setAnnounce(UI.fiveMinutes[lang]);
    } else if (left > 300) warned.current = false;
  }, [left, state?.phase]);

  const qs = useMemo(() => (pool && state ? mockQuestions(pool, state, paper) : null), [pool, state?.id]);

  const start = () => {
    const at = Date.now();
    warned.current = false;
    setNow(at);
    update(createMock(manifest.level, manifest.subject, paper ? [] : chapters, randomSeed(), at, paper?.id));
  };
  const finishPhase = () => {
    update(advance(state!, Date.now()));
    setNow(Date.now());
    topRef.current?.scrollIntoView();
  };
  const reset = () => {
    if (state) storage.remove(mockKey(state.id));
    storage.remove(MOCK_CURRENT);
    setState(null);
    setPool(null);
  };

  if (state === undefined) return null;

  // ---------- Start screen ----------
  if (state === null) {
    const withQuestions = manifest.chapters.filter((c) => c.counts.mcq + c.counts.cq > 0);
    const picked = paper ? withQuestions : chapters.length ? withQuestions.filter((c) => chapters.includes(c.slug)) : withQuestions;
    const mcqAvail = paper ? paper.mcq.length : picked.reduce((n, c) => n + c.counts.mcq, 0);
    const cqAvail = paper ? paper.cq.length : picked.reduce((n, c) => n + c.counts.cq, 0);
    const short = mcqAvail < MOCK.mcqCount || cqAvail < MOCK.cqOffered;
    return (
      <div class="mock-start">
        {!paper && (
          <fieldset class="panel filter-section" style={{ margin: 0 }}>
            <legend class="visually-hidden">{UI.chapters[lang]}</legend>
            <h3 aria-hidden="true">{UI.chapters[lang]}</h3>
            <p class="hint">{UI.allChapters[lang]}</p>
            <ul class="check-list">
              {withQuestions.map((c) => (
                <li key={c.slug}>
                  <label class="check">
                    <input type="checkbox" checked={chapters.includes(c.slug)} onChange={() => setChapters((cs) => (cs.includes(c.slug) ? cs.filter((x) => x !== c.slug) : [...cs, c.slug]))} />
                    <span>
                      {digits(c.number, lang)}. {c.title[lang]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <section class="panel filter-section">
          <h2>{UI.mockRulesTitle[lang]}</h2>
          <ul class="rules">
            <li>{UI.mockRuleMcq[lang]}</li>
            <li>{UI.mockRuleCq[lang]}</li>
            <li>{UI.mockRuleMark[lang]}</li>
            <li>{UI.mockRuleSaved[lang]}</li>
          </ul>
          {short && (
            <p class="notice">
              {UI.mockShort[lang]} {digits(Math.min(mcqAvail, MOCK.mcqCount), lang)} MCQ, {digits(Math.min(cqAvail, MOCK.cqOffered), lang)} CQ.
            </p>
          )}
          <button type="button" class="btn btn-primary" onClick={start} disabled={mcqAvail + cqAvail === 0}>
            {UI.startMock[lang]}
          </button>
        </section>
      </div>
    );
  }

  if (loadState === 'error')
    return (
      <div class="state" role="alert">
        <h2>{UI.loadError[lang]}</h2>
        <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={() => setRetry((r) => r + 1)}>
          {UI.tryAgain[lang]}
        </button>
      </div>
    );
  if (!qs) return <div class="skeleton" aria-busy="true" />;

  const { mcqs, cqs } = qs;
  const stimulusOf = (q: Mcq<RichBi>) => (q.stimulus_id ? pool!.stimuli.get(`${q.chapter}/${q.stimulus_id}`) : undefined);
  const L = LABELS[lang].options;

  const timer = state.phase !== 'done' && (
    <div class="timer-bar" role="timer" aria-label={UI.timeLeft[lang]}>
      <span>{state.phase === 'mcq' ? UI.mcqSection[lang] : UI.cqSection[lang]}</span>
      <span class="time" data-warn={left <= 300}>
        <span class="visually-hidden">{UI.timeLeft[lang]}: </span>
        {clock(left, lang)}
      </span>
      <span class="visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  );

  // ---------- MCQ phase ----------
  if (state.phase === 'mcq')
    return (
      <div class="mock" ref={topRef}>
        {timer}
        <div class="cards">
          {mcqs.map((q, i) => (
            <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={stimulusOf(q)} chosen={state.mcqAnswers[q.id]} onChoose={(c) => update({ ...state, mcqAnswers: { ...state.mcqAnswers, [q.id]: c } })} lang={lang} mode="exam" />
          ))}
        </div>
        <div class="mock-foot">
          <span class="summary">
            {digits(Object.keys(state.mcqAnswers).length, lang)}/{digits(mcqs.length, lang)} {UI.answered[lang]}
          </span>
          <button type="button" class="btn btn-primary" onClick={finishPhase}>
            {UI.finishMcq[lang]}
          </button>
        </div>
      </div>
    );

  // ---------- CQ phase ----------
  if (state.phase === 'cq')
    return (
      <div class="mock" ref={topRef}>
        {timer}
        <p class="summary" aria-live="polite">
          {lang === 'bn' ? `${digits(state.cqChosen.length, 'bn')}${UI.cqChosenCount.bn}` : `${state.cqChosen.length}${UI.cqChosenCount.en}`}
        </p>
        <div class="cards">
          {cqs.map((q, i) => {
            const on = state.cqChosen.includes(q.id);
            const full = !on && state.cqChosen.length >= MOCK.cqToAnswer;
            return (
              <article class="card" key={q.id} data-chosen={on}>
                <p class="meta">
                  {digits(i + 1, lang)}/{digits(cqs.length, lang)}
                </p>
                <div lang={lang}>
                  <CqBody q={q} lang={lang} />
                </div>
                <div class="card-actions">
                  <button type="button" class={on ? 'btn btn-chosen' : 'btn'} aria-pressed={on} disabled={full} onClick={() => update(toggleCq(state, q.id))}>
                    {on ? UI.chosenCq[lang] : UI.chooseCq[lang]}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <div class="mock-foot">
          <button type="button" class="btn btn-primary" onClick={finishPhase}>
            {UI.finishCq[lang]}
          </button>
        </div>
      </div>
    );

  // ---------- Result ----------
  const mcq = scoreMcq(state, mcqs);
  const cq = cqScore(state);
  const cqMax = Math.min(MOCK.cqToAnswer, cqs.length) * 10;
  const chosen = cqs.filter((q) => state.cqChosen.includes(q.id));
  return (
    <div class="mock" ref={topRef}>
      <section class="state result">
        <h2>{UI.mockResult[lang]}</h2>
        <dl class="result-grid">
          <div>
            <dt>{UI.mcqScore[lang]}</dt>
            <dd>
              {digits(mcq.correct, lang)}/{digits(mcq.total, lang)}
            </dd>
          </div>
          <div>
            <dt>{UI.cqScore[lang]}</dt>
            <dd aria-live="polite">
              {digits(cq, lang)}/{digits(cqMax, lang)}
            </dd>
          </div>
          <div>
            <dt>{UI.total[lang]}</dt>
            <dd>
              {digits(mcq.correct + cq, lang)}/{digits(mcq.total + cqMax, lang)}
            </dd>
          </div>
        </dl>
        <button type="button" class="btn btn-primary" onClick={reset}>
          {UI.newMock[lang]}
        </button>
      </section>

      <h2 class="section-title">{UI.yourCqs[lang]}</h2>
      {chosen.length === 0 && <p class="hint">{UI.noCqChosen[lang]}</p>}
      <div class="cards">
        {chosen.map((q) => (
          <article class="card" key={q.id} lang={lang}>
            <CqBody q={q} lang={lang} />
            <div class="solution">
              {CQ_PARTS.map((p, i) => {
                const key = `${q.id}:${p}`;
                return (
                  <div key={p} class="self-mark-part">
                    <h4>
                      {L[i]}. {UI.solution[lang]}
                    </h4>
                    <div class="q-body" dangerouslySetInnerHTML={{ __html: lang === 'bn' ? q.parts[p].solution.bnHtml : q.parts[p].solution.enHtml }} />
                    <label class="field self-mark">
                      <span>
                        {UI.selfMark[lang]} ({digits(0, lang)}–{digits(CQ_MARKS[p], lang)})
                      </span>
                      <select value={String(state.cqSelfMarks[key] ?? 0)} onChange={(e) => update({ ...state, cqSelfMarks: { ...state.cqSelfMarks, [key]: Number((e.target as HTMLSelectElement).value) } })}>
                        {Array.from({ length: CQ_MARKS[p] + 1 }, (_, m) => (
                          <option key={m} value={m}>
                            {digits(m, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <h2 class="section-title">{UI.mcqReview[lang]}</h2>
      <div class="cards">
        {mcqs.map((q, i) => (
          <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={stimulusOf(q)} chosen={state.mcqAnswers[q.id]} lang={lang} mode="review" />
        ))}
      </div>
    </div>
  );
}
