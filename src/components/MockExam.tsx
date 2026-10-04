import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CQ_MARKS, CQ_PARTS, LABELS } from '../lib/copy-text';
import { DataLoadError, loadPapers, loadPool, type Pool } from '../lib/data-client';
import { UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { MOCK, MOCK_CURRENT, advance, cqScore, createMock, createMockFromPaper, isMockState, mockKey, remainingSeconds, scoreMcq, toggleCq, type MockState } from '../lib/mock-exam';
import { randomSeed } from '../lib/rng';
import { buildSet } from '../lib/set-builder';
import { stimulusLeaders } from '../lib/practice';
import { storage, upsertResult } from '../lib/storage';
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
  const id = storage.get<unknown>(MOCK_CURRENT, null);
  if (typeof id !== 'string') return null;
  const s = storage.get<unknown>(mockKey(id), null);
  if (isMockState(s)) return s;
  storage.remove(mockKey(id)); // from an older version or edited by hand: start fresh instead of crashing
  storage.remove(MOCK_CURRENT);
  return null;
}

export function MockExam({ manifest }: { manifest: SubjectManifest }) {
  const lang = useLang();
  const [paper, setPaper] = useState<PaperIndex | undefined>(undefined);
  const [paperMissing, setPaperMissing] = useState(false);
  const [state, setState] = useState<MockState | null | undefined>(undefined);
  const [chapters, setChapters] = useState<string[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [announce, setAnnounce] = useState('');
  const warned = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const focusHead = useRef(false);

  // Resume a saved mock for this subject (and this paper, if any).
  // ?paper=id runs a board or admission paper; otherwise the student picks chapters.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('paper');
    const resume = (p?: PaperIndex) => {
      const s = loadSaved();
      setState(s && s.level === manifest.level && s.subject === manifest.subject && s.paper === p?.id ? s : null);
    };
    if (!id) return resume();
    loadPapers()
      .then((ps) => {
        const p = ps.find((x) => x.id === id && x.level === manifest.level && x.subject === manifest.subject);
        if (!p) return setPaperMissing(true);
        setPaper(p);
        resume(p);
      })
      .catch(() => setPaperMissing(true));
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
      setAnnounce(state.phase === 'mcq' ? UI.timeUpCq[lang] : UI.timeUpDone[lang]);
      focusHead.current = true;
      update(advance(state, Date.now()));
    } else if (left <= 300 && !warned.current) {
      warned.current = true;
      setAnnounce(state.phase === 'mcq' ? UI.fiveMinutesMcq[lang] : UI.fiveMinutesCq[lang]);
    } else if (left > 300) warned.current = false;
  }, [left, state?.phase]);

  // After a phase change, move keyboard focus to the new section's heading.
  useEffect(() => {
    if (!focusHead.current) return;
    focusHead.current = false;
    headRef.current?.focus();
    topRef.current?.scrollIntoView();
  }, [state?.phase]);

  const qs = useMemo(() => (pool && state ? mockQuestions(pool, state, paper) : null), [pool, state?.id]);

  // Keep the finished mock in the results history; CQ self-marks update the same entry.
  useEffect(() => {
    if (!state || state.phase !== 'done' || !qs) return;
    const cqMax = Math.min(MOCK.cqToAnswer, qs.cqs.length) * 10;
    upsertResult({ at: state.finishedAt ?? Date.now(), setKey: `mock:${state.id}`, correct: scoreMcq(state, qs.mcqs).correct + cqScore(state), total: qs.mcqs.length + cqMax });
  }, [state, qs]);

  const start = () => {
    const at = Date.now();
    warned.current = false;
    setNow(at);
    update(paper ? createMockFromPaper(paper, at) : createMock(manifest.level, manifest.subject, chapters, randomSeed(), at));
  };
  const finishPhase = () => {
    setAnnounce(state!.phase === 'mcq' ? UI.cqStarted[lang] : UI.resultReady[lang]);
    focusHead.current = true;
    update(advance(state!, Date.now()));
    setNow(Date.now());
  };
  const reset = () => {
    if (state) storage.remove(mockKey(state.id));
    storage.remove(MOCK_CURRENT);
    setState(null);
    setPool(null);
  };

  if (paperMissing)
    return (
      <div class="state">
        <h2>{UI.paperMissing[lang]}</h2>
        <a class="btn" href={`/board/${manifest.level}/${manifest.subject}`}>
          {UI.navBoard[lang]}
        </a>
      </div>
    );
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
        {paper && <p class="meta">{paper.title[lang]}</p>}
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
  const leaders = stimulusLeaders(mcqs);
  const listStimulus = (q: Mcq<RichBi>) => (leaders.has(q.id) ? stimulusOf(q) : undefined);
  const live = (
    <p class="visually-hidden" aria-live="polite">
      {announce}
    </p>
  );
  const sectionHead = (text: string) => (
    <h2 class="section-title phase-head" tabIndex={-1} ref={headRef}>
      {text}
    </h2>
  );

  const timer = state.phase !== 'done' && (
    <div class="timer-bar" role="timer" aria-label={UI.timeLeft[lang]}>
      <span>{state.phase === 'mcq' ? UI.mcqSection[lang] : UI.cqSection[lang]}</span>
      <span class="time" data-warn={left <= 300}>
        <span class="visually-hidden">{UI.timeLeft[lang]}: </span>
        {clock(left, lang)}
      </span>
    </div>
  );

  // ---------- MCQ phase ----------
  if (state.phase === 'mcq')
    return (
      <div class="mock" ref={topRef}>
        {timer}
        {live}
        {sectionHead(UI.mcqSection[lang])}
        <div class="cards">
          {mcqs.map((q, i) => (
            <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={listStimulus(q)} chosen={state.mcqAnswers[q.id]} onChoose={(c) => update({ ...state, mcqAnswers: { ...state.mcqAnswers, [q.id]: c } })} lang={lang} mode="exam" />
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
        {live}
        {sectionHead(UI.cqSection[lang])}
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
      {live}
      <section class="state result">
        <h2 class="phase-head" tabIndex={-1} ref={headRef}>
          {UI.mockResult[lang]}
        </h2>
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
      {chosen.length < Math.min(MOCK.cqToAnswer, cqs.length) && (
        <div class="panel filter-section pick-late">
          <p>{UI.pickAnswered[lang]}</p>
          <ul class="check-list">
            {cqs.map((q, i) => {
              const on = state.cqChosen.includes(q.id);
              return (
                <li key={q.id}>
                  <label class="check">
                    <input type="checkbox" checked={on} disabled={!on && chosen.length >= MOCK.cqToAnswer} onChange={() => update(toggleCq(state, q.id))} />
                    <span>
                      {digits(i + 1, lang)}. {(lang === 'bn' ? q.stimulus.bn : q.stimulus.en).replace(/\$[^$]*\$/g, '…').slice(0, 90)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
          <McqCard key={q.id} q={q} n={i + 1} total={mcqs.length} stimulus={listStimulus(q)} chosen={state.mcqAnswers[q.id]} lang={lang} mode="review" />
        ))}
      </div>
    </div>
  );
}
