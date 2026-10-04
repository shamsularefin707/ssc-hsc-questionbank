import { useState } from 'preact/hooks';
import { CQ_MARKS, CQ_PARTS, LABELS, questionToPlainText } from '../lib/copy-text';
import { DIFFICULTY, MCQ_TYPE, UI, digits, sourceLabel } from '../lib/labels';
import type { Bi, CompiledQuestion, Cq, Figure, Lang, Mcq, RichBi, Stimulus } from '../lib/types';
import { CopyButton } from './CopyButton';

const ROMAN = ['i', 'ii', 'iii'];

export interface CardContext {
  chapterTitle?: Bi;
  topicTitles: Map<string, Bi>;
}

const Html = ({ html, as: Tag = 'div' }: { html: string; as?: 'div' | 'span' }) => (
  <Tag class="q-body" dangerouslySetInnerHTML={{ __html: html }} />
);

const rich = (b: RichBi, lang: Lang) => (lang === 'bn' ? b.bnHtml : b.enHtml);

function Figures({ figures, lang }: { figures?: Figure[]; lang: Lang }) {
  if (!figures?.length) return null;
  return (
    <>
      {figures.map((f) => (
        <figure class="figure" key={f.file}>
          <img src={f.file} alt={f.alt[lang]} loading="lazy" />
        </figure>
      ))}
    </>
  );
}

function Meta({ q, ctx, lang }: { q: CompiledQuestion; ctx: CardContext; lang: Lang }) {
  const parts: string[] = [];
  if (ctx.chapterTitle) parts.push(ctx.chapterTitle[lang]);
  const topic = ctx.topicTitles.get(q.topics[0]);
  if (topic) parts.push(topic[lang]);
  parts.push(DIFFICULTY[q.difficulty][lang]);
  if (q.kind === 'mcq') parts.push(MCQ_TYPE[q.mcq_type][lang]);
  const src = sourceLabel(q.source, lang);
  if (src) parts.push(src);
  if (q.status === 'checked') parts.push(UI.draft[lang]);
  return <p class="meta">{parts.join(' · ')}</p>;
}

function McqBody({ q, lang }: { q: Mcq<RichBi>; lang: Lang }) {
  const L = LABELS[lang].options;
  return (
    <>
      <Html html={rich(q.stem, lang)} />
      {q.statements && (
        <ol class="statements q-body">
          {q.statements.map((s, i) => (
            <li key={i}>
              <span class="opt-label">{ROMAN[i]}.</span>
              <Html as="span" html={rich(s, lang)} />
            </li>
          ))}
        </ol>
      )}
      <Figures figures={q.figures} lang={lang} />
      <ol class="options q-body">
        {q.options.map((o, i) => (
          <li key={i}>
            <span class="opt-label">({L[i]})</span>
            <Html as="span" html={rich(o, lang)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function McqSolution({ q, lang }: { q: Mcq<RichBi>; lang: Lang }) {
  return (
    <div class="solution">
      <h4>{UI.answer[lang]}</h4>
      <div class="q-body">
        <span class="opt-label">({LABELS[lang].options[q.answer]})</span>{' '}
        <span dangerouslySetInnerHTML={{ __html: rich(q.options[q.answer], lang) }} />
      </div>
      <h4>{UI.explanation[lang]}</h4>
      <Html html={rich(q.explanation, lang)} />
    </div>
  );
}

function CqBody({ q, lang }: { q: Cq<RichBi>; lang: Lang }) {
  return (
    <>
      <Html html={rich(q.stimulus, lang)} />
      <Figures figures={q.figures} lang={lang} />
      <ol class="cq-parts">
        {CQ_PARTS.map((p, i) => (
          <li key={p}>
            <span class="opt-label">{LABELS[lang].options[i]}.</span>
            <Html as="span" html={rich(q.parts[p].question, lang)} />
            <span class="part-marks">
              {digits(CQ_MARKS[p], lang)} {UI.marks[lang]}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

function CqSolution({ q, lang }: { q: Cq<RichBi>; lang: Lang }) {
  return (
    <div class="solution">
      {CQ_PARTS.map((p, i) => (
        <div key={p}>
          <h4>
            {LABELS[lang].options[i]}. {UI.solution[lang]}
          </h4>
          <Html html={rich(q.parts[p].solution, lang)} />
        </div>
      ))}
    </div>
  );
}

/** Actions + solution for one question; used by single cards and by stimulus groups. */
function QuestionBlock({ q, ctx, globalLang, stimulus }: { q: CompiledQuestion; ctx: CardContext; globalLang: Lang; stimulus?: Stimulus<RichBi> }) {
  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<Lang | null>(null);
  const lang = override ?? globalLang;
  const other: Lang = lang === 'bn' ? 'en' : 'bn';

  return (
    <div lang={lang}>
      <Meta q={q} ctx={ctx} lang={lang} />
      {q.kind === 'mcq' ? <McqBody q={q} lang={lang} /> : <CqBody q={q} lang={lang} />}
      <div class="card-actions">
        <button type="button" class="btn" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? UI.hideSolution[lang] : UI.showSolution[lang]}
        </button>
        <CopyButton lang={lang} getText={() => questionToPlainText(q, lang, { withSolution: true, stimulus })} />
        <button
          type="button"
          class="btn btn-ghost"
          onClick={() => setOverride(other === globalLang ? null : other)}
          lang={other}
          title={other === 'en' ? 'Show this question in English' : 'এই প্রশ্নটি বাংলায় দেখাও'}
        >
          {other === 'en' ? 'EN' : 'বাং'}
        </button>
      </div>
      {open && (q.kind === 'mcq' ? <McqSolution q={q} lang={lang} /> : <CqSolution q={q} lang={lang} />)}
    </div>
  );
}

export function QuestionCard({ q, ctx, lang }: { q: CompiledQuestion; ctx: CardContext; lang: Lang }) {
  return (
    <article class="card">
      <QuestionBlock q={q} ctx={ctx} globalLang={lang} />
    </article>
  );
}

/** One card holding an অভিন্ন তথ্যভিত্তিক stimulus with its questions below it. */
export function StimulusGroup({ stimulus, items, ctx, lang }: { stimulus: Stimulus<RichBi>; items: Mcq<RichBi>[]; ctx: CardContext; lang: Lang }) {
  return (
    <article class="card" lang={lang}>
      <p class="stimulus-label">{UI.stimulus[lang]}</p>
      <Html html={rich(stimulus.text, lang)} />
      <Figures figures={stimulus.figures} lang={lang} />
      {items.map((q) => (
        <div class="group-item" key={q.id}>
          <QuestionBlock q={q} ctx={ctx} globalLang={lang} stimulus={stimulus} />
        </div>
      ))}
    </article>
  );
}
