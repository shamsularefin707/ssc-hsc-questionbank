import { expect, test } from 'vitest';
import { decodeFilters, encodeFilters, type Filters } from '../src/lib/url-state';

test('round-trips filters', () => {
  const f: Filters = { chapters: ['02-motion'], topics: ['free-fall', 'speed-velocity'], difficulty: ['easy', 'hard'], kind: ['mcq'], mcqType: ['bohupodi'], source: ['board'], q: 'বেগ g' };
  expect(decodeFilters(encodeFilters(f))).toEqual(f);
});

test('encodes in a stable order and omits empty fields', () => {
  expect(encodeFilters({ difficulty: ['easy'], chapters: ['01-a'], topics: [] })).toBe('?chapters=01-a&difficulty=easy');
  expect(encodeFilters({})).toBe('');
});

test('ignores unknown keys and invalid values', () => {
  expect(decodeFilters('?difficulty=easy,bogus&x=1')).toEqual({ difficulty: ['easy'] });
  expect(decodeFilters('?kind=essay')).toEqual({});
});
