import { useEffect, useRef, useState } from 'preact/hooks';
import { UI } from '../lib/labels';
import type { Lang } from '../lib/types';
import { Icon } from './Icon';

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall back below */
  }
  // Fallback for browsers without the async Clipboard API.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function CopyButton({ getText, lang }: { getText: () => string; lang: Lang }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await writeClipboard(getText());
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  const label = state === 'copied' ? UI.copied[lang] : state === 'failed' ? UI.copyFailed[lang] : UI.copy[lang];
  return (
    <button type="button" class="btn btn-ghost" onClick={onClick} title={UI.copy[lang]} aria-live="polite">
      <Icon name={state === 'copied' ? 'check' : 'copy'} />
      <span>{label}</span>
    </button>
  );
}
