import type { ComponentChildren } from 'preact';
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
