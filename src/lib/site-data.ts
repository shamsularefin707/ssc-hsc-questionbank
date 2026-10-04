// Build-time access to compiled manifests (public/data is written by `npm run build:data`).
import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import type { SubjectManifest } from './types';

export function readManifests(): SubjectManifest[] {
  const files = fg.sync('public/data/*/*/index.json').sort();
  if (!files.length) throw new Error('No compiled data found. Run `npm run build:data` first.');
  return files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as SubjectManifest);
}

export const questionCount = (m: SubjectManifest) => m.chapters.reduce((n, c) => n + c.counts.mcq + c.counts.cq, 0);
