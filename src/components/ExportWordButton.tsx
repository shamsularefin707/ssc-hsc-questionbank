import { useState } from 'preact/hooks';
import type { Pool } from '../lib/data-client';
import { UI } from '../lib/labels';
import type { QuestionSet } from '../lib/set-builder';
import { setTitle } from '../lib/set-title';
import type { Lang } from '../lib/types';

/** Builds the .docx in the browser; the docx library is only fetched on click. */
export function ExportWordButton({ set, pool, lang, title, fileName }: { set: QuestionSet; pool: Pool; lang: Lang; title?: string; fileName?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onClick = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { downloadDocx } = await import('../lib/export/docx');
      await downloadDocx(set, lang, title ?? setTitle(pool.manifest, lang), (ch, id) => pool.stimuli.get(`${ch}/${id}`), fileName);
    } catch (e) {
      console.error(e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" class="btn" onClick={onClick} disabled={busy} aria-live="polite">
      {failed ? UI.downloadFailed[lang] : UI.downloadWord[lang]}
    </button>
  );
}
