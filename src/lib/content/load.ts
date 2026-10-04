// Reads content/ YAML files and derives typed views of them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { load as parseYaml } from 'js-yaml';
import type { Cq, Level, Mcq, PaperIndex, Question, Stimulus, Syllabus } from '../types';

export type FileKind = 'syllabus' | 'mcq' | 'cq' | 'paper' | 'unknown';

/** One parsed YAML file. `file` is relative to the repo root (or the given root's parent). */
export interface RawFile {
  file: string;
  root: string;
  kind: FileKind;
  // Parsed YAML, not yet validated.
  data: any;
}

export interface LoadedChapter {
  file: string;
  /** Directory of the chapter on disk (for resolving figures). */
  dir: string;
  level: Level;
  subject: string;
  chapter: string;
  questions: Question[];
  stimuli: Stimulus[];
}

export interface LoadedContent {
  syllabi: Syllabus[];
  chapters: LoadedChapter[];
  papers: PaperIndex[];
}

export function kindOf(relPath: string): FileKind {
  const p = relPath.split(path.sep).join('/');
  if (p.startsWith('syllabus/')) return 'syllabus';
  if (p.startsWith('board/') || p.startsWith('admission/')) return 'paper';
  if (p.endsWith('/mcq.yaml')) return 'mcq';
  if (p.endsWith('/cq.yaml')) return 'cq';
  return 'unknown';
}

export function readContentFiles(root = 'content'): RawFile[] {
  return fg.sync('**/*.yaml', { cwd: root }).sort().map((rel) => ({
    file: path.join(root, rel),
    root,
    kind: kindOf(rel),
    data: parseYaml(readFileSync(path.join(root, rel), 'utf8')),
  }));
}

/** Builds typed views from raw files. Assumes the files already passed schema validation. */
export function deriveContent(files: RawFile[]): LoadedContent {
  const syllabi: Syllabus[] = [];
  const papers: PaperIndex[] = [];
  const byDir = new Map<string, LoadedChapter>();

  for (const f of files) {
    if (f.kind === 'syllabus') syllabi.push(f.data);
    else if (f.kind === 'paper') papers.push(f.data);
    else if (f.kind === 'mcq' || f.kind === 'cq') {
      const dir = path.dirname(f.file);
      const { level, subject, chapter } = f.data;
      let ch = byDir.get(dir);
      if (!ch) {
        ch = { file: f.file, dir, level, subject, chapter, questions: [], stimuli: [] };
        byDir.set(dir, ch);
      }
      for (const q of f.data.questions ?? []) {
        ch.questions.push({ ...q, level, subject, chapter, kind: f.kind } as Mcq | Cq);
      }
      if (f.kind === 'mcq') ch.stimuli.push(...(f.data.stimuli ?? []));
    }
  }
  return { syllabi, chapters: [...byDir.values()], papers };
}

export async function loadContent(root = 'content'): Promise<LoadedContent> {
  return deriveContent(readContentFiles(root));
}
