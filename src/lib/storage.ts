// Per-browser data in localStorage. Every access survives storage being missing or throwing
// (private mode, blocked site data): reads fall back, writes report false.

export interface PracticeResult {
  at: number;
  setKey: string;
  correct: number;
  total: number;
}

const ls = (): Storage | undefined => {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = ls()?.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      const s = ls();
      if (!s) return false;
      s.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      ls()?.removeItem(key);
    } catch {
      /* nothing to do */
    }
  },
};

const BOOKMARKS = 'qb:bookmarks';
const RESULTS = 'qb:results';
const MAX_RESULTS = 50;

export const getBookmarks = (): string[] => storage.get<string[]>(BOOKMARKS, []);

/** Toggles a bookmark and returns whether the question is now bookmarked. */
export function toggleBookmark(id: string): boolean {
  const list = getBookmarks();
  const on = !list.includes(id);
  storage.set(BOOKMARKS, on ? [...list, id] : list.filter((x) => x !== id));
  return on;
}

export function pushResult(r: PracticeResult): void {
  storage.set(RESULTS, [r, ...storage.get<PracticeResult[]>(RESULTS, [])].slice(0, MAX_RESULTS));
}

/** Saves a result, replacing any earlier one with the same setKey (used for mocks whose CQ marks change). */
export function upsertResult(r: PracticeResult): void {
  const rest = storage.get<PracticeResult[]>(RESULTS, []).filter((x) => x.setKey !== r.setKey);
  storage.set(RESULTS, [r, ...rest].slice(0, MAX_RESULTS));
}
