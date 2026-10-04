import { useState } from 'preact/hooks';
import { BOARDS, UI, digits } from '../lib/labels';
import { useLang } from '../lib/lang';
import type { Bi, PaperIndex } from '../lib/types';
import { ChipSection } from './FilterChip';

type BoardPaper = PaperIndex & { source: { kind: 'board'; board: string; year: number } };

/** Board papers for one subject, filterable by board and year, grouped board → year. */
export function PaperList({ papers }: { papers: PaperIndex[] }) {
  const lang = useLang();
  const board = papers.filter((p): p is BoardPaper => p.source.kind === 'board');
  const [boards, setBoards] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (!board.length)
    return (
      <div class="state">
        <h2>{UI.boardEmpty[lang]}</h2>
      </div>
    );

  const boardOpts = Object.fromEntries([...new Set(board.map((p) => p.source.board))].sort().map((b) => [b, BOARDS[b] ?? { bn: b, en: b }])) as Record<string, Bi>;
  const yearOpts = Object.fromEntries(
    [...new Set(board.map((p) => p.source.year))].sort((a, b) => b - a).map((y) => [String(y), { bn: digits(y, 'bn'), en: String(y) }]),
  ) as Record<string, Bi>;
  const shown = board.filter((p) => (!boards.length || boards.includes(p.source.board)) && (!years.length || years.includes(String(p.source.year))));
  const groups = new Map<string, BoardPaper[]>();
  for (const p of [...shown].sort((a, b) => a.source.board.localeCompare(b.source.board) || b.source.year - a.source.year)) {
    groups.set(p.source.board, [...(groups.get(p.source.board) ?? []), p]);
  }

  return (
    <div class="bank">
      <div class="panel">
        <ChipSection title={UI.board[lang]} options={boardOpts} selected={boards} onToggle={(v) => setBoards((l) => toggle(l, v))} lang={lang} />
        <ChipSection title={UI.year[lang]} options={yearOpts} selected={years} onToggle={(v) => setYears((l) => toggle(l, v))} lang={lang} />
      </div>
      <section>
        {shown.length === 0 ? (
          <div class="state">
            <h2>{UI.noPaperMatch[lang]}</h2>
            <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={() => (setBoards([]), setYears([]))}>
              {UI.clearAll[lang]}
            </button>
          </div>
        ) : (
          [...groups].map(([b, ps]) => (
            <div class="paper-group" key={b}>
              <h2>{(BOARDS[b] ?? { bn: b, en: b })[lang]}</h2>
              <ul class="subject-list">
                {ps.map((p) => (
                  <li key={p.id}>
                    <a class="subject-row" href={`/paper?id=${p.id}`}>
                      <span class="name">{p.title[lang]}</span>
                      <span class="meta">
                        {digits(p.mcq.length, lang)} MCQ · {digits(p.cq.length, lang)} CQ
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
