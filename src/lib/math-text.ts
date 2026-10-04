// Converts $…$ LaTeX into readable Unicode text for copying and Word export.

const SUP: Record<string, string> = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ' };
const SUB: Record<string, string> = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', i: 'ᵢ', r: 'ᵣ', u: 'ᵤ', v: 'ᵥ' };

// Letters swallow the space after them, as in LaTeX (\Delta t → Δt).
const LETTERS: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν',
  pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω', eta: 'η',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω',
};
const SYMBOLS: Record<string, string> = {
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈',
  rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', propto: '∝', infty: '∞', circ: '°', degree: '°', angle: '∠',
  therefore: '∴', because: '∵', sim: '∼', ldots: '…', cdots: '⋯', percent: '%',
};
const DROP = new Set(['left', 'right', 'displaystyle', 'mathrm', 'mathbf', 'mathit']);

/** Wraps compound expressions in parentheses; single numbers or symbols stay bare. */
const group = (s: string) => (/^(?:[\d.]+|\p{L})$/u.test(s) ? s : `(${s})`);

/** Reads a {group} or a single character starting at i. */
function readArg(s: string, i: number): [string, number] {
  while (s[i] === ' ') i++;
  if (s[i] !== '{') return [s[i] ?? '', i + 1];
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

function script(content: string, map: Record<string, string>, mark: string): string {
  const chars = [...content];
  return chars.every((c) => map[c]) ? chars.map((c) => map[c]).join('') : `${mark}(${content})`;
}

function convert(tex: string): string {
  let out = '';
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)/.exec(tex.slice(i));
      if (!m) {
        // Control symbols: "\ " and "\," are spaces, "\{" is a brace, "\$" a dollar.
        const next = tex[i + 1] ?? '';
        out += next === ',' || next === ' ' || next === ';' ? ' ' : next;
        i += 2;
        continue;
      }
      const name = m[1];
      i += m[0].length;
      if (name === 'frac') {
        const [a, j] = readArg(tex, i);
        const [b, k] = readArg(tex, j);
        out += `${group(convert(a))}/${group(convert(b))}`;
        i = k;
      } else if (name === 'sqrt') {
        const [a, j] = readArg(tex, i);
        out += `√${group(convert(a))}`;
        i = j;
      } else if (name === 'text' || name === 'mathrm' || name === 'mathbf' || name === 'mathit') {
        const [a, j] = readArg(tex, i);
        out += name === 'text' ? a : convert(a);
        i = j;
      } else if (LETTERS[name]) {
        out += LETTERS[name];
        if (tex[i] === ' ') i++;
      } else if (SYMBOLS[name]) {
        out += SYMBOLS[name];
      } else if (!DROP.has(name)) {
        out += name;
      }
    } else if (c === '^' || c === '_') {
      const [a, j] = readArg(tex, i + 1);
      const inner = convert(a);
      out += c === '^' ? script(inner, SUP, '^') : script(inner, SUB, '_');
      i = j;
    } else if (c === '{' || c === '}') {
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function latexToPlain(s: string): string {
  return s
    .split(/(?<!\\)\$/)
    .map((part, i) => (i % 2 ? convert(part) : part.replace(/\\\$/g, '$')))
    .join('');
}
