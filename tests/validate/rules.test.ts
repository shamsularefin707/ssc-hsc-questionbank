import { describe, expect, test } from 'vitest';
import { readContentFiles, type RawFile } from '../../src/lib/content/load';
import { validateAll, evaluate } from '../../src/lib/validate/rules';

const FIXTURE = 'tests/fixtures/good/content';
const fresh = (): RawFile[] => structuredClone(readContentFiles(FIXTURE));
const file = (files: RawFile[], suffix: string) => files.find((f) => f.file.endsWith(suffix))!.data;
const has = (files: RawFile[], rule: string, severity = 'error') =>
  validateAll(files).some((i) => i.rule === rule && i.severity === severity);

describe('validator', () => {
  test('good fixture has no issues', () => {
    expect(validateAll(fresh())).toEqual([]);
  });

  test('real content has no errors', () => {
    const errors = validateAll(readContentFiles('content')).filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  test('schema', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[0].answer = 7;
    expect(has(f, 'schema')).toBe(true);
  });

  test('bilingual-nonempty', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[0].stem.en = '   ';
    expect(has(f, 'bilingual-nonempty')).toBe(true);
  });

  test('math-delimiters', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[1].stem.bn = '$2x কত';
    expect(has(f, 'math-delimiters')).toBe(true);
  });

  test('math-delimiters ignores escaped dollars', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[0].explanation.en = 'It costs \\$5.';
    expect(has(f, 'math-delimiters')).toBe(false);
  });

  test('unique-id', () => {
    const f = fresh();
    file(f, 'cq.yaml').questions[0].id = 't-mcq-1';
    expect(has(f, 'unique-id')).toBe(true);
  });

  test('topic-exists', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[0].topics = ['gamma'];
    expect(has(f, 'topic-exists')).toBe(true);
  });

  test('topic-exists catches an unknown chapter', () => {
    const f = fresh();
    file(f, 'cq.yaml').chapter = '99-missing';
    expect(has(f, 'topic-exists')).toBe(true);
  });

  test('distinct-options', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[0].options[1].en = ' Apple ';
    expect(has(f, 'distinct-options')).toBe(true);
  });

  test('stimulus-ref: unresolved id', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[1].stimulus_id = 'nope';
    expect(has(f, 'stimulus-ref')).toBe(true);
  });

  test('stimulus-ref: stimulus used once', () => {
    const f = fresh();
    const q = file(f, 'mcq.yaml').questions[2];
    q.mcq_type = 'gyanmulok';
    delete q.stimulus_id;
    expect(has(f, 'stimulus-ref')).toBe(true);
  });

  test('paper-ref: missing question', () => {
    const f = fresh();
    file(f, 'dhaka-2023.yaml').mcq.push('ghost');
    expect(has(f, 'paper-ref')).toBe(true);
  });

  test('paper-ref: source mismatch', () => {
    const f = fresh();
    file(f, 'dhaka-2023.yaml').mcq = ['t-mcq-2'];
    expect(has(f, 'paper-ref')).toBe(true);
  });

  test('figure-exists', () => {
    const f = fresh();
    file(f, 'cq.yaml').questions[0].figures[0].file = 'figures/missing.svg';
    expect(has(f, 'figure-exists')).toBe(true);
  });

  test('computable: wrong expected value', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[1].computable.expected = 5;
    expect(has(f, 'computable')).toBe(true);
  });

  test('computable: expected value not in the correct option', () => {
    const f = fresh();
    file(f, 'mcq.yaml').questions[1].answer = 0;
    expect(has(f, 'computable')).toBe(true);
  });

  test('near-duplicate is a warning', () => {
    const f = fresh();
    const qs = file(f, 'mcq.yaml').questions;
    qs[2].stem.en = qs[0].stem.en.replace('correct', 'correct?');
    expect(has(f, 'near-duplicate', 'warning')).toBe(true);
  });

  test('evaluate handles precedence, powers and sqrt, and rejects code', () => {
    expect(evaluate('1 + 2*3')).toBe(7);
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('-(4 - 6)/2')).toBe(1);
    expect(evaluate('sqrt(2*9.8*20)')).toBeCloseTo(19.799, 3);
    expect(() => evaluate('process.exit()')).toThrow();
  });
});
