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

describe('docx text and figures', () => {
  const multi: QuestionSet = { ...set, mcqs: [], cqs: [{ ...cq('c9'), parts: { ...cq('c9').parts, ka: { question: toRich({ bn: 'প্রশ্ন', en: 'Q' }), solution: toRich({ bn: 'ক\nখ', en: 'line one\nline two' }) } } }] };
  test('newlines become line breaks, not spaces', async () => {
    const buf = await Packer.toBuffer(buildDocx(multi, 'en', 'T'));
    const x = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
    expect(x).not.toMatch(/line one\nline two/);
    expect(x).toMatch(/line one<\/w:t><\/w:r><w:r>(<w:rPr>.*?<\/w:rPr>)?<w:br\/><w:t[^>]*>line two/);
  });

  const withFig: QuestionSet = { ...set, mcqs: [{ ...mcq('f1'), figures: [{ file: '/data/x/graph.svg', alt: { bn: 'লেখচিত্র', en: 'velocity-time graph' } }] }], cqs: [] };
  test('a figure without image data becomes a labelled placeholder', async () => {
    const buf = await Packer.toBuffer(buildDocx(withFig, 'en', 'T'));
    const x = await (await JSZip.loadAsync(buf)).file('word/document.xml')!.async('string');
    expect(text(x)).toContain('[Figure: velocity-time graph]');
  });

  test('a figure with image data is embedded as a picture', async () => {
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const images = new Map([['/data/x/graph.svg', { data: png, width: 400, height: 300 }]]);
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildDocx(withFig, 'en', 'T', stimuli, images)));
    const x = await zip.file('word/document.xml')!.async('string');
    expect(x).toContain('<w:drawing>');
    expect(Object.keys(zip.files).some((f) => f.startsWith('word/media/'))).toBe(true);
  });
});
