import { describe, expect, test } from 'vitest';
import { deriveContent, readContentFiles } from '../src/lib/content/load';
import { compileAll } from '../src/lib/compile';

const FIXTURE = 'tests/fixtures/good/content';

function contentWithStatuses(statuses: Record<string, string>) {
  const files = structuredClone(readContentFiles(FIXTURE));
  for (const f of files) for (const q of f.data.questions ?? []) if (statuses[q.id]) q.status = statuses[q.id];
  return deriveContent(files);
}

describe('compileAll', () => {
  test('only reviewed questions are published by default', () => {
    const out = compileAll(contentWithStatuses({ 't-mcq-1': 'draft', 't-cq-1': 'checked' }), { showDrafts: false });
    const ids = out.chapters[0].questions.map((q) => q.id);
    expect(ids).not.toContain('t-mcq-1');
    expect(ids).not.toContain('t-cq-1');
    expect(ids).toContain('t-mcq-2');
  });

  test('showDrafts adds checked questions but never drafts', () => {
    const out = compileAll(contentWithStatuses({ 't-mcq-1': 'draft', 't-cq-1': 'checked' }), { showDrafts: true });
    const ids = out.chapters[0].questions.map((q) => q.id);
    expect(ids).toContain('t-cq-1');
    expect(ids).not.toContain('t-mcq-1');
  });

  test('manifest counts match the chapter files', () => {
    const out = compileAll(deriveContent(readContentFiles(FIXTURE)), { showDrafts: false });
    const m = out.manifests[0];
    expect(m.chapters[0].counts).toEqual({ mcq: 3, cq: 1 });
    expect(m.papers.map((p) => p.id)).toEqual(['ssc-physics-dhaka-2023']);
  });

  test('text fields carry pre-rendered HTML and figures get site paths', () => {
    const out = compileAll(deriveContent(readContentFiles(FIXTURE)), { showDrafts: false });
    const ch = out.chapters[0];
    expect(ch.stimuli.s1.text.enHtml).toContain('class="katex"');
    const cq = ch.questions.find((q) => q.id === 't-cq-1')!;
    expect(cq.figures![0].file).toBe('/data/ssc/physics/01-test/figures/f.svg');
    expect(ch.title.en).toBe('Test');
  });

  test('search index finds a question by English and Bangla words', () => {
    const out = compileAll(deriveContent(readContentFiles(FIXTURE)), { showDrafts: false });
    const search = out.searchIndex('ssc', 'physics');
    expect(search.search('square').map((r) => r.id)).toContain('t-mcq-3');
    expect(search.search('প্রশ্ন').map((r) => r.id)).toContain('t-mcq-1');
  });
});
