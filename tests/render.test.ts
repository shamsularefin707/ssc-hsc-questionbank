import { afterEach, expect, test, vi } from 'vitest';
import { renderRich } from '../src/lib/render';

afterEach(() => vi.restoreAllMocks());

test('renders Bangla text with inline math', () => {
  const html = renderRich('বেগ $v=u+at$');
  expect(html).toContain('বেগ');
  expect(html).toContain('class="katex"');
});

test('bad LaTeX falls back to escaped raw text and warns', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const html = renderRich('$\\frac{1}{$');
  expect(html).toContain('\\frac');
  expect(warn).toHaveBeenCalled();
});

test('escapes HTML outside math', () => {
  expect(renderRich('<b>')).toContain('&lt;b&gt;');
});

test('newlines become line breaks and escaped dollars stay literal', () => {
  expect(renderRich('a\nb')).toBe('a<br>b');
  expect(renderRich('costs \\$5')).toBe('costs $5');
});

test('Bangla inside \\text renders without throwing', () => {
  expect(renderRich('$\\frac{\\text{পিচ}}{100}$')).toContain('class="katex"');
});

test('math carries MathML so screen readers can read it', () => {
  expect(renderRich('$x^2$')).toContain('<math');
});
