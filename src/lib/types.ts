// Shared types for content files, compiled data and the site.
// Mirrors schema/*.schema.json; keep the two in sync.

export type Lang = 'bn' | 'en';
export type Bi = { bn: string; en: string };
export type RichBi = Bi & { bnHtml: string; enHtml: string };
export type Level = 'ssc' | 'hsc';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type McqType = 'gyanmulok' | 'onudhabon' | 'bohupodi' | 'ovinno';
export type Status = 'draft' | 'checked' | 'reviewed';

export type Source =
  | { kind: 'original' }
  | { kind: 'board'; exam: Level; board: string; year: number }
  | {
      kind: 'admission';
      category: 'medical' | 'engineering' | 'varsity';
      institution: string;
      session: string;
      unit?: string;
    };

export interface Figure {
  file: string;
  alt: Bi;
}

interface Base {
  id: string;
  level: Level;
  subject: string;
  chapter: string;
  topics: string[];
  difficulty: Difficulty;
  source: Source;
  status: Status;
  figures?: Figure[];
}

export interface Mcq<T = Bi> extends Base {
  kind: 'mcq';
  mcq_type: McqType;
  stem: T;
  statements?: T[];
  options: [T, T, T, T];
  answer: 0 | 1 | 2 | 3;
  explanation: T;
  stimulus_id?: string;
  computable?: { expr: string; expected: number; tolerance?: number };
}

export interface CqPart<T = Bi> {
  question: T;
  solution: T;
}

export interface Cq<T = Bi> extends Base {
  kind: 'cq';
  stimulus: T;
  parts: { ka: CqPart<T>; kha: CqPart<T>; ga: CqPart<T>; gha: CqPart<T> };
}

export type Question<T = Bi> = Mcq<T> | Cq<T>;
export type CompiledQuestion = Question<RichBi>;

export interface Stimulus<T = Bi> {
  id: string;
  text: T;
  figures?: Figure[];
}

export interface ChapterData {
  level: Level;
  subject: string;
  chapter: string;
  title: Bi;
  stimuli: Record<string, Stimulus<RichBi>>;
  questions: CompiledQuestion[];
}

export interface SyllabusChapter {
  slug: string;
  number: number;
  title: Bi;
  topics: { slug: string; title: Bi }[];
}

export interface Syllabus {
  level: Level;
  subject: string;
  title: Bi;
  chapters: SyllabusChapter[];
}

export interface PaperIndex {
  id: string;
  source: Exclude<Source, { kind: 'original' }>;
  level: Level;
  subject: string;
  title: Bi;
  mcq: string[];
  cq: string[];
}

export interface SubjectManifest {
  level: Level;
  subject: string;
  title: Bi;
  chapters: (SyllabusChapter & { counts: { mcq: number; cq: number } })[];
  papers: PaperIndex[];
}

/** File shapes as authored in content/ (the loader fills level/subject/chapter/kind). */
type Authored<Q> = Omit<Q, 'level' | 'subject' | 'chapter' | 'kind'>;
export interface McqFile {
  level: Level;
  subject: string;
  chapter: string;
  stimuli?: Stimulus[];
  questions: Authored<Mcq>[];
}
export interface CqFile {
  level: Level;
  subject: string;
  chapter: string;
  questions: Authored<Cq>[];
}
