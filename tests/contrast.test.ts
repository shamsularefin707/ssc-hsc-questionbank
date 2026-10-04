import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const css = readFileSync('src/styles/tokens.css', 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const vars: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const light = block(':root {');
const dark = { ...light, ...block(':root[data-theme="dark"]') };

function resolve(vars: Record<string, string>, name: string): string {
  let v = vars[name];
  for (let i = 0; i < 10 && v?.startsWith('var('); i++) v = vars[v.slice(6, -1)];
  if (!v?.startsWith('#')) throw new Error(`--${name} does not resolve to a hex colour`);
  return v;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const TEXT_PAIRS: [string, string][] = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-sunken'],
  ['text-muted', 'bg'], ['text-muted', 'surface'], ['text-muted', 'surface-sunken'],
  ['accent', 'surface'], ['accent', 'bg'], ['on-accent', 'accent'], ['on-accent', 'accent-hover'], ['text', 'accent-soft'],
  ['correct', 'correct-soft'], ['correct', 'surface'], ['wrong', 'wrong-soft'], ['wrong', 'surface'],
  ['warn', 'warn-soft'], ['warn', 'surface'],
];
const UI_PAIRS: [string, string][] = [['border-strong', 'surface'], ['focus', 'surface'], ['focus', 'bg']];

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (_name, vars) => {
  test.each(TEXT_PAIRS)('--%s on --%s ≥ 4.5', (fg, bg) => {
    expect(ratio(resolve(vars, fg), resolve(vars, bg))).toBeGreaterThanOrEqual(4.5);
  });
  test.each(UI_PAIRS)('--%s on --%s ≥ 3', (fg, bg) => {
    expect(ratio(resolve(vars, fg), resolve(vars, bg))).toBeGreaterThanOrEqual(3);
  });
});
