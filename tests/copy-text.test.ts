import { expect, test } from 'vitest';
import { questionToPlainText } from '../src/lib/copy-text';
import type { Cq, Mcq, Question } from '../src/lib/types';

const base: Pick<Question, 'level' | 'subject' | 'chapter' | 'topics' | 'difficulty' | 'source' | 'status'> = {
  level: 'ssc', subject: 'physics', chapter: '02-motion', topics: ['x'], difficulty: 'easy', source: { kind: 'original' }, status: 'reviewed',
};

const simple: Mcq = {
  ...base, id: 'm', kind: 'mcq', mcq_type: 'gyanmulok',
  stem: { bn: 'ত্বরণের একক কোনটি?', en: 'Unit of acceleration?' },
  options: [{ bn: '$\\text{m s}^{-1}$', en: 'm/s' }, { bn: '$\\text{m s}^{-2}$', en: 'm/s²' }, { bn: 'N', en: 'N' }, { bn: 'J', en: 'J' }],
  answer: 1, explanation: { bn: 'কারণ', en: 'Because' },
};

const bohupodi: Mcq = {
  ...base, id: 'b', kind: 'mcq', mcq_type: 'bohupodi',
  stem: { bn: 'পড়ন্ত বস্তু—', en: 'For a falling body—' },
  statements: [{ bn: 'এক', en: 'one' }, { bn: 'দুই', en: 'two' }, { bn: 'তিন', en: 'three' }],
  options: [{ bn: 'i ও ii', en: 'i and ii' }, { bn: 'i ও iii', en: 'i and iii' }, { bn: 'ii ও iii', en: 'ii and iii' }, { bn: 'সব', en: 'i, ii and iii' }],
  answer: 0, explanation: { bn: 'ব্যাখ্যা', en: 'Since $v = gt$.' },
};

const cq: Cq = {
  ...base, id: 'c', kind: 'cq',
  stimulus: { bn: 'উদ্দীপক', en: 'A car at $10\\ \\text{m s}^{-1}$.' },
  parts: {
    ka: { question: { bn: 'ক', en: 'Define speed.' }, solution: { bn: 'ক', en: 'Distance per time.' } },
    kha: { question: { bn: 'খ', en: 'Why?' }, solution: { bn: 'খ', en: 'Because.' } },
    ga: { question: { bn: 'গ', en: 'Find v.' }, solution: { bn: 'গ', en: '$v = 20$' } },
    gha: { question: { bn: 'ঘ', en: 'Analyse.' }, solution: { bn: 'ঘ', en: 'Line one\nLine two' } },
  },
};

test('Bangla MCQ without solution', () => {
  expect(questionToPlainText(simple, 'bn', { withSolution: false })).toBe('ত্বরণের একক কোনটি?\n(ক) m s⁻¹  (খ) m s⁻²  (গ) N  (ঘ) J');
});

test('English bohupodi MCQ with solution', () => {
  expect(questionToPlainText(bohupodi, 'en', { withSolution: true })).toBe(
    'For a falling body—\ni. one\nii. two\niii. three\n(a) i and ii  (b) i and iii  (c) ii and iii  (d) i, ii and iii\n\nAnswer: (a) i and ii\nExplanation: Since v = gt.',
  );
});

test('ovinno MCQ copies its stimulus first', () => {
  const q = { ...simple, mcq_type: 'ovinno' as const, stimulus_id: 's' };
  const text = questionToPlainText(q, 'en', { withSolution: false, stimulus: { id: 's', text: { bn: 'উ', en: 'Read this.' } } });
  expect(text.startsWith('Stimulus: Read this.\n\nUnit of acceleration?')).toBe(true);
});

test('English CQ with solution', () => {
  expect(questionToPlainText(cq, 'en', { withSolution: true })).toBe(
    [
      'Stimulus: A car at 10 m s⁻¹.',
      '',
      'a. Define speed.',
      'Solution: Distance per time.',
      '',
      'b. Why?',
      'Solution: Because.',
      '',
      'c. Find v.',
      'Solution: v = 20',
      '',
      'd. Analyse.',
      'Solution: Line one\nLine two',
    ].join('\n'),
  );
});

test('Bangla CQ without solution uses ক–ঘ labels', () => {
  expect(questionToPlainText(cq, 'bn', { withSolution: false })).toBe('উদ্দীপক: উদ্দীপক\n\nক. ক\nখ. খ\nগ. গ\nঘ. ঘ');
});
