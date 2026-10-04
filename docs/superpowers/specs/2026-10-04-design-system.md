# Design System

Date: 2026-10-04
Applies to: every page and component of the question bank website, and the print view.
Companion to: `2026-10-04-question-bank-design.md`

## 1. Direction

The site should feel like a **well-printed exam paper**, not a SaaS landing page. Students come to read questions and solutions, so text is the product. Decoration that doesn't help someone read, filter or answer gets deleted.

- Warm paper background, ink-dark text, and **one** accent colour: Bangladesh bottle green.
- Structure comes from borders, spacing and typography, never from shadows, gradients or glass.
- Questions are set in a serif face, like a printed paper. The interface around them uses a sans face.
- Every state that colour communicates (correct, wrong, selected) is also shown with text or an icon.

## 2. Banned (enforced by `scripts/check-slop.ts` in CI)

| Banned | Use instead |
|---|---|
| Gradients of any kind (`linear-`, `radial-`, `conic-gradient`) | Solid token colours |
| `backdrop-filter` / glass panels | Opaque surface + 1px border |
| Box shadows on cards and buttons | 1px border. The only shadow allowed is on floating menus/drawers, via `--shadow-overlay` |
| Raw hex/rgb colours outside `src/styles/tokens.css` | `var(--…)` tokens |
| Pill-shaped wrappers (`border-radius ≥ 999px`) on static text | Plain secondary text. Pill shape only for interactive filter chips |
| Decorative icons in inputs | Only search magnifier, clear (×) and similar functional icons |
| Cartoon/stock illustrations, mascots, emoji as decoration | Text plus one action; a 20px monochrome icon at most |
| Hero banners, stock photos, "trusted by" rows, testimonial carousels, animated counters | Straight to subject selection |
| Bounce/spring animations, parallax, auto-playing motion | Short opacity/transform fades (see §7) |
| More than 2 font weights per family on a page | 400 and 600 only |
| Colour as the only signal | Colour plus label or icon |

## 3. Tokens

Three layers in `src/styles/tokens.css`: primitive → semantic → component. Components reference only semantic or component tokens.

### Primitive
```
--green-700: #00573F   --green-600: #006A4E   --green-100: #E3F0EA
--red-700:   #A4262C   --red-100:   #F8E5E4
--amber-700: #8A5A00   --amber-100: #FBF0D9
--paper-0:   #FFFFFF   --paper-50:  #FBFAF7   --paper-100: #F4F2EC
--ink-200:   #DEDAD0   --ink-300:   #C8C3B6   --ink-400:   #8C877D   --ink-500:   #6B665E
--ink-700:   #45413B   --ink-900:   #1C1A17
/* dark */
--night-900: #141311   --night-800: #1D1C19   --night-700: #282622
--night-500: #4A4741   --night-400: #6E6A62   --night-300: #9A958B   --night-100: #EDEAE3
--green-300: #5FBF98   --red-300:   #F08A8F   --amber-300: #E8B95A
```

### Semantic (light → dark)
| Token | Light | Dark |
|---|---|---|
| `--bg` | paper-50 | night-900 |
| `--surface` | paper-0 | night-800 |
| `--surface-sunken` | paper-100 | night-900 |
| `--border` | ink-200 | night-700 |
| `--border-strong` | ink-400 | night-400 |
| `--text` | ink-900 | night-100 |
| `--text-muted` | ink-500 | night-300 |
| `--accent` | green-600 | green-300 |
| `--accent-hover` | green-700 | `#7DCFAE` |
| `--on-accent` | paper-0 | night-900 |
| `--accent-soft` | green-100 | `#1F3A30` |
| `--correct` / `--correct-soft` | green-700 / green-100 | green-300 / `#1F3A30` |
| `--wrong` / `--wrong-soft` | red-700 / red-100 | red-300 / `#3D2224` |
| `--warn` / `--warn-soft` | amber-700 / amber-100 | amber-300 / `#3A2F18` |
| `--focus` | green-600 | green-300 |
| `--shadow-overlay` | `0 8px 24px rgb(28 26 23 / .12)` | `0 8px 24px rgb(0 0 0 / .5)` |

Dark mode applies under `@media (prefers-color-scheme: dark)` and under `:root[data-theme="dark"]`. A light override is `:root[data-theme="light"]`.

All text/background pairs meet WCAG AA: 4.5:1 for body text, 3:1 for large text and UI borders that carry meaning. Verify with a contrast check in Task 8.

### Space, size, shape
- Spacing scale (4pt): `--s-1: 4px`, `--s-2: 8px`, `--s-3: 12px`, `--s-4: 16px`, `--s-5: 24px`, `--s-6: 32px`, `--s-7: 48px`, `--s-8: 64px`.
- Radius: `--r-sm: 4px` (inputs, options), `--r-md: 6px` (cards, buttons). `--r-full` exists only for filter chips.
- Border width: 1px everywhere. A 2px left border marks the selected/answered MCQ option.
- Reading width: question text `max-width: 68ch`. Page container 1200px with a 16px gutter on mobile and 24px from 768px up.
- Touch targets: at least 44×44px on interactive elements at mobile widths.

## 4. Typography

| Role | Bangla | Latin | Weights |
|---|---|---|---|
| UI (nav, filters, buttons, labels) | Noto Sans Bengali | IBM Plex Sans | 400, 600 |
| Question and solution text | Noto Serif Bengali | Source Serif 4 | 400, 600 |
| Math | KaTeX default | KaTeX default | |

Font stacks list the Bangla face first so Bangla glyphs never fall back. Example: `--font-ui: "Noto Sans Bengali", "IBM Plex Sans", system-ui, sans-serif`. Fonts load from Google Fonts with `display=swap`, limited to the weights above.

Type scale. Bangla needs more line height than Latin.

| Token | Size | Line height | Use |
|---|---|---|---|
| `--t-xs` | 13px | 1.5 | metadata (source, topic, difficulty) |
| `--t-sm` | 15px | 1.6 | UI text, options |
| `--t-md` | 17px | 1.75 | question and solution body |
| `--t-lg` | 20px | 1.5 | section headings |
| `--t-xl` | 24px | 1.4 | page titles |
| `--t-2xl` | 32px | 1.3 | home page title only |

Headings use weight 600. There is no all-caps text, and letter-spacing is never adjusted for Bangla.

## 5. Components

### Question card
- `--surface` background, 1px `--border`, `--r-md`, padding `--s-5` (`--s-4` under 480px), with `--s-4` between cards. No shadow.
- Metadata row in `--t-xs` `--text-muted` plain text, separated by "·": e.g. `Motion · Medium · জ্ঞানমূলক · Dhaka 2023`. Difficulty is plain text, not a coloured badge.
- Body in the serif face at `--t-md`. Figures sit at full card width, max 480px, with a caption in `--t-xs`.
- Action row (bottom, left-aligned): "Show solution" (secondary button), copy (icon button with a tooltip and the label "Copy"), bookmark (icon button, `aria-pressed`), language override (text toggle "EN"/"বাং").
- Solution: revealed inline below a 1px `--border` divider, on a `--surface-sunken` background. No accordion animation beyond §7.
- অভিন্ন তথ্যভিত্তিক: one card holds the stimulus, with each question below it separated by a divider.

### MCQ options (practice and mock)
| State | Border | Background | Extra |
|---|---|---|---|
| Default | 1px `--border` | `--surface` | label (ক)/(a) in `--text-muted` |
| Hover/focus | 1px `--border-strong` | `--surface` | focus ring (see Focus) |
| Selected (mock, before marking) | 2px left `--accent` | `--accent-soft` | "Selected" for screen readers |
| Correct | 2px left `--correct` | `--correct-soft` | check icon + "Correct" text |
| Wrong (chosen) | 2px left `--wrong` | `--wrong-soft` | cross icon + "Incorrect" text; the correct option is also marked |
| Locked | as above | | `aria-disabled`, cursor default |

### Buttons
| Variant | Default | Hover | Active | Disabled |
|---|---|---|---|---|
| Primary | `--accent` bg, `--on-accent` text | `--accent-hover` | `--accent-hover`, no scale | `--surface-sunken` bg, `--text-muted` |
| Secondary | `--surface` bg, 1px `--border-strong`, `--text` | `--surface-sunken` bg | same | `--text-muted`, `--border` |
| Ghost / icon | transparent, `--text-muted` | `--surface-sunken` bg, `--text` | same | `--text-muted` at 50% opacity |

Buttons are 40px tall (44px under 768px), with `--r-md` corners and `--t-sm` weight-600 labels. Labels start with a verb: "Show solution", "Build set", "Start mock exam", "Download Word", "Save as PDF". Never "Submit" or "OK". Each screen has at most one primary button.

### Filters
- Desktop: a left sidebar 260px wide with sections separated by `--border` dividers. Mobile: a full-height drawer from the left opened by a "Filters (n)" button, with an opaque `--surface` and `--shadow-overlay`.
- Chapters and topics: checkbox tree. Difficulty, kind, MCQ type and source: filter chips (`--r-full`, 1px `--border-strong`; selected = `--accent-soft` bg + `--accent` border + check icon).
- The search input has a magnifier icon and a clear (×) button, and no other icons.
- Applied filters are summarised above the results as "12 questions · Motion, Easy" with a "Clear all" text button.

### Timer (mock exam)
A sticky top bar on `--surface` with a 1px bottom border, showing the time as `MM:SS` in tabular figures (`font-variant-numeric: tabular-nums`). Under 5 minutes it switches to `--warn` text plus a "5 minutes left" announcement via `aria-live="polite"`. No flashing.

### Empty, loading and error states
- **Empty**: a heading, one sentence, and one action. Example: "No questions match these filters" + "Clear difficulty". No illustrations.
- **Loading**: under 300 ms, show nothing. Past that, show skeleton cards (static `--surface-sunken` blocks, no shimmer).
- **Error**: "Couldn't load this chapter. Check your connection and try again." + a "Try again" button. The message never blames the user.

### Focus
Every interactive element gets `outline: 2px solid var(--focus); outline-offset: 2px` on `:focus-visible`. Never `outline: none` without this replacement. Drawers and dialogs trap focus and return it to the trigger when closed.

## 6. Layout patterns per page

| Page | Pattern |
|---|---|
| Home | Short title + one-line purpose, then two columns (SSC, HSC) of subject links as bordered rows (name, chapter count, question count). No hero. |
| Question bank | Split: filter sidebar + results list |
| Build a set | Form on the left (or top on mobile), results list on the right |
| Practice | Single centered column, 68ch |
| Mock exam | Sticky timer bar + single column |
| Board / Admission | List: grouped rows (board → year), plain text links |
| Print | A4 paper layout, serif, black on white, no site chrome, and no colour except figures |

## 7. Motion

- Durations: `--dur-fast: 120ms` (hover, toggles), `--dur-base: 180ms` (reveal, drawer).
- Easing: `cubic-bezier(.2, 0, 0, 1)`.
- Only `opacity` and `transform` animate. Solutions fade in. The drawer slides in at most 16px plus a fade.
- Under `prefers-reduced-motion: reduce`, all durations become 0ms.

## 8. Enforcement

`scripts/check-slop.ts` runs in CI over `src/**/*.{astro,tsx,css}`. It fails on:
- any gradient function, `backdrop-filter`, or `box-shadow` not using `var(--shadow-overlay)`;
- hex/`rgb(`/`hsl(` colour literals outside `src/styles/tokens.css`;
- `border-radius: 9999px` / `999px` / `var(--r-full)` outside the filter chip component;
- `outline: none` / `outline: 0` without a `:focus-visible` rule in the same file;
- button labels equal to `Submit`, `OK` or `Proceed`;
- `font-weight` values other than 400 and 600.

Before shipping, a manual pass checks every page at 375px, 768px and 1280px in light and dark mode against §2 and §5.
