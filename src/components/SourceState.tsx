import { UI } from '../lib/labels';
import type { Lang } from '../lib/types';
import type { useSource } from '../lib/use-source';

/** The not-ready states shared by pages that read their questions from the URL; null once ready. */
export function SourceState({ src, lang }: { src: ReturnType<typeof useSource>; lang: Lang }) {
  if (src.source === undefined) return null;
  if (src.source === null || src.status === 'missing')
    return (
      <div class="state">
        <h2>{src.status === 'missing' ? UI.paperMissing[lang] : UI.badLink[lang]}</h2>
        <p>{UI.badLinkHint[lang]}</p>
        <a class="btn" href="/">
          {UI.goHome[lang]}
        </a>
      </div>
    );
  if (src.status === 'error')
    return (
      <div class="state" role="alert">
        <h2>{UI.loadError[lang]}</h2>
        <button type="button" class="btn" style={{ marginTop: 'var(--s-4)' }} onClick={src.retry}>
          {UI.tryAgain[lang]}
        </button>
      </div>
    );
  if (src.status === 'loading') return <div class="skeleton" aria-busy="true" />;
  return null;
}
