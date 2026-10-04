# SSC/HSC Science Question Bank: Design Spec

Date: 2026-10-04
Owner: Arefin (@shamsularefin707)
Status: Draft, awaiting owner review

## 1. Purpose and success criteria

A free website where Bangladeshi SSC and HSC **science group** students can find exam-style questions with full solutions. They filter by subject, chapter, topic, difficulty and question type, practise with them, and copy or export them.

It is a **pre-built question bank**. Every question shown to a student already exists in the repository and has passed review. The site never writes new questions while someone is using it. The "build a question set" feature only *selects* questions from the bank.

Success means:
- A student can reach the right questions in a few clicks and see a correct solution in Bangla or English.
- A teacher can assemble a printable question set (PDF or Word) with a separate answer sheet.
- Every published question has been through the checking process in section 6.
- The site runs on free hosting.

## 2. Scope

### In scope
- Levels: SSC and HSC, science group only.
- Subjects (to be confirmed against the current NCTB syllabus while building):
  - SSC: Physics, Chemistry, Biology, General Math, Higher Math.
  - HSC: Physics 1st/2nd Paper, Chemistry 1st/2nd Paper, Biology 1st/2nd Paper, Higher Math 1st/2nd Paper, ICT.
- Written content: target about 100 CQs and 200 MCQs per chapter, written by Claude and checked as described in section 6.
- Board questions from 2015 to 2026, collected from public sources (section 5).
- Admission questions grouped as Medical, Engineering and Varsity (section 5).
- Every question in **both Bangla and English**.
- No login. Per-student data (bookmarks, recent results) is saved only in that student's browser.
- Export as PDF and Word (.docx).

### Out of scope for now
- Accounts, logins, payments and server-side progress tracking.
- Humanities and commerce groups.
- Generating questions live with AI on the site.
- English and General Knowledge sections of admission tests. The default is science subjects only; the owner can add these later.

## 3. Content model

### Hierarchy
Level → Subject → Chapter → Topic.
- Each HSC paper counts as its own subject (e.g. `hsc/physics-1`).
- There is one syllabus file per subject listing its chapters and topics, following the current NCTB textbook. It has stable slugs and titles in both languages.

### Shared fields (every question)
| Field | Notes |
|---|---|
| `id` | Stable and unique, e.g. `ssc-phy-03-mcq-0042` |
| `level`, `subject`, `chapter`, `topics[]` | Topic slugs come from the syllabus file |
| `difficulty` | `easy` / `medium` / `hard` |
| `source` | `{kind: original}` · `{kind: board, exam, board, year}` · `{kind: admission, category: medical/engineering/varsity, institution, session, unit?}` |
| `status` | `draft` → `checked` → `reviewed` |
| `figures[]` | Optional SVG/PNG files stored in the chapter folder, with alt text in both languages |

Text fields are objects of the form `{bn, en}`. Math is written as LaTeX between `$…$` delimiters.

### MCQ
- `mcq_type`: `gyanmulok` (জ্ঞানমূলক), `onudhabon` (অনুধাবনমূলক), `bohupodi` (বহুপদী সমাপ্তিসূচক) or `ovinno` (অভিন্ন তথ্যভিত্তিক).
- `stem {bn,en}`, `options[4] {bn,en}`, `answer` (0–3), `explanation {bn,en}`.
- `bohupodi` also has `statements[] {bn,en}` (i, ii, iii). Its options are the standard combinations ("i and ii", and so on).
- `ovinno` has a `stimulus_id` that points to a shared stimulus in the same file. A set is usually 2 questions.

### CQ
- `stimulus {bn,en}` (উদ্দীপক) plus optional figures.
- `parts`: `ka` (1 mark, জ্ঞান), `kha` (2, অনুধাবন), `ga` (3, প্রয়োগ), `gha` (4, উচ্চতর দক্ষতা). Each part has `question {bn,en}` and `solution {bn,en}`.
- `difficulty` is set for the CQ as a whole.

### Files
```
content/
  syllabus/ssc/physics.yaml
  ssc/physics/03-motion/
    mcq.yaml
    cq.yaml
    figures/*.svg
  board/ssc/physics/dhaka-2023.yaml   # paper index: ordered list of question ids
  admission/medical/mbbs-2023-24.yaml # paper index
```
- Content is authored as YAML so it reads well in a pull request. At build time it is compiled to per-chapter JSON.
- Board and admission questions live in the chapter file they belong to, tagged with their `source`. A paper index file lists the question ids in paper order, so each full paper can be rebuilt.
- A JSON Schema defines every file type. The validator (section 6) enforces it.

## 4. Website

### Stack
- **Astro** static site. Interactive parts (filters, practice, mock exam, set builder, export) are small Preact islands.
- **KaTeX** renders math at build time, so pages carry no math JavaScript.
- **Noto Sans Bengali** for Bangla, plus a matching Latin font.
- Search uses a small **MiniSearch** index per subject, loaded only when that subject is opened.
- Hosted on **Cloudflare Pages** (free tier). Each chapter's JSON is a separate file, which keeps every file well under the platform's size limits.
- **GitHub Actions** runs CI.

### Pages and features
1. **Home**: choose SSC or HSC, then a subject.
2. **Question bank** (per subject):
   - Filters for chapter, topic, difficulty, CQ or MCQ, MCQ type, and source (original, board, admission), plus keyword search.
   - Question cards with "Show solution", a বাংলা/English switch (for the whole page, with a per-question override) and a copy button.
   - Copy produces clean plain text: the question plus its solution, with math converted to readable text (e.g. `v = u + at`, `x²`).
   - Filter state is kept in the URL so views can be shared.
3. **Build a question set**:
   - Inputs: subject, chapters or topics, difficulty (one level or a mix), MCQ types, number of MCQs, number of CQs.
   - Questions are picked by seeded random selection from the matching pool. The seed and inputs go in the URL, so a set can be reopened or shared. A "Reshuffle" button changes the seed.
   - If there aren't enough matching questions, the site says how many exist and offers to use them all. It never pads the set with non-matching questions.
   - From a set, the user can read it, practise it, or export it.
4. **MCQ practice**: one question at a time or as a list. Each answer is marked straight away with its explanation, and a score shows at the end.
5. **Mock exam** (board format):
   - MCQ section: 25 questions in 25 minutes, auto-marked.
   - CQ section: answer 5 of 8 in the remaining time (2 h 35 min). The student then compares their answers with the model solutions and gives themselves marks.
   - Results are saved in browser storage.
6. **Board questions**: choose exam, subject, board and year to see the full paper. It can be practised, taken as a mock exam, or exported. Board questions also appear in the normal bank with a badge such as "Dhaka 2023".
7. **Admission**: Medical, Engineering and Varsity groups, then institution, then session (and unit for varsity). The same practice, copy and export tools apply.

### Export
- **Word**: generated in the browser with the `docx` library. It has a question-paper section and the answer sheet on separate pages. Math is written as readable text, or as an image where the formula is complex.
- **PDF**: a print-styled page (question paper, a page break, then the answer sheet) saved with the browser's own "Save as PDF". This was chosen because in-browser PDF libraries often break Bangla letter shaping, while the browser's print engine handles it correctly.

### Per-student data
Bookmarks, recent practice scores and mock results go in `localStorage`. All reads and writes are wrapped so the site still works if storage is blocked.

### Error handling
- If a chapter's data fails to load, show a retry option instead of a blank page.
- Empty filter results say so clearly and offer to clear the most recent filter.
- If a question is missing its translation (the validator should prevent this), show the available language with a small notice.

## 5. Board and admission questions

- **Collection**: from public sources online (board papers, university admission papers). The question text is copied exactly and credited with its `source`.
- **Solutions**: written by us in both languages and checked the same way as original questions. Solution text is **not** copied from guide books or coaching sites.
- **Answer keys**: every key is re-derived independently, because published keys are often wrong. Disagreements are flagged for Opus review.
- **Coverage**: board papers for 2015–2026 for each science subject across the general education boards, collected subject by subject, newest years first.
- **Admission groups**:
  - Medical: MBBS/BDS.
  - Engineering: BUET, CKRUET, IUT, and others.
  - Varsity: DU, RU, JU, CU and others, organised by unit.
  - Science subjects only by default.
- **Feasibility check first**: many older papers exist only as scanned images. Before committing to full coverage, run a pilot on SSC Physics to confirm that reliable sources exist and to measure how much transcription each paper needs.

## 6. Content pipeline (writing and checking)

Model roles agreed with the owner: **Sonnet 5.5 drafts and checks; Opus supervises.**

1. **Blueprint (Opus)**: for each chapter, list its topics from the syllabus. Set how many questions each topic gets, the difficulty mix (about 30% easy, 50% medium, 20% hard), the MCQ type mix, and coverage of the CQ parts. Split the work into batches of about 10 CQs or 25 MCQs.
2. **Draft (Sonnet)**: write each batch in both languages, with solutions, following the blueprint.
3. **Independent check (Sonnet, separate pass)**: solve every question without seeing the given answer and flag any disagreement. Also check that the Bangla and English versions match, and that the topic and difficulty tags fit.
4. **Automatic validation (script, also in CI)**:
   - The files match the schema.
   - Both languages are present in every text field.
   - Each MCQ has exactly one correct answer and 4 distinct options.
   - Every `bohupodi` question has its statements, and every `ovinno` question has a valid `stimulus_id`.
   - Topic slugs exist in the syllabus.
   - Ids are unique.
   - Near-duplicates are caught by normalised text similarity within a subject.
   - Numerical answers are recomputed where a question marks its answer as computable.
5. **Supervision (Opus)**: review every flagged item and a random 10% of unflagged items. Send weak batches back for rewriting. Items that pass are marked `reviewed`.
6. **Owner review**: one pull request per chapter. It includes a report with counts by topic, difficulty and type, what was fixed, and 5 sample questions. Nothing is published until the owner merges it.

Board and admission questions follow the same process from step 3 onward. In step 2, Sonnet transcribes the question and writes the solution instead of inventing a question.

**Publishing rule**: the site shows only `reviewed` questions by default. A build flag can show `checked` questions with a "draft" label for previews.

## 7. Testing and CI

Runs on every pull request in GitHub Actions:
- The content validator (section 6, step 4).
- Unit tests (Vitest) for filtering, seeded set selection, mock exam timing and marking, copy-text formatting, and Word export structure.
- A Playwright smoke test that opens home, filters a chapter, reveals a solution, switches language, builds a set and opens the print view.
- An Astro production build.

A pull request cannot be merged while any check fails.

## 8. Budget and rollout

- Hosting costs nothing (Cloudflare Pages free tier).
- Work is funded from about **$100 of cloud session credits**. The estimates below are based on API prices and are approximate:
  - Website build: about $20–40.
  - One full chapter (100 CQs and 200 MCQs, bilingual, checked): about $5–15.
  - The full bank (about 150 chapters plus board and admission papers): about $1,500–3,000, which is well beyond the current budget.
- **Within the $100:**
  1. Set up the site with about 20 sample questions.
  2. Build all features: bank, set builder, practice, mock exam, copy, export, board and admission browsing.
  3. Run the board and admission collection pilot on SSC Physics.
  4. Write full pilot chapters of **SSC Physics** through the pipeline, one pull request per chapter, for as long as credits allow (expected 4–6 chapters).
  5. Go live on Cloudflare Pages.
- To stretch the budget: start chapters at a smaller size (e.g. 30 CQs and 60 MCQs) and grow them later, and prioritise the subjects students need most.

## 9. Future (not planned now)
- Accounts with synced progress and bookmarks, which would need a backend such as Supabase. The content files would carry over unchanged.
- Humanities and commerce groups.
- English and GK sections for admission tests.
