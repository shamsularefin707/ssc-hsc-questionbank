import { afterEach, describe, expect, test, vi } from 'vitest';
import { pushResult, storage, toggleBookmark, type PracticeResult } from '../src/lib/storage';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('storage', () => {
  test('round-trips JSON values', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(storage.set('qb:x', { a: [1, 2] })).toBe(true);
    expect(storage.get('qb:x', null)).toEqual({ a: [1, 2] });
    storage.remove('qb:x');
    expect(storage.get('qb:x', 'none')).toBe('none');
  });

  test('throwing storage returns the fallback and set returns false', () => {
    const boom = () => { throw new Error('SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    expect(storage.get('qb:x', 7)).toBe(7);
    expect(storage.set('qb:x', 1)).toBe(false);
    expect(() => storage.remove('qb:x')).not.toThrow();
  });

  test('missing localStorage behaves the same', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(storage.get('qb:x', 'fb')).toBe('fb');
    expect(storage.set('qb:x', 1)).toBe(false);
  });

  test('corrupt JSON returns the fallback', () => {
    const s = memoryStorage();
    s.setItem('qb:x', '{not json');
    vi.stubGlobal('localStorage', s);
    expect(storage.get('qb:x', [])).toEqual([]);
  });
});

describe('practice helpers', () => {
  test('toggleBookmark adds then removes an id', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(toggleBookmark('q1')).toBe(true);
    expect(storage.get('qb:bookmarks', [])).toEqual(['q1']);
    expect(toggleBookmark('q1')).toBe(false);
    expect(storage.get('qb:bookmarks', [])).toEqual([]);
  });

  test('pushResult keeps newest first and at most 50', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    for (let i = 0; i < 55; i++) pushResult({ at: i, setKey: 's', correct: 1, total: 2 });
    const rs = storage.get<PracticeResult[]>('qb:results', []);
    expect(rs).toHaveLength(50);
    expect(rs[0].at).toBe(54);
  });
});
