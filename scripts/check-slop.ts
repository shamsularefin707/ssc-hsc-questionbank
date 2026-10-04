// Design lint: enforces docs/superpowers/specs/2026-10-04-design-system.md §8.
import { readFileSync } from 'node:fs';
import fg from 'fast-glob';

export interface SlopIssue {
  file: string;
  line: number;
  rule: string;
  message: string;
}

const TOKENS_FILE = /src\/styles\/tokens\.css$/;
const CHIP_FILE = /FilterChip\.tsx$/;

interface Rule {
  rule: string;
  pattern: RegExp;
  message: string;
  skip?: (file: string, src: string, match: RegExpExecArray) => boolean;
}

const RULES: Rule[] = [
  {
    rule: 'gradient',
    pattern: /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/g,
    message: 'Gradients are banned; use a solid token colour.',
  },
  {
    rule: 'backdrop-filter',
    pattern: /backdrop-filter|backdropFilter/g,
    message: 'Glass/blur panels are banned; use an opaque surface and a border.',
  },
  {
    rule: 'box-shadow',
    pattern: /(?:box-shadow\s*:|boxShadow\s*:)\s*([^;}\n]+)/g,
    message: 'Only var(--shadow-overlay) is allowed as a shadow.',
    skip: (_f, _s, m) => /^['"`]?\s*(?:none|var\(--shadow-overlay\))\s*['"`]?\s*,?$/.test(m[1].trim()),
  },
  {
    rule: 'colour-literal',
    pattern: /(?:[:\s,(]#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b)|\b(?:rgba?|hsla?)\(/g,
    message: 'Colour literals belong in src/styles/tokens.css; use a var(--…) token.',
    skip: (file) => TOKENS_FILE.test(file),
  },
  {
    rule: 'pill-radius',
    pattern: /(?:border-radius\s*:|borderRadius\s*:)\s*['"`]?\s*(?:9{3,}px|var\(--r-full\))/g,
    message: 'Pill shapes are only for interactive filter chips.',
    skip: (file) => CHIP_FILE.test(file),
  },
  {
    rule: 'outline-none',
    pattern: /outline\s*:\s*(?:none|0)\b/g,
    message: 'Removing the outline needs a :focus-visible replacement in the same file.',
    skip: (_f, src) => src.includes(':focus-visible'),
  },
  {
    rule: 'button-label',
    pattern: />\s*(?:Submit|OK|Proceed)\s*</g,
    message: 'Button labels start with a verb that names the action (never Submit/OK/Proceed).',
  },
  {
    rule: 'font-weight',
    pattern: /(?:font-weight\s*:|fontWeight\s*:)\s*['"`]?\s*(\d+|bold|bolder|lighter)/g,
    message: 'Only font weights 400 and 600 are allowed.',
    skip: (_f, _s, m) => m[1] === '400' || m[1] === '600',
  },
];

export function checkSource(file: string, src: string): SlopIssue[] {
  const issues: SlopIssue[] = [];
  for (const r of RULES) {
    r.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.pattern.exec(src))) {
      if (r.skip?.(file, src, m)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      issues.push({ file, line, rule: r.rule, message: r.message });
    }
  }
  return issues;
}

function main() {
  const files = fg.sync('src/**/*.{astro,tsx,ts,css}');
  const issues = files.flatMap((f) => checkSource(f, readFileSync(f, 'utf8')));
  for (const i of issues) console.log(`${i.file}:${i.line}  ${i.rule}  ${i.message}`);
  console.log(`${issues.length} design issue(s) in ${files.length} file(s)`);
  if (issues.length) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
