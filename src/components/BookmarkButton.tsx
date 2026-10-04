import { useEffect, useState } from 'preact/hooks';
import { UI } from '../lib/labels';
import { getBookmarks, toggleBookmark } from '../lib/storage';
import type { Lang } from '../lib/types';
import { Icon } from './Icon';

/** Star toggle saved in this browser only (qb:bookmarks). */
export function BookmarkButton({ id, lang }: { id: string; lang: Lang }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(getBookmarks().includes(id)), [id]);
  const label = on ? UI.unbookmark[lang] : UI.bookmark[lang];
  return (
    <button type="button" class="btn btn-ghost" aria-pressed={on} aria-label={label} title={label} onClick={() => setOn(toggleBookmark(id))}>
      <Icon name="star" filled={on} />
    </button>
  );
}
