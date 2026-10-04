// Turns authored text (plain text with $…$ LaTeX) into HTML with pre-rendered KaTeX.
import katex from 'katex';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const textToHtml = (s: string) => escapeHtml(s.replace(/\\\$/g, '$')).replace(/\n/g, '<br>');

export function renderRich(text: string): string {
  // Split on unescaped $; odd segments are math.
  const parts = text.split(/(?<!\\)\$/);
  return parts
    .map((part, i) => {
      if (i % 2 === 0) return textToHtml(part);
      try {
        return katex.renderToString(part, { throwOnError: true, strict: 'ignore', output: 'htmlAndMathml' });
      } catch (e) {
        console.warn(`KaTeX could not render "${part}": ${(e as Error).message}`);
        return textToHtml(`$${part}$`);
      }
    })
    .join('');
}
