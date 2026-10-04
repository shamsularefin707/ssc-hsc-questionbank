import type { ComponentChildren } from 'preact';
import type { Bi, Lang } from '../lib/types';
import { Icon } from './Icon';

/** The only component allowed a pill shape (design-system §2). */
export function FilterChip({ pressed, onToggle, children }: { pressed: boolean; onToggle: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class="chip" aria-pressed={pressed} onClick={onToggle} style={{ borderRadius: 'var(--r-full)' }}>
      {pressed && <Icon name="check" />}
      {children}
    </button>
  );
}

/** A titled row of filter chips for one multi-select field. */
export function ChipSection<K extends string>({ title, options, selected, onToggle, lang }: { title: string; options: Record<K, Bi>; selected?: K[]; onToggle: (v: K) => void; lang: Lang }) {
  return (
    <div class="filter-section" role="group" aria-label={title}>
      <h3>{title}</h3>
      <div class="chips">
        {(Object.keys(options) as K[]).map((k) => (
          <FilterChip key={k} pressed={!!selected?.includes(k)} onToggle={() => onToggle(k)}>
            {options[k][lang]}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
