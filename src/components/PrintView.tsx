import { CQ_MARKS, CQ_PARTS, LABELS } from '../lib/copy-text';
import { EXPORT_LABELS, fullMarks } from '../lib/export/docx-labels';
import { UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import { sourceHref, useSource } from '../lib/use-source';
import { SourceState } from './SourceState';
import { setTitle } from '../lib/set-title';
import type { Lang, RichBi } from '../lib/types';

const ROMAN = ['i', 'ii', 'iii'];
const html = (b: RichBi, lang: Lang) => ({ __html: lang === 'bn' ? b.bnHtml : b.enHtml });

export function PrintView() {
  const lang = useLang();
  const src = useSource();
  if (!src.source || src.status !== 'ready' || !src.data) return <SourceState src={src} lang={lang} />;
  const { set, pool, paper } = src.data;
  const title = paper ? `${paper.title[lang]} · ${pool.manifest.title[lang]}` : setTitle(pool.manifest, lang);

  const L = LABELS[lang];
  const E = EXPORT_LABELS[lang];
  const n = (x: number) => digits(x, lang);
  const shown = new Set<string>();
  const cqStart = set.mcqs.length;

  return (
    <>
      <div class="print-toolbar no-print">
        <button type="button" class="btn btn-primary" onClick={() => window.print()}>
          {UI.savePdf[lang]}
        </button>
        <a class="btn" href={sourceHref(src.source)}>
          {paper ? UI.backToPaper[lang] : UI.backToSet[lang]}
        </a>
        <p class="hint">{UI.printHint[lang]}</p>
      </div>
      <article class="paper" lang={lang}>
        <header class="paper-head">
          <h1>{title}</h1>
          <p>
            {E.fullMarks}: {n(fullMarks(set))}
          </p>
        </header>

        {set.mcqs.length > 0 && (
          <section>
            <h2>{E.mcq}</h2>
            <ol class="paper-list">
              {set.mcqs.map((q, i) => {
                const key = q.stimulus_id ? `${q.chapter}/${q.stimulus_id}` : '';
                const st = key && !shown.has(key) ? pool.stimuli.get(key) : undefined;
                if (st) shown.add(key);
                return (
                  <li class="paper-q" key={q.id}>
                    {st && (
                      <div class="paper-stimulus">
                        <strong>{L.stimulus}:</strong> <span dangerouslySetInnerHTML={html(st.text, lang)} />
                        {st.figures?.map((f) => <img key={f.file} class="paper-fig" src={f.file} alt={f.alt[lang]} />)}
                      </div>
                    )}
                    <div class="paper-row">
                      <span class="paper-num">{n(i + 1)}.</span>
                      <div>
                        <div dangerouslySetInnerHTML={html(q.stem, lang)} />
                        {q.statements?.map((s, j) => (
                          <div key={j} class="paper-sub">
                            {ROMAN[j]}. <span dangerouslySetInnerHTML={html(s, lang)} />
                          </div>
                        ))}
                        {q.figures?.map((f) => <img key={f.file} class="paper-fig" src={f.file} alt={f.alt[lang]} />)}
                        <div class="paper-options">
                          {q.options.map((o, j) => (
                            <span key={j}>
                              ({L.options[j]}) <span dangerouslySetInnerHTML={html(o, lang)} />
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {set.cqs.length > 0 && (
          <section>
            <h2>{E.cq}</h2>
            <ol class="paper-list">
              {set.cqs.map((q, i) => (
                <li class="paper-q" key={q.id}>
                  <div class="paper-row">
                    <span class="paper-num">{n(cqStart + i + 1)}.</span>
                    <div>
                      <div dangerouslySetInnerHTML={html(q.stimulus, lang)} />
                      {q.figures?.map((f) => <img key={f.file} class="paper-fig" src={f.file} alt={f.alt[lang]} />)}
                      {CQ_PARTS.map((p, j) => (
                        <div key={p} class="paper-sub paper-part">
                          <span>
                            {L.options[j]}. <span dangerouslySetInnerHTML={html(q.parts[p].question, lang)} />
                          </span>
                          <span class="paper-marks">{n(CQ_MARKS[p])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section class="answer-sheet">
          <h2>{E.answerSheet}</h2>
          {set.mcqs.length > 0 && (
            <>
              <h3>{E.mcqAnswers}</h3>
              <ol class="paper-list">
                {set.mcqs.map((q, i) => (
                  <li class="paper-q" key={q.id}>
                    <div class="paper-row">
                      <span class="paper-num">{n(i + 1)}.</span>
                      <div>
                        <strong>
                          ({L.options[q.answer]}) <span dangerouslySetInnerHTML={html(q.options[q.answer], lang)} />
                        </strong>
                        <div class="paper-expl" dangerouslySetInnerHTML={html(q.explanation, lang)} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
          {set.cqs.length > 0 && (
            <>
              <h3>{E.cqSolutions}</h3>
              <ol class="paper-list">
                {set.cqs.map((q, i) => (
                  <li class="paper-q" key={q.id}>
                    <div class="paper-row">
                      <span class="paper-num">{n(cqStart + i + 1)}.</span>
                      <div>
                        {CQ_PARTS.map((p, j) => (
                          <div key={p} class="paper-sub">
                            {L.options[j]}. <span dangerouslySetInnerHTML={html(q.parts[p].solution, lang)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </article>
    </>
  );
}
