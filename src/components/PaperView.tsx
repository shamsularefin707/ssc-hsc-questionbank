import { useMemo } from 'preact/hooks';
import { groupForDisplay } from '../lib/filter';
import { UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { useSource } from '../lib/use-source';
import type { Bi } from '../lib/types';
import { ExportWordButton } from './ExportWordButton';
import { QuestionList, type CardContext } from './QuestionCard';
import { SourceState } from './SourceState';

/** A whole board or admission paper (?id=…) with practice, mock, print and Word actions. */
export function PaperView() {
  const lang = useLang();
  const src = useSource('id');
  const items = useMemo(() => (src.data ? groupForDisplay([...src.data.mcqs, ...src.data.cqs]) : []), [src.data]);
  if (!src.data || src.status !== 'ready' || !src.data.paper) return <SourceState src={src} lang={lang} />;
  const { paper, pool, set, mcqs, cqs } = src.data;
  const m = pool.manifest;
  const topicTitles = new Map(m.chapters.flatMap((c) => c.topics.map((t) => [t.slug, t.title] as [string, Bi])));
  const ctxFor = (chapter: string): CardContext => ({ chapterTitle: m.chapters.find((c) => c.slug === chapter)?.title, topicTitles });
  const title = `${paper.title[lang]} · ${m.title[lang]}`;

  return (
    <>
      <div class="page-head">
        <h1>{title}</h1>
        <p>
          {digits(mcqs.length, lang)} MCQ · {digits(cqs.length, lang)} CQ
        </p>
      </div>
      <div class="results-bar set-actions">
        {mcqs.length > 0 && (
          <a class="btn" href={`/practice?paper=${paper.id}`}>
            {UI.practisePaper[lang]}
          </a>
        )}
        <a class="btn" href={`/${paper.level}/${paper.subject}/mock?paper=${paper.id}`}>
          {UI.mockPaper[lang]}
        </a>
        <a class="btn" href={`/print?paper=${paper.id}`}>
          {UI.printPdf[lang]}
        </a>
        <ExportWordButton set={set} pool={pool} lang={lang} title={title} fileName={`${paper.id}.docx`} />
      </div>
      <QuestionList items={items} stimuli={(ch, id) => pool.stimuli.get(`${ch}/${id}`)} ctxFor={ctxFor} lang={lang} />
    </>
  );
}
