// Compiles content/ into public/data/ for the site.
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadContent } from '../src/lib/content/load';
import { compileAll } from '../src/lib/compile';

const OUT = 'public';
const showDrafts = process.env.SHOW_DRAFTS === '1';

const write = (urlPath: string, data: unknown) => {
  const file = path.join(OUT, urlPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
};

const site = compileAll(await loadContent('content'), { showDrafts });
rmSync(path.join(OUT, 'data'), { recursive: true, force: true });

for (const ch of site.chapters) write(`/data/${ch.level}/${ch.subject}/${ch.chapter}.json`, ch);
for (const m of site.manifests) {
  write(`/data/${m.level}/${m.subject}/index.json`, m);
  write(`/data/${m.level}/${m.subject}/search.json`, JSON.stringify(site.searchIndex(m.level, m.subject)));
}
write('/data/papers.json', site.papers);
for (const f of site.figures) {
  const to = path.join(OUT, f.to);
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(f.from, to);
}

const total = site.chapters.reduce((n, c) => n + c.questions.length, 0);
console.log(`Compiled ${total} questions in ${site.chapters.length} chapters${showDrafts ? ' (including checked drafts)' : ''}.`);
