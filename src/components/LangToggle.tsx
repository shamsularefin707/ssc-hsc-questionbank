import { setLang, useLang } from '../lib/lang';

export function LangToggle() {
  const lang = useLang();
  return (
    <div class="lang-toggle" role="group" aria-label="Language / ভাষা">
      <button type="button" class="btn btn-ghost" aria-pressed={lang === 'bn'} onClick={() => setLang('bn')} lang="bn">
        বাংলা
      </button>
      <button type="button" class="btn btn-ghost" aria-pressed={lang === 'en'} onClick={() => setLang('en')} lang="en">
        English
      </button>
    </div>
  );
}
