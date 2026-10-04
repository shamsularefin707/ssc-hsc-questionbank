// Compiles loaded content into the JSON the site serves.
import type MiniSearch from 'minisearch';
import { renderRich } from './render';
import { createSearch, plain, type SearchDoc } from './search';
import type { LoadedChapter, LoadedContent } from './content/load';
import type {
  Bi, ChapterData, CompiledQuestion, Cq, Figure, Level, Mcq, PaperIndex, Question, RichBi, Stimulus, SubjectManifest, Syllabus,
} from './types';

export interface CompileOptions {
  /** Also publish `checked` questions (shown with a Draft label). `draft` is never published. */
  showDrafts: boolean;
}

export interface CompiledSite {
  chapters: ChapterData[];
  manifests: SubjectManifest[];
  papers: PaperIndex[];
  searchIndex(level: Level, subject: string): MiniSearch<SearchDoc>;
  /** Figures to copy: source path on disk → output path under public/. */
  figures: { from: string; to: string }[];
}

export const toRich = (b: Bi): RichBi => ({ ...b, bnHtml: renderRich(b.bn), enHtml: renderRich(b.en) });

export const dataPath = (level: Level, subject: string, chapter: string) => `/data/${level}/${subject}/${chapter}`;

function compileQuestion(q: Question, figureBase: string): CompiledQuestion {
  const figures = q.figures?.map((f) => ({ ...f, file: `${figureBase}/${f.file}` }));
  if (q.kind === 'mcq') {
    const m = q as Mcq;
    return {
      ...m,
      figures,
      stem: toRich(m.stem),
      statements: m.statements?.map(toRich),
      options: m.options.map(toRich) as Mcq<RichBi>['options'],
      explanation: toRich(m.explanation),
    };
  }
  const c = q as Cq;
  const part = (p: Cq['parts']['ka']) => ({ question: toRich(p.question), solution: toRich(p.solution) });
  return {
    ...c,
    figures,
    stimulus: toRich(c.stimulus),
    parts: { ka: part(c.parts.ka), kha: part(c.parts.kha), ga: part(c.parts.ga), gha: part(c.parts.gha) },
  };
}

const published = (q: Question, opts: CompileOptions) => q.status === 'reviewed' || (opts.showDrafts && q.status === 'checked');

/** Published questions of a chapter. An অভিন্ন তথ্যভিত্তিক set ships whole or not at all. */
function publishedQuestions(ch: LoadedChapter, opts: CompileOptions): Question[] {
  const blocked = new Set(ch.questions.filter((q) => !published(q, opts) && q.kind === 'mcq' && q.stimulus_id).map((q) => (q as Mcq).stimulus_id));
  return ch.questions.filter((q) => published(q, opts) && !(q.kind === 'mcq' && q.stimulus_id && blocked.has(q.stimulus_id)));
}

export function compileChapter(ch: LoadedChapter, syllabus: Syllabus, opts: CompileOptions): ChapterData {
  const base = dataPath(ch.level, ch.subject, ch.chapter);
  const questions = publishedQuestions(ch, opts).map((q) => compileQuestion(q, base));
  const used = new Set(questions.flatMap((q) => (q.kind === 'mcq' && q.stimulus_id ? [q.stimulus_id] : [])));
  const stimuli: Record<string, Stimulus<RichBi>> = {};
  for (const s of ch.stimuli) {
    if (!used.has(s.id)) continue;
    stimuli[s.id] = { ...s, text: toRich(s.text), figures: s.figures?.map((f: Figure) => ({ ...f, file: `${base}/${f.file}` })) };
  }
  const title = syllabus.chapters.find((c) => c.slug === ch.chapter)?.title ?? { bn: ch.chapter, en: ch.chapter };
  return { level: ch.level, subject: ch.subject, chapter: ch.chapter, title, stimuli, questions };
}

export function compileAll(content: LoadedContent, opts: CompileOptions): CompiledSite {
  const key = (level: string, subject: string) => `${level}/${subject}`;
  const syllabi = new Map(content.syllabi.map((s) => [key(s.level, s.subject), s]));
  const chapters: ChapterData[] = [];
  const figures: CompiledSite['figures'] = [];

  for (const ch of content.chapters) {
    const syl = syllabi.get(key(ch.level, ch.subject));
    if (!syl) throw new Error(`No syllabus for ${key(ch.level, ch.subject)}`);
    chapters.push(compileChapter(ch, syl, opts));
    const base = dataPath(ch.level, ch.subject, ch.chapter);
    const files = new Set([...publishedQuestions(ch, opts), ...ch.stimuli].flatMap((x) => x.figures?.map((f) => f.file) ?? []));
    for (const f of files) figures.push({ from: `${ch.dir}/${f}`, to: `${base}/${f}` });
  }

  const publishedIds = new Set(chapters.flatMap((c) => c.questions.map((q) => q.id)));
  const chapterOfId = new Map(chapters.flatMap((c) => c.questions.map((q) => [`${c.level}/${c.subject}/${q.id}`, c.chapter] as const)));
  const papers = content.papers
    .map((p) => {
      const mcq = p.mcq.filter((id) => publishedIds.has(id));
      const cq = p.cq.filter((id) => publishedIds.has(id));
      const chapterOf = Object.fromEntries([...mcq, ...cq].map((id) => [id, chapterOfId.get(`${p.level}/${p.subject}/${id}`)!]));
      return { ...p, mcq, cq, chapterOf };
    })
    .filter((p) => p.mcq.length + p.cq.length > 0);

  const manifests: SubjectManifest[] = content.syllabi.map((s) => ({
    level: s.level,
    subject: s.subject,
    title: s.title,
    chapters: s.chapters.map((c) => {
      const data = chapters.find((d) => d.level === s.level && d.subject === s.subject && d.chapter === c.slug);
      const qs = data?.questions ?? [];
      return { ...c, counts: { mcq: qs.filter((q) => q.kind === 'mcq').length, cq: qs.filter((q) => q.kind === 'cq').length } };
    }),
    papers: papers.filter((p) => p.level === s.level && p.subject === s.subject),
  }));

  const searchIndex = (level: Level, subject: string) => {
    const docs: SearchDoc[] = [];
    for (const ch of chapters) {
      if (ch.level !== level || ch.subject !== subject) continue;
      for (const q of ch.questions) {
        const text = q.kind === 'mcq' ? q.stem : q.stimulus;
        docs.push({ id: q.id, chapter: ch.chapter, bn: plain(text.bn), en: plain(text.en) });
      }
    }
    return createSearch(docs);
  };

  return { chapters, manifests, papers, searchIndex, figures };
}
