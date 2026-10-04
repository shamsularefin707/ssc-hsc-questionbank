// Plain-text form of a question, used by the copy button.
import { latexToPlain } from './math-text';
import type { Bi, Lang, Question, Stimulus } from './types';

export const LABELS = {
  bn: { options: ['ক', 'খ', 'গ', 'ঘ'], answer: 'উত্তর', explanation: 'ব্যাখ্যা', stimulus: 'উদ্দীপক', solution: 'সমাধান' },
  en: { options: ['a', 'b', 'c', 'd'], answer: 'Answer', explanation: 'Explanation', stimulus: 'Stimulus', solution: 'Solution' },
} as const;

export const CQ_PARTS = ['ka', 'kha', 'ga', 'gha'] as const;
export const CQ_MARKS = { ka: 1, kha: 2, ga: 3, gha: 4 } as const;
const ROMAN = ['i', 'ii', 'iii', 'iv', 'v'];

export function questionToPlainText(
  q: Question<Bi>,
  lang: Lang,
  opts: { withSolution: boolean; stimulus?: Stimulus<Bi> },
): string {
  const L = LABELS[lang];
  const t = (b: Bi) => latexToPlain(b[lang]);
  const lines: string[] = [];

  if (q.kind === 'mcq') {
    if (opts.stimulus) lines.push(`${L.stimulus}: ${t(opts.stimulus.text)}`, '');
    lines.push(t(q.stem));
    q.statements?.forEach((s, i) => lines.push(`${ROMAN[i]}. ${t(s)}`));
    lines.push(q.options.map((o, i) => `(${L.options[i]}) ${t(o)}`).join('  '));
    if (opts.withSolution) {
      lines.push('', `${L.answer}: (${L.options[q.answer]}) ${t(q.options[q.answer])}`, `${L.explanation}: ${t(q.explanation)}`);
    }
    return tidy(lines);
  }

  lines.push(`${L.stimulus}: ${t(q.stimulus)}`, '');
  CQ_PARTS.forEach((p, i) => {
    lines.push(`${L.options[i]}. ${t(q.parts[p].question)}`);
    if (opts.withSolution) {
      lines.push(`${L.solution}: ${t(q.parts[p].solution)}`);
      if (i < CQ_PARTS.length - 1) lines.push('');
    }
  });
  return tidy(lines);
}

const tidy = (lines: string[]) => lines.join('\n').replace(/[ \t]+$/gm, '');
