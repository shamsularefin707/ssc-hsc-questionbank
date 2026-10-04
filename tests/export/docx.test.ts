import JSZip from 'jszip';
import { Packer } from 'docx';
import { describe, expect, test } from 'vitest';
import { toRich } from '../../src/lib/compile';
import { buildDocx, docxFileName } from '../../src/lib/export/docx';
import type { QuestionSet } from '../../src/lib/set-builder';
import { cq, mcq } from '../helpers';

const set: QuestionSet = {
  request: { level: 'ssc', subject: 'physics', chapters: [], difficulty: [], mcqCount: 3, cqCount: 1 },
  seed: 7,
  mcqs: [mcq('m1'), mcq('p1', { stimulus_id: 's' }), mcq('p2', { stimulus_id: 's' })],
  cqs: [cq('c1')],
  available: { mcq: 3, cq: 1 },
  shortfall: false,
};
const stim = { id: 's', text: toRich({ bn: 'উদ্দীপক লেখা', en: 'A ball falls $h=5$ m' }) };
const stimuli = (ch: string, id: string) => (id === 's' ? stim : undefined);

async function xml(lang: 'bn' | 'en') {
  const buf = await Packer.toBuffer(buildDocx(set, lang, 'Test Title', stimuli));
  return (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
}
const text = (x: string) => [...x.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(' ');

describe('buildDocx', () => {
  test('has the title, every MCQ stem, and the answer sheet after a page break', async () => {
    const x = await xml('en');
    const t = text(x);
    expect(t).toContain('Test Title');
    for (const id of ['m1', 'p1', 'p2']) expect(t).toContain(`Stem ${id}`);
    const sheet = x.indexOf('Answer Sheet');
    expect(sheet).toBeGreaterThan(0);
    expect(x.lastIndexOf('<w:br w:type="page"/>', sheet)).toBeGreaterThan(0);
  });

  test('numbers MCQs from 1 and CQs after them, with parts and marks', async () => {
    const t = text(await xml('en'));
    expect(t).toMatch(/1\.\s+Stem m1/);
    expect(t).toMatch(/3\.\s+Stem p2/);
    expect(t).toMatch(/4\.\s+Stimulus c1/);
    expect(t).toMatch(/a\.\s+Q\s+\(1\)/);
    expect(t).toMatch(/d\.\s+Q\s+\(4\)/);
  });

  test('prints a shared stimulus once, as plain text math', async () => {
    const t = text(await xml('en'));
    expect(t.match(/A ball falls h = 5 m|A ball falls h=5 m/g)?.length).toBe(1);
  });

  test('Bangla uses Bangla labels and digits', async () => {
    const t = text(await xml('bn'));
    expect(t).toContain('উত্তরপত্র');
    expect(t).toMatch(/১\.\s+Stem m1/);
    expect(t).toMatch(/ক\.\s+Q\s+\(১\)/);
  });

  test('file name is <subject>-set-<seed>.docx', () => {
    expect(docxFileName(set)).toBe('physics-set-7.docx');
  });
});
