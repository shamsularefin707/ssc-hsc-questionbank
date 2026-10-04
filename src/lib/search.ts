// Shared MiniSearch configuration: the build writes the index, the browser loads it.
import MiniSearch, { type Options } from 'minisearch';

export interface SearchDoc {
  id: string;
  chapter: string;
  bn: string;
  en: string;
}

export const SEARCH_OPTIONS: Options<SearchDoc> = {
  fields: ['bn', 'en'],
  storeFields: ['chapter'],
  searchOptions: { prefix: true, fuzzy: 0.15, combineWith: 'AND' },
};

/** Strips math delimiters so search matches the visible words. */
export const plain = (s: string) => s.replace(/(?<!\\)\$/g, ' ').replace(/\\\$/g, '$');

export function createSearch(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(docs);
  return ms;
}

export function loadSearchJson(json: string): MiniSearch<SearchDoc> {
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_OPTIONS);
}
