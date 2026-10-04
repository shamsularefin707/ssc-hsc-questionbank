import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DataLoadError, loadChapter, loadSearch } from '../lib/data-client';
import { filterQuestions, groupForDisplay, type Filters } from '../lib/filter';
import { DIFFICULTY, KIND, MCQ_TYPE, SOURCE_KIND, UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { decodeFilters, encodeFilters, normalizeFilters } from '../lib/url-state';
import type { Bi, ChapterData, CompiledQuestion, Lang, SubjectManifest } from '../lib/types';
import { FilterChip } from './FilterChip';
import { Icon } from './Icon';
import { QuestionCard, StimulusGroup, type CardContext } from './QuestionCard';

const PAGE = 20;
const SKELETON_DELAY = 300;
type ListKey = Exclude<keyof Filters, 'q'>;

function toggle<T>(list: T[] | undefined, v: T): T[] {
  const set = new Set(list ?? []);
  set.has(v) ? set.delete(v) : set.add(v);
  return [...set];
}

export function QuestionBank({ manifest }: { manifest: SubjectManifest }) {
  const lang = useLang();
  const [filters, setFilters] = useState<Filters>({});
  const [ready, setReady] = useState(false);
  const [lastChanged, setLastChanged] = useState<keyof Filters | null>(null);
  const [data, setData] = useState<Record<string, ChapterData>>({});
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hits, setHits] = useState<Set<string> | undefined>();
  const [visible, setVisible] = useState(PAGE);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const withQuestions = manifest.chapters.filter((c) => c.counts.mcq + c.counts.cq > 0);
  const known = withQuestions.map((c) => c.slug);

  // Read filters from the URL once, dropping chapters that no longer exist.
  useEffect(() => {
    const f = normalizeFilters(decodeFilters(location.search), known);
    setFilters(f);
    setQuery(f.q ?? '');
    setReady(true);
  }, []);

  // Keep the URL in sync.
  useEffect(() => {
    if (!ready) return;
    history.replaceState(null, '', location.pathname + encodeFilters(filters));
    setVisible(PAGE);
  }, [filters, ready]);

  const wanted = filters.chapters?.length ? filters.chapters : known;
  const wantedKey = wanted.join(',');

  // Load the chapters the current filters need.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoadState('loading');
    const t = window.setTimeout(() => !cancelled && setShowSkeleton(true), SKELETON_DELAY);
    Promise.all(wanted.map((c) => loadChapter(manifest.level, manifest.subject, c)))
      .then((chs) => {
        if (cancelled) return;
        setData((d) => ({ ...d, ...Object.fromEntries(chs.map((c) => [c.chapter, c])) }));
        setLoadState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        if (!(e instanceof DataLoadError)) console.error(e);
        setLoadState('error');
      })
      .finally(() => {
        window.clearTimeout(t);
        if (!cancelled) setShowSkeleton(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [wantedKey, ready, retry]);

  // Debounced keyword search.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      const q = query.trim();
      setFilters((f) => (f.q === (q || undefined) ? f : { ...f, q: q || undefined }));
      if (q) setLastChanged('q');
    }, 200);
    return () => window.clearTimeout(t);
  }, [query, ready]);

  useEffect(() => {
    const q = filters.q?.trim();
    if (!q) {
      setHits(undefined);
      return;
    }
    let cancelled = false;
    loadSearch(manifest.level, manifest.subject)
      .then((ms) => !cancelled && setHits(new Set(ms.search(q).map((r) => String(r.id)))))
      .catch(() => !cancelled && setHits(new Set()));
    return () => {
      cancelled = true;
    };
  }, [filters.q]);

  // Drawer: Escape closes, focus moves in and returns to the trigger.
  useEffect(() => {
    if (!drawer) return;
    const el = drawerRef.current;
    el?.querySelector<HTMLElement>('button, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.key !== 'Tab' || !el) return;
      const focusables = [...el.querySelectorAll<HTMLElement>('button, input, a[href]')].filter((n) => !n.hasAttribute('disabled'));
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      toggleRef.current?.focus();
    };
  }, [drawer]);

  const update = (key: ListKey, value: string) => {
    setLastChanged(key);
    setFilters((f) => {
      const next = { ...f, [key]: toggle(f[key] as string[] | undefined, value) } as Filters;
      // Topics only make sense for the chapters still selected.
      if (key === 'chapters' && next.topics?.length) {
        const allowed = new Set(manifest.chapters.filter((c) => next.chapters?.includes(c.slug)).flatMap((c) => c.topics.map((t) => t.slug)));
        next.topics = next.topics.filter((t) => allowed.has(t));
      }
      return normalizeFilters(next, known);
    });
  };

  const clearKey = (key: keyof Filters) => {
    setFilters((f) => ({ ...f, [key]: undefined }));
    if (key === 'q') setQuery('');
    setLastChanged(null);
  };

  const clearAll = () => {
    setFilters({});
    setQuery('');
    setLastChanged(null);
  };

  const questions: CompiledQuestion[] = useMemo(
    () => wanted.flatMap((c) => data[c]?.questions ?? []),
    [data, wantedKey],
  );
  const filtered = useMemo(() => filterQuestions(questions, filters, hits), [questions, filters, hits]);
  const items = useMemo(() => groupForDisplay(filtered), [filtered]);

  const topicTitles = useMemo(() => new Map(manifest.chapters.flatMap((c) => c.topics.map((t) => [t.slug, t.title] as [string, Bi]))), [manifest]);
  const chapterTitle = (slug: string) => manifest.chapters.find((c) => c.slug === slug)?.title;
  const ctxFor = (chapter: string): CardContext => ({ chapterTitle: filters.chapters?.length === 1 ? undefined : chapterTitle(chapter), topicTitles });

  const activeCount = (['chapters', 'topics', 'difficulty', 'kind', 'mcqType', 'source'] as ListKey[]).reduce((n, k) => n + ((filters[k] as unknown[] | undefined)?.length ?? 0), 0) + (filters.q ? 1 : 0);
  const summaryBits = [
    ...(filters.chapters ?? []).map((c) => chapterTitle(c)?.[lang]),
    ...(filters.difficulty ?? []).map((d) => DIFFICULTY[d][lang]),
    ...(filters.kind ?? []).map((k) => KIND[k][lang]),
    ...(filters.mcqType ?? []).map((t) => MCQ_TYPE[t][lang]),
    ...(filters.source ?? []).map((s) => SOURCE_KIND[s][lang]),
  ].filter(Boolean);
  const countText = lang === 'bn' ? `${digits(filtered.length, 'bn')}${UI.questions.bn}` : `${filtered.length}${UI.questions.en}`;

  const selectedChapters = manifest.chapters.filter((c) => filters.chapters?.includes(c.slug));
  const showMcqType = !(filters.kind?.length === 1 && filters.kind[0] === 'cq');

  const filterPanel = (
    <aside class="filters" ref={drawerRef} data-open={drawer} aria-label={UI.filters[lang]} id="filters">
      <div class="filters-head">
        <h2>{UI.filters[lang]}</h2>
        <button type="button" class="btn btn-ghost" onClick={() => setDrawer(false)} aria-label={UI.closeFilters[lang]}>
          <Icon name="x" />
        </button>
      </div>
      <fieldset class="filter-section" style={{ border: 0, margin: 0 }}>
        <legend class="visually-hidden">{UI.chapters[lang]}</legend>
        <h3 aria-hidden="true">{UI.chapters[lang]}</h3>
        <ul class="check-list">
          {manifest.chapters.map((c) => {
            const n = c.counts.mcq + c.counts.cq;
            return (
              <li key={c.slug}>
                <label class="check" aria-disabled={n === 0}>
                  <input type="checkbox" disabled={n === 0} checked={!!filters.chapters?.includes(c.slug)} onChange={() => update('chapters', c.slug)} />
                  <span>
                    {digits(c.number, lang)}. {c.title[lang]}
                  </span>
                  <span class="count">{n ? digits(n, lang) : UI.comingSoon[lang]}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {selectedChapters.length > 0 && (
        <fieldset class="filter-section" style={{ border: 0, margin: 0 }}>
          <legend class="visually-hidden">{UI.topics[lang]}</legend>
          <h3 aria-hidden="true">{UI.topics[lang]}</h3>
          <ul class="check-list">
            {selectedChapters.flatMap((c) =>
              c.topics.map((t) => (
                <li key={t.slug}>
                  <label class="check">
                    <input type="checkbox" checked={!!filters.topics?.includes(t.slug)} onChange={() => update('topics', t.slug)} />
                    <span>{t.title[lang]}</span>
                  </label>
                </li>
              )),
            )}
          </ul>
        </fieldset>
      )}
      <ChipSection title={UI.difficulty[lang]} options={DIFFICULTY} selected={filters.difficulty} onToggle={(v) => update('difficulty', v)} lang={lang} />
      <ChipSection title={UI.kind[lang]} options={KIND} selected={filters.kind} onToggle={(v) => update('kind', v)} lang={lang} />
      {showMcqType && <ChipSection title={UI.mcqType[lang]} options={MCQ_TYPE} selected={filters.mcqType} onToggle={(v) => update('mcqType', v)} lang={lang} />}
      <ChipSection title={UI.source[lang]} options={SOURCE_KIND} selected={filters.source} onToggle={(v) => update('source', v)} lang={lang} />
    </aside>
  );

  let body;
  if (loadState === 'error') {
    body = (
      <div class="state" role="alert">
        <h2>{UI.loadError[lang]}</h2>
        <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={() => setRetry((r) => r + 1)}>
          {UI.tryAgain[lang]}
        </button>
      </div>
    );
  } else if (loadState === 'loading') {
    body = showSkeleton ? (
      <div class="cards" aria-busy="true">
        <div class="skeleton" />
        <div class="skeleton" />
        <div class="skeleton" />
      </div>
    ) : null;
  } else if (!items.length) {
    body = (
      <div class="state">
        <h2>{UI.noMatch[lang]}</h2>
        <p>{UI.noMatchHint[lang]}</p>
        {lastChanged && activeCount > 1 ? (
          <button type="button" class="btn" onClick={() => clearKey(lastChanged)}>
            {UI.clearLast[lang]}
          </button>
        ) : (
          <button type="button" class="btn" onClick={clearAll}>
            {UI.clearAll[lang]}
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <div class="cards">
          {items.slice(0, visible).map((it) => {
            if ('stimulusId' in it) {
              const stimulus = data[it.chapter]?.stimuli[it.stimulusId];
              if (!stimulus) return null;
              return <StimulusGroup key={`${it.chapter}/${it.stimulusId}`} stimulus={stimulus} items={it.items} ctx={ctxFor(it.chapter)} lang={lang} />;
            }
            return <QuestionCard key={it.id} q={it} ctx={ctxFor(it.chapter)} lang={lang} />;
          })}
        </div>
        {items.length > visible && (
          <button type="button" class="btn show-more" onClick={() => setVisible((v) => v + PAGE)}>
            {UI.showMore[lang]}
          </button>
        )}
      </>
    );
  }

  return (
    <div class="bank">
      {filterPanel}
      {drawer && <div class="scrim" onClick={() => setDrawer(false)} />}
      <section aria-busy={loadState === 'loading'}>
        <div class="search">
          <Icon name="search" />
          <label class="visually-hidden" for="q">
            {UI.search[lang]}
          </label>
          <input id="q" type="search" value={query} placeholder={UI.search[lang]} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} autocomplete="off" />
          {query && (
            <button type="button" class="clear" onClick={() => clearKey('q')} aria-label={UI.clearSearch[lang]}>
              <Icon name="x" />
            </button>
          )}
        </div>
        <div class="results-bar">
          <button ref={toggleRef} type="button" class="btn filters-toggle" aria-expanded={drawer} aria-controls="filters" onClick={() => setDrawer(true)}>
            <Icon name="filter" />
            {UI.filters[lang]}
            {activeCount > 0 && ` (${digits(activeCount, lang)})`}
          </button>
          <span class="summary" aria-live="polite">{loadState === 'ready' && [countText, ...summaryBits].join(' · ')}</span>
          {activeCount > 0 && (
            <button type="button" class="btn-text" onClick={clearAll}>
              {UI.clearAll[lang]}
            </button>
          )}
        </div>
        {body}
      </section>
    </div>
  );
}

function ChipSection<K extends string>({ title, options, selected, onToggle, lang }: { title: string; options: Record<K, Bi>; selected?: K[]; onToggle: (v: K) => void; lang: Lang }) {
  return (
    <div class="filter-section" role="group" aria-label={title}>
      <h3>{title}</h3>
      <div class="chips">
        {(Object.keys(options) as K[]).map((k) => (
          <FilterChip key={k} pressed={!!selected?.includes(k)} onToggle={() => onToggle(k)}>
            {options[k][lang]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

