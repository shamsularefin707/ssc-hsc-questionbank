// Content validation rules. Every content PR must pass these with zero errors.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import type { Bi, Mcq, Source } from '../types';
import type { RawFile } from '../content/load';

export interface ValidationIssue {
  file: string;
  id?: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidateOptions {
  fileExists?: (p: string) => boolean;
}

type Issue = ValidationIssue;
const err = (file: string, rule: string, message: string, id?: string): Issue => ({ file, id, rule, message, severity: 'error' });

// ---------- schema ----------

const SCHEMA_FILES = { syllabus: 'syllabus', mcq: 'mcq-file', cq: 'cq-file', paper: 'paper' } as const;
let validators: Record<keyof typeof SCHEMA_FILES, ReturnType<Ajv2020['compile']>> | undefined;

function getValidators() {
  if (!validators) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    const load = (n: string) => JSON.parse(readFileSync(path.join('schema', `${n}.schema.json`), 'utf8'));
    validators = {
      syllabus: ajv.compile(load(SCHEMA_FILES.syllabus)),
      mcq: ajv.compile(load(SCHEMA_FILES.mcq)),
      cq: ajv.compile(load(SCHEMA_FILES.cq)),
      paper: ajv.compile(load(SCHEMA_FILES.paper)),
    };
  }
  return validators;
}

export function schemaRule(f: RawFile): Issue[] {
  if (f.kind === 'unknown') return [err(f.file, 'schema', 'Unrecognised content file location.')];
  const v = getValidators()[f.kind];
  if (v(f.data)) return [];
  return (v.errors ?? []).slice(0, 10).map((e) => err(f.file, 'schema', `${e.instancePath || '/'} ${e.message}`));
}

// ---------- helpers ----------

function isBi(v: unknown): v is Bi {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && 'bn' in v && 'en' in v;
}

function walk(v: unknown, visit: (v: unknown, where: string) => void, where = '') {
  visit(v, where);
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, visit, `${where}/${i}`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, visit, `${where}/${k}`);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// ---------- per-file rules ----------

export function bilingualRule(f: RawFile): Issue[] {
  const out: Issue[] = [];
  walk(f.data, (v, where) => {
    if (!isBi(v)) return;
    for (const lang of ['bn', 'en'] as const) {
      if (typeof v[lang] !== 'string' || !v[lang].trim()) out.push(err(f.file, 'bilingual-nonempty', `${where}/${lang} is empty`));
    }
  });
  return out;
}

export function mathDelimiterRule(f: RawFile): Issue[] {
  const out: Issue[] = [];
  walk(f.data, (v, where) => {
    if (typeof v !== 'string') return;
    const count = (v.match(/(?<!\\)\$/g) ?? []).length;
    if (count % 2) out.push(err(f.file, 'math-delimiters', `${where} has an unbalanced $ (${count} found)`));
  });
  return out;
}

function mcqsOf(f: RawFile): any[] {
  return f.kind === 'mcq' ? (f.data.questions ?? []) : [];
}

export function distinctOptionsRule(f: RawFile): Issue[] {
  const out: Issue[] = [];
  for (const q of mcqsOf(f)) {
    for (const lang of ['bn', 'en'] as const) {
      const texts = q.options.map((o: Bi) => norm(o[lang]));
      if (new Set(texts).size !== texts.length) out.push(err(f.file, 'distinct-options', `Duplicate ${lang} options`, q.id));
    }
  }
  return out;
}

export function stimulusRefRule(f: RawFile): Issue[] {
  if (f.kind !== 'mcq') return [];
  const out: Issue[] = [];
  const ids = new Set<string>((f.data.stimuli ?? []).map((s: { id: string }) => s.id));
  const uses = new Map<string, number>();
  for (const q of mcqsOf(f)) {
    if (!q.stimulus_id) continue;
    if (!ids.has(q.stimulus_id)) out.push(err(f.file, 'stimulus-ref', `Unknown stimulus_id "${q.stimulus_id}"`, q.id));
    uses.set(q.stimulus_id, (uses.get(q.stimulus_id) ?? 0) + 1);
  }
  for (const id of ids) {
    if ((uses.get(id) ?? 0) < 2) out.push(err(f.file, 'stimulus-ref', `Stimulus "${id}" must be used by at least 2 questions`));
  }
  return out;
}

export function figureRule(f: RawFile, exists: (p: string) => boolean): Issue[] {
  if (f.kind !== 'mcq' && f.kind !== 'cq') return [];
  const dir = path.dirname(f.file);
  const out: Issue[] = [];
  const items = [...(f.data.questions ?? []), ...(f.data.stimuli ?? [])];
  for (const it of items) {
    for (const fig of it.figures ?? []) {
      if (!exists(path.join(dir, fig.file))) out.push(err(f.file, 'figure-exists', `Missing figure ${fig.file}`, it.id));
    }
  }
  return out;
}

export function computableRule(f: RawFile): Issue[] {
  const out: Issue[] = [];
  for (const q of mcqsOf(f) as Mcq[]) {
    if (!q.computable) continue;
    const { expr, expected, tolerance = 1e-6 } = q.computable;
    let value: number;
    try {
      value = evaluate(expr);
    } catch (e) {
      out.push(err(f.file, 'computable', `Cannot evaluate "${expr}": ${(e as Error).message}`, q.id));
      continue;
    }
    if (Math.abs(value - expected) > tolerance) {
      out.push(err(f.file, 'computable', `"${expr}" = ${value}, expected ${expected} (±${tolerance})`, q.id));
    }
    if (!q.options[q.answer].en.includes(String(expected))) {
      out.push(err(f.file, 'computable', `Correct option does not contain the computed value ${expected}`, q.id));
    }
  }
  return out;
}

// ---------- cross-file rules ----------

export function uniqueIdRule(files: RawFile[]): Issue[] {
  const seen = new Map<string, string>();
  const out: Issue[] = [];
  for (const f of files) {
    if (f.kind !== 'mcq' && f.kind !== 'cq') continue;
    for (const q of f.data.questions ?? []) {
      const prev = seen.get(q.id);
      if (prev) out.push(err(f.file, 'unique-id', `Duplicate id (also in ${prev})`, q.id));
      else seen.set(q.id, f.file);
    }
  }
  return out;
}

export function topicRule(files: RawFile[]): Issue[] {
  const chapters = new Map<string, Set<string>>();
  for (const f of files) {
    if (f.kind !== 'syllabus') continue;
    for (const ch of f.data.chapters) {
      chapters.set(`${f.data.level}/${f.data.subject}/${ch.slug}`, new Set(ch.topics.map((t: { slug: string }) => t.slug)));
    }
  }
  const out: Issue[] = [];
  for (const f of files) {
    if (f.kind !== 'mcq' && f.kind !== 'cq') continue;
    const key = `${f.data.level}/${f.data.subject}/${f.data.chapter}`;
    const topics = chapters.get(key);
    if (!topics) {
      out.push(err(f.file, 'topic-exists', `Chapter ${key} is not in any syllabus`));
      continue;
    }
    if (path.basename(path.dirname(f.file)) !== f.data.chapter) {
      out.push(err(f.file, 'topic-exists', `Folder name does not match chapter "${f.data.chapter}"`));
    }
    for (const q of f.data.questions ?? []) {
      for (const t of q.topics) if (!topics.has(t)) out.push(err(f.file, 'topic-exists', `Unknown topic "${t}" for ${key}`, q.id));
    }
  }
  return out;
}

function sameSource(a: Source, b: Source): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

export function paperRefRule(files: RawFile[]): Issue[] {
  const questions = new Map<string, { kind: 'mcq' | 'cq'; source: Source }>();
  for (const f of files) {
    if (f.kind !== 'mcq' && f.kind !== 'cq') continue;
    for (const q of f.data.questions ?? []) questions.set(q.id, { kind: f.kind, source: q.source });
  }
  const out: Issue[] = [];
  for (const f of files) {
    if (f.kind !== 'paper') continue;
    for (const kind of ['mcq', 'cq'] as const) {
      for (const id of f.data[kind]) {
        const q = questions.get(id);
        if (!q) out.push(err(f.file, 'paper-ref', `Paper lists unknown ${kind} "${id}"`, id));
        else if (q.kind !== kind) out.push(err(f.file, 'paper-ref', `"${id}" is a ${q.kind}, listed under ${kind}`, id));
        else if (!sameSource(q.source, f.data.source)) out.push(err(f.file, 'paper-ref', `"${id}" has a different source than the paper`, id));
      }
    }
  }
  return out;
}

const NEAR_DUP_THRESHOLD = 0.85;

function shingles(text: string): Set<string> {
  const words = text.toLowerCase().replace(/\$[^$]*\$/g, (m) => m.replace(/\s+/g, '')).replace(/[^\p{L}\p{N}$^\\{}]+/gu, ' ').trim().split(' ').filter(Boolean);
  if (words.length < 3) return new Set([words.join(' ')]);
  const out = new Set<string>();
  for (let i = 0; i + 3 <= words.length; i++) out.add(words.slice(i, i + 3).join(' '));
  return out;
}

export function nearDuplicateRule(files: RawFile[]): Issue[] {
  type Item = { id: string; file: string; sh: Set<string> };
  const groups = new Map<string, Item[]>();
  for (const f of files) {
    if (f.kind !== 'mcq' && f.kind !== 'cq') continue;
    const key = `${f.data.level}/${f.data.subject}/${f.kind}`;
    const list = groups.get(key) ?? groups.set(key, []).get(key)!;
    for (const q of f.data.questions ?? []) {
      list.push({ id: q.id, file: f.file, sh: shingles(f.kind === 'mcq' ? q.stem.en : q.stimulus.en) });
    }
  }
  const out: Issue[] = [];
  for (const items of groups.values()) {
    // Inverted index so only items sharing a shingle are compared.
    const index = new Map<string, number[]>();
    items.forEach((it, i) => it.sh.forEach((s) => (index.get(s) ?? index.set(s, []).get(s)!).push(i)));
    const reported = new Set<string>();
    items.forEach((a, i) => {
      const candidates = new Set<number>();
      a.sh.forEach((s) => index.get(s)!.forEach((j) => j > i && candidates.add(j)));
      for (const j of candidates) {
        const b = items[j];
        let inter = 0;
        a.sh.forEach((s) => b.sh.has(s) && inter++);
        const jaccard = inter / (a.sh.size + b.sh.size - inter);
        const pair = `${a.id}|${b.id}`;
        if (jaccard >= NEAR_DUP_THRESHOLD && !reported.has(pair)) {
          reported.add(pair);
          out.push({ file: b.file, id: b.id, rule: 'near-duplicate', severity: 'warning', message: `Looks like a near-duplicate of ${a.id} (${jaccard.toFixed(2)})` });
        }
      }
    });
  }
  return out;
}

// ---------- entry point ----------

export function validateAll(files: RawFile[], opts: ValidateOptions = {}): ValidationIssue[] {
  const exists = opts.fileExists ?? existsSync;
  const issues: Issue[] = [];
  const valid: RawFile[] = [];
  for (const f of files) {
    const s = schemaRule(f);
    issues.push(...s);
    if (!s.length) valid.push(f);
  }
  for (const f of valid) {
    issues.push(...bilingualRule(f), ...mathDelimiterRule(f), ...distinctOptionsRule(f), ...stimulusRefRule(f), ...figureRule(f, exists), ...computableRule(f));
  }
  issues.push(...uniqueIdRule(valid), ...topicRule(valid), ...paperRefRule(valid), ...nearDuplicateRule(valid));
  return issues;
}

// ---------- safe arithmetic evaluator for `computable` ----------

/** Evaluates + - * / ^ ( ), decimal numbers and sqrt(). Never uses eval. */
export function evaluate(expr: string): number {
  const tokens = expr.match(/\d+(?:\.\d+)?(?:e[+-]?\d+)?|sqrt|[-+*/^()]|\S/gi) ?? [];
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (t?: string) => {
    const tok = tokens[pos++];
    if (t !== undefined && tok !== t) throw new Error(`expected "${t}" but found "${tok ?? 'end'}"`);
    return tok;
  };
  const expression = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') v = take() === '+' ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = power();
    while (peek() === '*' || peek() === '/') v = take() === '*' ? v * power() : v / power();
    return v;
  };
  const power = (): number => {
    const base = unary();
    if (peek() === '^') {
      take();
      return base ** power();
    }
    return base;
  };
  const unary = (): number => {
    if (peek() === '-') {
      take();
      return -unary();
    }
    if (peek() === '+') {
      take();
      return unary();
    }
    return primary();
  };
  const primary = (): number => {
    const tok = take();
    if (tok === undefined) throw new Error('unexpected end');
    if (tok === '(') {
      const v = expression();
      take(')');
      return v;
    }
    if (tok.toLowerCase() === 'sqrt') {
      take('(');
      const v = expression();
      take(')');
      return Math.sqrt(v);
    }
    if (/^\d/.test(tok)) return Number(tok);
    throw new Error(`unexpected "${tok}"`);
  };
  const result = expression();
  if (pos !== tokens.length) throw new Error(`unexpected "${tokens[pos]}"`);
  return result;
}
