// Fetches compiled data in the browser.
import type MiniSearch from 'minisearch';
import { loadSearchJson, type SearchDoc } from './search';
import type { ChapterData, CompiledQuestion, Level, RichBi, Stimulus, SubjectManifest } from './types';

export class DataLoadError extends Error {
  constructor(public url: string, public status: number) {
    super(`Failed to load ${url} (${status})`);
  }
}

async function get(url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new DataLoadError(url, 0);
  }
  if (!res.ok) throw new DataLoadError(url, res.status);
  return res;
}

const chapters = new Map<string, Promise<ChapterData>>();
const searches = new Map<string, Promise<MiniSearch<SearchDoc>>>();

export async function loadManifest(level: Level, subject: string): Promise<SubjectManifest> {
  return (await get(`/data/${level}/${subject}/index.json`)).json();
}

/** Memoised per chapter; a failed load is forgotten so "Try again" refetches. */
export function loadChapter(level: Level, subject: string, chapter: string): Promise<ChapterData> {
  const url = `/data/${level}/${subject}/${chapter}.json`;
  let p = chapters.get(url);
  if (!p) {
    p = get(url).then((r) => r.json() as Promise<ChapterData>);
    p.catch(() => chapters.delete(url));
    chapters.set(url, p);
  }
  return p;
}

export function loadSearch(level: Level, subject: string): Promise<MiniSearch<SearchDoc>> {
  const url = `/data/${level}/${subject}/search.json`;
  let p = searches.get(url);
  if (!p) {
    p = get(url).then(async (r) => loadSearchJson(await r.text()));
    p.catch(() => searches.delete(url));
    searches.set(url, p);
  }
  return p;
}

export interface Pool {
  questions: CompiledQuestion[];
  /** Keyed `${chapter}/${stimulusId}`. */
  stimuli: Map<string, Stimulus<RichBi>>;
  manifest: SubjectManifest;
}

/** Loads the questions a set is drawn from: the given chapters, or every chapter with questions. */
export async function loadPool(level: Level, subject: string, chapters: string[]): Promise<Pool> {
  const manifest = await loadManifest(level, subject);
  const known = manifest.chapters.filter((c) => c.counts.mcq + c.counts.cq > 0).map((c) => c.slug);
  const wanted = chapters.length ? chapters.filter((c) => known.includes(c)) : known;
  const data = await Promise.all(wanted.map((c) => loadChapter(level, subject, c)));
  const stimuli = new Map<string, Stimulus<RichBi>>();
  for (const ch of data) for (const [id, s] of Object.entries(ch.stimuli)) stimuli.set(`${ch.chapter}/${id}`, s);
  return { questions: data.flatMap((c) => c.questions), stimuli, manifest };
}
