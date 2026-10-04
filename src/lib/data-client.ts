// Fetches compiled data in the browser.
import type MiniSearch from 'minisearch';
import { loadSearchJson, type SearchDoc } from './search';
import type { ChapterData, Level, SubjectManifest } from './types';

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
