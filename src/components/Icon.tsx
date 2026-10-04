// Monochrome line icons (20px grid, currentColor).
const PATHS = {
  copy: 'M8 8h9v9H8zM5 13H4V4h9v1',
  check: 'M4 10.5l4 4 8-9',
  search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5L17 17',
  x: 'M5 5l10 10M15 5L5 15',
  filter: 'M3 5h14M6 10h8M8.5 15h3',
  star: 'M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7L3.2 8l4.7-.7z',
  arrowLeft: 'M12 5l-5 5 5 5',
  arrowRight: 'M8 5l5 5-5 5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg class="icon" viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
