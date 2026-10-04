import { useEffect, useMemo, useState } from 'preact/hooks';
import { DataLoadError, loadPool, type Pool } from '../lib/data-client';
import { groupForDisplay } from '../lib/filter';
import { DIFFICULTY, MCQ_TYPE, UI, digits, shortfallText } from '../lib/labels';
import { useLang } from '../lib/lang';
import { randomSeed } from '../lib/rng';
import { buildSet, decodeSet, encodeSet, type QuestionSet, type SetRequest } from '../lib/set-builder';
import type { Bi, Difficulty, McqType, SubjectManifest } from '../lib/types';
import { ExportWordButton } from './ExportWordButton';
import { ChipSection } from './FilterChip';
import { QuestionList, type CardContext } from './QuestionCard';

const MAX = 200;

function toggle<T>(list: T[] | undefined, v: T): T[] {
  return list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v];
}

const clampCount = (v: string) => Math.max(0, Math.min(MAX, Math.floor(Number(v) || 0)));

export function SetBuilder({ manifest }: { manifest: SubjectManifest }) {
  const lang = useLang();
  const blank: SetRequest = { level: manifest.level, subject: manifest.subject, chapters: [], difficulty: [], mcqCount: 25, cqCount: 0 };
  const [form, setForm] = useState<SetRequest>(blank);
  const [seed, setSeed] = useState<number | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retry, setRetry] = useState(0);

  // A shared link (?level=…&seed=…) restores the form and shows its set.
  useEffect(() => {
    const d = decodeSet(location.search);
    if (d && d.req.level === manifest.level && d.req.subject === manifest.subject) {
      setForm(d.req);
      setSeed(d.seed);
    }
  }, []);

  // The request that produced the shown set; the form can change without rebuilding.
  const [built, setBuilt] = useState<SetRequest | null>(null);
  useEffect(() => {
    if (seed !== null && !built) setBuilt(form);
  }, [seed]);

  useEffect(() => {
    if (!built || seed === null) return;
    history.replaceState(null, '', location.pathname + encodeSet(built, seed));
    let cancelled = false;
    setState('loading');
    loadPool(manifest.level, manifest.subject, built.chapters)
      .then((p) => !cancelled && (setPool(p), setState('ready')))
      .catch((e) => {
        if (cancelled) return;
        if (!(e instanceof DataLoadError)) console.error(e);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [built, seed, retry]);

  const set: QuestionSet | null = useMemo(() => (pool && built && seed !== null ? buildSet(pool.questions, built, seed) : null), [pool, built, seed]);
  const items = useMemo(() => (set ? groupForDisplay([...set.mcqs, ...set.cqs]) : []), [set]);

  const topicTitles = useMemo(() => new Map(manifest.chapters.flatMap((c) => c.topics.map((t) => [t.slug, t.title] as [string, Bi]))), [manifest]);
  const ctxFor = (chapter: string): CardContext => ({ chapterTitle: manifest.chapters.find((c) => c.slug === chapter)?.title, topicTitles });

  const withQuestions = manifest.chapters.filter((c) => c.counts.mcq + c.counts.cq > 0);
  const selected = manifest.chapters.filter((c) => form.chapters.includes(c.slug));

  const toggleChapter = (slug: string) =>
    setForm((f) => {
      const chapters = toggle(f.chapters, slug);
      const allowed = new Set(manifest.chapters.filter((c) => chapters.includes(c.slug)).flatMap((c) => c.topics.map((t) => t.slug)));
      const topics = f.topics?.filter((t) => allowed.has(t));
      return { ...f, chapters, topics: topics?.length ? topics : undefined };
    });

  const onBuild = (e: Event) => {
    e.preventDefault();
    setBuilt({ ...form, topics: form.topics?.length ? form.topics : undefined, mcqTypes: form.mcqTypes?.length ? form.mcqTypes : undefined });
    setSeed(randomSeed());
  };

  const query = set ? encodeSet(set.request, set.seed) : '';
  const nothingAsked = form.mcqCount + form.cqCount === 0;

  let result = null;
  if (state === 'loading' && !set) result = <div class="skeleton" aria-busy="true" />;
  else if (state === 'error')
    result = (
      <div class="state" role="alert">
        <h2>{UI.loadError[lang]}</h2>
        <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={() => setRetry((r) => r + 1)}>
          {UI.tryAgain[lang]}
        </button>
      </div>
    );
  else if (set && items.length === 0)
    result = (
      <div class="state">
        <h2>{UI.emptySet[lang]}</h2>
        <p>{UI.emptySetHint[lang]}</p>
      </div>
    );
  else if (set)
    result = (
      <>
        <div class="results-bar set-actions">
          <span class="summary" aria-live="polite">
            {[
              set.mcqs.length && `${digits(set.mcqs.length, lang)} MCQ`,
              set.cqs.length && `${digits(set.cqs.length, lang)} CQ`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <button type="button" class="btn" onClick={() => setSeed(randomSeed())}>
            {UI.reshuffle[lang]}
          </button>
          {set.mcqs.length > 0 && (
            <a class="btn" href={`/practice${query}`}>
              {UI.practise[lang]}
            </a>
          )}
          <a class="btn" href={`/print${query}`}>
            {UI.printPdf[lang]}
          </a>
          <ExportWordButton set={set} pool={pool!} lang={lang} />
        </div>
        {set.shortfall && (
          <p class="notice" role="status">
            {set.mcqs.length < set.request.mcqCount && shortfallText(set.mcqs.length, 'MCQ', lang)}{' '}
            {set.cqs.length < set.request.cqCount && shortfallText(set.cqs.length, 'CQ', lang)}
          </p>
        )}
        <QuestionList items={items} stimuli={(ch, id) => pool!.stimuli.get(`${ch}/${id}`)} ctxFor={ctxFor} lang={lang} />
      </>
    );

  return (
    <div class="bank builder">
      <form class="panel builder-form" onSubmit={onBuild} aria-label={UI.buildTitle[lang]}>
        <fieldset class="filter-section" style={{ border: 0, margin: 0 }}>
          <legend class="visually-hidden">{UI.chapters[lang]}</legend>
          <h3 aria-hidden="true">{UI.chapters[lang]}</h3>
          <p class="hint">{UI.allChapters[lang]}</p>
          <ul class="check-list">
            {withQuestions.map((c) => (
              <li key={c.slug}>
                <label class="check">
                  <input type="checkbox" checked={form.chapters.includes(c.slug)} onChange={() => toggleChapter(c.slug)} />
                  <span>
                    {digits(c.number, lang)}. {c.title[lang]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {selected.length > 0 && (
          <fieldset class="filter-section" style={{ border: 0, margin: 0 }}>
            <legend class="visually-hidden">{UI.topics[lang]}</legend>
            <h3 aria-hidden="true">{UI.topics[lang]}</h3>
            <ul class="check-list">
              {selected.flatMap((c) =>
                c.topics.map((t) => (
                  <li key={t.slug}>
                    <label class="check">
                      <input type="checkbox" checked={!!form.topics?.includes(t.slug)} onChange={() => setForm((f) => ({ ...f, topics: toggle(f.topics, t.slug) }))} />
                      <span>{t.title[lang]}</span>
                    </label>
                  </li>
                )),
              )}
            </ul>
          </fieldset>
        )}
        <ChipSection<Difficulty> title={UI.difficulty[lang]} options={DIFFICULTY} selected={form.difficulty} onToggle={(v) => setForm((f) => ({ ...f, difficulty: toggle(f.difficulty, v) }))} lang={lang} />
        <ChipSection<McqType> title={UI.mcqType[lang]} options={MCQ_TYPE} selected={form.mcqTypes} onToggle={(v) => setForm((f) => ({ ...f, mcqTypes: toggle(f.mcqTypes, v) }))} lang={lang} />
        <div class="filter-section counts">
          <label class="field">
            <span>{UI.mcqCount[lang]}</span>
            <input type="number" inputMode="numeric" min={0} max={MAX} value={form.mcqCount} onInput={(e) => setForm((f) => ({ ...f, mcqCount: clampCount((e.target as HTMLInputElement).value) }))} />
          </label>
          <label class="field">
            <span>{UI.cqCount[lang]}</span>
            <input type="number" inputMode="numeric" min={0} max={MAX} value={form.cqCount} onInput={(e) => setForm((f) => ({ ...f, cqCount: clampCount((e.target as HTMLInputElement).value) }))} />
          </label>
        </div>
        <div class="filter-section">
          <button type="submit" class="btn btn-primary" disabled={nothingAsked}>
            {UI.buildSet[lang]}
          </button>
        </div>
      </form>
      <section aria-busy={state === 'loading'}>{result}</section>
    </div>
  );
}
