// Word (.docx) export of a question set, built in the browser with the `docx` package.
import { AlignmentType, Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from 'docx';
import { CQ_MARKS, CQ_PARTS, LABELS } from '../copy-text';
import { digits } from '../labels';
import { latexToPlain } from '../math-text';
import type { QuestionSet } from '../set-builder';
import { EXPORT_LABELS, fullMarks } from './docx-labels';

export { EXPORT_LABELS, fullMarks };
import type { Bi, Lang, RichBi, Stimulus } from '../types';

const ROMAN = ['i', 'ii', 'iii'];

export type StimulusLookup = (chapter: string, id: string) => Stimulus<RichBi> | undefined;

export const docxFileName = (set: QuestionSet) => `${set.request.subject}-set-${set.seed}.docx`;

export function buildDocx(set: QuestionSet, lang: Lang, title: string, stimuli: StimulusLookup = () => undefined): Document {
  const L = LABELS[lang];
  const E = EXPORT_LABELS[lang];
  const t = (b: Bi) => latexToPlain(b[lang]);
  const n = (x: number) => digits(x, lang);
  const p = (text: string, opts: { bold?: boolean; indent?: number } = {}) =>
    new Paragraph({ indent: opts.indent ? { left: opts.indent } : undefined, spacing: { after: 80 }, children: [new TextRun({ text, bold: opts.bold })] });
  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) => new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun(text)] });

  const body: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun(title)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun(`${E.fullMarks}: ${n(fullMarks(set))}`)] }),
  ];

  let num = 0;
  if (set.mcqs.length) {
    body.push(heading(E.mcq));
    const shown = new Set<string>();
    for (const q of set.mcqs) {
      num++;
      if (q.stimulus_id) {
        const key = `${q.chapter}/${q.stimulus_id}`;
        const st = stimuli(q.chapter, q.stimulus_id);
        if (st && !shown.has(key)) {
          shown.add(key);
          body.push(p(`${L.stimulus}: ${t(st.text)}`, { bold: false }));
        }
      }
      body.push(p(`${n(num)}. ${t(q.stem)}`));
      q.statements?.forEach((s, i) => body.push(p(`${ROMAN[i]}. ${t(s)}`, { indent: 480 })));
      body.push(p(q.options.map((o, i) => `(${L.options[i]}) ${t(o)}`).join('    '), { indent: 480 }));
    }
  }

  const cqStart = num;
  if (set.cqs.length) {
    body.push(heading(E.cq));
    for (const q of set.cqs) {
      num++;
      body.push(p(`${n(num)}. ${t(q.stimulus)}`));
      CQ_PARTS.forEach((part, i) => body.push(p(`${L.options[i]}. ${t(q.parts[part].question)} (${n(CQ_MARKS[part])})`, { indent: 480 })));
    }
  }

  body.push(new Paragraph({ children: [new PageBreak()] }), heading(E.answerSheet, HeadingLevel.HEADING_1));
  if (set.mcqs.length) {
    body.push(heading(E.mcqAnswers));
    set.mcqs.forEach((q, i) => body.push(p(`${n(i + 1)}. (${L.options[q.answer]}) ${t(q.options[q.answer])}: ${t(q.explanation)}`)));
  }
  if (set.cqs.length) {
    body.push(heading(E.cqSolutions));
    set.cqs.forEach((q, i) => {
      body.push(p(`${n(cqStart + i + 1)}.`, { bold: true }));
      CQ_PARTS.forEach((part, j) => body.push(p(`${L.options[j]}. ${t(q.parts[part].solution)}`, { indent: 480 })));
    });
  }

  return new Document({
    creator: 'SSC HSC Question Bank',
    title,
    // Word uses the complex-script (cs) font for Bangla text; Nirmala UI ships with Windows.
    styles: { default: { document: { run: { font: { ascii: 'Times New Roman', hAnsi: 'Times New Roman', cs: 'Nirmala UI' }, size: 24 } } } },
    sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 850, right: 850 } } }, children: body }],
  });
}

export async function downloadDocx(set: QuestionSet, lang: Lang, title: string, stimuli?: StimulusLookup): Promise<void> {
  const blob = await Packer.toBlob(buildDocx(set, lang, title, stimuli));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = docxFileName(set);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
