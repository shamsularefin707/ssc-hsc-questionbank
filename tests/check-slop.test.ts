import { describe, expect, test } from 'vitest';
import { checkSource } from '../scripts/check-slop';

const rules = (file: string, src: string) => checkSource(file, src).map((i) => i.rule);

describe('check-slop', () => {
  test.each([
    ['gradient', 'src/a.css', '.b { background: linear-gradient(red, blue); }'],
    ['gradient', 'src/a.css', '.b { background: conic-gradient(from 0deg, red, blue); }'],
    ['backdrop-filter', 'src/a.css', '.p { backdrop-filter: blur(8px); }'],
    ['box-shadow', 'src/a.css', '.c { box-shadow: 0 1px 2px var(--x); }'],
    ['box-shadow', 'src/C.tsx', 'const s = { boxShadow: "0 2px 4px black" };'],
    ['colour-literal', 'src/a.css', '.c { color: #1C1A17; }'],
    ['colour-literal', 'src/a.astro', '<style>.c { border: 1px solid rgb(0 0 0); }</style>'],
    ['pill-radius', 'src/a.css', '.tag { border-radius: 999px; }'],
    ['pill-radius', 'src/Card.tsx', 'const s = { borderRadius: "var(--r-full)" };'],
    ['outline-none', 'src/a.css', 'button { outline: none; }'],
    ['button-label', 'src/F.tsx', '<button type="submit">Submit</button>'],
    ['button-label', 'src/F.tsx', '<button>OK</button>'],
    ['font-weight', 'src/a.css', 'h1 { font-weight: 700; }'],
    ['font-weight', 'src/a.css', 'b { font-weight: bold; }'],
  ])('flags %s in %s', (rule, file, src) => {
    expect(rules(file, src)).toContain(rule);
  });

  test('clean source passes', () => {
    const css = `
      .card { background: var(--surface); border: 1px solid var(--border); font-weight: 600; }
      .drawer { box-shadow: var(--shadow-overlay); }
      .btn:focus-visible { outline: 2px solid var(--focus); }
      a[href="#main"] { color: var(--accent); }
    `;
    expect(checkSource('src/styles/global.css', css)).toEqual([]);
    expect(checkSource('src/components/FilterChip.tsx', 'const s = { borderRadius: "var(--r-full)" };')).toEqual([]);
    expect(checkSource('src/styles/tokens.css', ':root { --ink-900: #1C1A17; --shadow-overlay: 0 8px 24px rgb(28 26 23 / .12); }')).toEqual([]);
    expect(checkSource('src/C.tsx', '<a href="#abc">Skip</a><button>Show solution</button>')).toEqual([]);
  });

  test('outline none is allowed when the file defines focus-visible', () => {
    expect(rules('src/a.css', 'button { outline: none; } button:focus-visible { outline: 2px solid var(--focus); }')).not.toContain('outline-none');
  });
});
