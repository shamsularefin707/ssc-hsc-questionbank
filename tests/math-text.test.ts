import { expect, test } from 'vitest';
import { latexToPlain } from '../src/lib/math-text';

test.each([
  ['$v = u + at$', 'v = u + at'],
  ['$x^2$', 'x²'],
  ['$x^{10}$', 'x¹⁰'],
  ['$H_2O$', 'H₂O'],
  ['$\\frac{a}{b}$', 'a/b'],
  ['$\\frac{v - u}{t}$', '(v - u)/t'],
  ['$\\sqrt{392}$', '√392'],
  ['$\\sqrt{2gh}$', '√(2gh)'],
  ['$3\\times10^8$', '3×10⁸'],
  ['$\\alpha\\beta\\theta\\lambda\\mu\\Omega$', 'αβθλμΩ'],
  ['$\\Delta t$', 'Δt'],
  ['$\\pm$ $\\leq$ $\\geq$ $\\neq$ $\\approx$ $\\rightarrow$', '± ≤ ≥ ≠ ≈ →'],
  ['$\\foo x$', 'foo x'],
])('%s → %s', (input, expected) => {
  expect(latexToPlain(input)).toBe(expected);
});

test('handles units, text, negative exponents and escaped dollars', () => {
  expect(latexToPlain('$9.8\\ \\text{m s}^{-2}$')).toBe('9.8 m s⁻²');
  expect(latexToPlain('বেগ $v$ এবং \\$5')).toBe('বেগ v এবং $5');
  expect(latexToPlain('$[ML^2T^{-2}]$')).toBe('[ML²T⁻²]');
  expect(latexToPlain('$v \\propto t$')).toBe('v ∝ t');
});
