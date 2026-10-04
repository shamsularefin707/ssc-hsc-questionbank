# Content Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the two sample chapters (18 MCQs, 4 CQs) into a real SSC Physics bank by building the tooling and prompts for the blueprint → draft → check → validate → supervise → PR pipeline, then running it chapter by chapter.

**Architecture:** An Opus session (the supervisor) writes a blueprint per chapter, dispatches Sonnet 5.5 subagents to draft batches into `pipeline/` work files, dispatches separate Sonnet subagents to check them blind, and uses a small CLI (`npm run pipeline -- <cmd>`) to merge batches into the chapter's `mcq.yaml` / `cq.yaml`, apply check results, pick the review sample, promote statuses and write the PR report. The site and validator from plan 1 stay as they are; content still lands one PR per chapter.

**Tech Stack:** TypeScript run with `tsx`, Vitest, the `yaml` package (format-preserving edits), the existing validator in `src/lib/validate/rules.ts`, Claude Code's Agent tool with `model: "sonnet"` for drafting and checking.

**Spec:** `docs/superpowers/specs/2026-10-04-question-bank-design.md` (sections 3, 6 and 8 matter most here).

## Global Constraints

- Per chapter target: **200 MCQs + 100 CQs**, every text field `{bn, en}`, math as LaTeX between `$…$`.
- Difficulty mix per chapter: **30% easy, 50% medium, 20% hard** (±5 points).
- MCQ type mix per chapter (default chosen here, spec leaves it open): **gyanmulok 35%, onudhabon 30%, bohupodi 20%, ovinno 15%** (ovinno in sets of 2 sharing one stimulus).
- CQ parts: `ka` 1 mark জ্ঞান, `kha` 2 অনুধাবন, `ga` 3 প্রয়োগ, `gha` 4 উচ্চতর দক্ষতা. Every CQ has all four.
- Batch size: **25 MCQs or 10 CQs**. So a full chapter is 8 MCQ batches + 10 CQ batches.
- Ids: `ssc-phy-NN-mcq-NNNN` / `ssc-phy-NN-cq-NNNN`, sequential, continuing after the existing samples. Never reuse or renumber a merged id.
- Statuses: drafts merge as `draft`; a clean blind check makes them `checked`; only Opus sets `reviewed`. The site publishes `reviewed` only.
- Models: **Sonnet 5.5 drafts and checks, Opus supervises** (blueprint, flagged items, 10% random sample, sign-off).
- Every chapter PR passes `npm test`, `npm run validate` (0 errors, 0 near-duplicate warnings left unexplained) and `npm run build`.
- Budget: about $100 of credits in total, part already spent on the website. Stop after the first full chapter and report its real cost before starting the next.
- Digits: Latin digits (0–9) in both languages, matching the existing samples. Bangla wording follows the NCTB textbook terms.

## Review Focus

1. **Translation drift**: the Bangla and English versions give different numbers (e.g. 20 m vs 25 m). Expected: the validator warns. Pinned by `number-parity` in Task 2.
2. **Answer-position bias**: drafters put most correct answers at option খ. Expected: the report shows the spread and flags any position above 40%; the merge shuffles non-bohupodi options. Pinned in Tasks 3 and 5.
3. **Stimulus id collisions**: two ovinno batches both use `s-1`. Expected: merge renames batch stimulus ids so they stay unique. Pinned in Task 3.
4. **Merging a batch twice** after an interrupted run. Expected: refused with a clear message. Pinned in Task 3.
5. **A full 300-question chapter on the site**: bank, set builder and mock exam stay usable. Expected: chapter JSON loads and the e2e smoke test still passes on the pilot chapter. Checked in Task 7.

---

## File Structure

```
pipeline/                                 work files, not read by the site
  prompts/
    style-guide.md                        shared writing rules (both languages, LaTeX, NCTB terms)
    draft-mcq.md  draft-cq.md             drafter instructions (Sonnet)
    check.md                              blind checker instructions (Sonnet)
    supervise.md                          supervisor checklist (Opus)
  ssc/physics/02-motion/
    blueprint.yaml                        per-topic counts and batch plan
    batches/mcq-01.yaml …                 drafter output (deleted after merge)
    checks/mcq-01.yaml …                  checker output (kept for audit)
    ledger.json                           which batches were merged, id ranges
src/lib/pipeline/
  blueprint.ts                            blueprint types, loading, coverage maths
  merge.ts                                batch → chapter file merge
  checks.ts                               apply check results, review sample, promote
  report.ts                               PR report markdown
scripts/pipeline.ts                       CLI: plan | merge | apply-checks | sample | promote | report
schema/blueprint.schema.json  schema/batch.schema.json  schema/check.schema.json
src/lib/validate/rules.ts                 + numberParityRule
docs/content-pipeline.md                  runbook for running one chapter
tests/pipeline/*.test.ts  tests/fixtures/pipeline/…
```

---

### Task 1: Blueprint format and coverage maths

**Files:**
- Create: `schema/blueprint.schema.json`, `src/lib/pipeline/blueprint.ts`, `tests/pipeline/blueprint.test.ts`, `tests/fixtures/pipeline/blueprint.yaml`
- Modify: `package.json` (add `yaml` dependency, `"pipeline": "tsx scripts/pipeline.ts"` script)

**Interfaces:**
- Produces:
  - `interface Blueprint { level: Level; subject: string; chapter: string; mcq_total: number; cq_total: number; topics: { slug: string; mcq: number; cq: number; focus: string[] }[]; batches: Batch[] }`
  - `interface Batch { name: string /* "mcq-01" */; kind: 'mcq' | 'cq'; count: number; topics: string[]; difficulty: Record<Difficulty, number>; mcq_types?: Record<McqType, number>; focus: string[] }`
  - `loadBlueprint(path: string): Blueprint` (validates against the schema, throws listing every error)
  - `planBatches(level, subject, chapter, syllabus: Syllabus, totals: { mcq: number; cq: number }): Blueprint` — splits totals across topics in proportion to an equal weight (Opus edits weights afterwards), then into batches of 25 / 10, each batch's difficulty and type counts following the Global Constraints mix with rounding remainders given to medium / gyanmulok.
  - `coverage(bp: Blueprint, questions: Question[]): CoverageRow[]` with `CoverageRow { topic: string; kind: 'mcq'|'cq'; planned: number; actual: number }`

- [ ] **Step 1: Write failing tests** in `tests/pipeline/blueprint.test.ts`:
  - `planBatches(... 02-motion, {mcq: 200, cq: 100})` gives 8 MCQ batches of 25 and 10 CQ batches of 10; summed difficulty is `{easy: 60, medium: 100, hard: 40}` for MCQs and `{easy: 30, medium: 50, hard: 20}` for CQs; summed MCQ types are `{gyanmulok: 70, onudhabon: 60, bohupodi: 40, ovinno: 30}`; every `ovinno` count is even.
  - every topic slug in the blueprint exists in the syllabus chapter.
  - `loadBlueprint` on the fixture round-trips; on a fixture with `count: 0` it throws naming the batch.
  - `coverage` on two fake questions tagged `free-fall` returns `actual: 2` for that topic and `0` elsewhere (a question with two topics counts for its first).
- [ ] **Step 2: Run** `npx vitest run tests/pipeline/blueprint.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `schema/blueprint.schema.json` and `src/lib/pipeline/blueprint.ts` with the signatures above. Use `npm i yaml` and `YAML.parse` for loading.
- [ ] **Step 4: Run** the same command — expect PASS.
- [ ] **Step 5: Commit** `feat(pipeline): blueprint format and batch planning`.

### Task 2: Number-parity validator rule

**Files:**
- Modify: `src/lib/validate/rules.ts` (new rule, wired into `validateAll`), `tests/validate/rules.test.ts`

**Interfaces:**
- Produces: `numberParityRule(f: RawFile): ValidationIssue[]` — for every `{bn, en}` field in mcq/cq files, extracts numbers with `/\d+(?:\.\d+)?/g` (Bangla digits ০–৯ mapped to Latin first) and emits a **warning** `number-parity` with the field path when the two sorted lists differ.

- [ ] **Step 1: Write failing tests**: in `rules.test.ts`, set the fixture's first MCQ `stem.bn` to contain `20 m` and `stem.en` `25 m` → `has(f, 'number-parity', 'warning')` is true; `২০` vs `20` → no issue; the existing "good fixture has no issues" and "real content has no errors" tests still pass.
- [ ] **Step 2: Run** `npx vitest run tests/validate` — expect the new test to FAIL.
- [ ] **Step 3: Implement** the rule and add it to the per-file list in `validateAll`.
- [ ] **Step 4: Run** `npx vitest run tests/validate && npm run validate` — expect PASS and the current content still at 0 errors (fix any real parity warnings it finds in the samples).
- [ ] **Step 5: Commit** `feat(validate): warn when Bangla and English numbers differ`.

### Task 3: Merge a batch into the chapter file

**Files:**
- Create: `schema/batch.schema.json`, `src/lib/pipeline/merge.ts`, `tests/pipeline/merge.test.ts`, fixtures `tests/fixtures/pipeline/batches/mcq-01.yaml`, `cq-01.yaml`

**Interfaces:**
- Consumes: `Blueprint`, `Batch` (Task 1); `validateAll` (existing).
- Produces:
  - A batch file is a chapter file without ids: `{ kind: 'mcq'|'cq', batch: string, stimuli?: [...], questions: [...] }`, where each question has `ref` (local, e.g. `q7`) instead of `id`, and ovinno `stimulus_id` points at a batch-local stimulus id.
  - `mergeBatch(chapterYaml: string, batchYaml: string, ledger: Ledger, opts: { prefix: string /* "ssc-phy-02" */; seed: number }): { yaml: string; ledger: Ledger; ids: string[] }`
  - `interface Ledger { merged: { batch: string; kind: 'mcq'|'cq'; first: string; last: string; at: string }[] }`
  - Throws `BatchAlreadyMerged` when `ledger.merged` already has that batch name.

Behaviour the tests pin: ids continue from the highest existing number in the chapter file (`0010` → `0011`); every merged question gets `status: draft` and `source: {kind: original}` if absent; stimulus ids are rewritten to `s-<batch>-<n>` and their references follow; non-bohupodi options are shuffled with `mulberry32(seed)` from `src/lib/rng.ts` and `answer` follows the correct option; bohupodi options keep their order; the output keeps flow style for `{bn, en}` pairs (use `yaml`'s `parseDocument` and append nodes, not `stringify` of plain objects).

- [ ] **Step 1: Write failing tests** in `tests/pipeline/merge.test.ts`:
  - merging the MCQ fixture (3 questions, 1 ovinno pair) into a copy of `content/ssc/physics/02-motion/mcq.yaml` returns ids `ssc-phy-02-mcq-0011` … `0013`; the result passes `validateAll` with 0 errors.
  - after merge, for each merged question `options[answer].en` equals the option that was correct in the batch.
  - the bohupodi question's options are in the same order as in the batch.
  - two batches that both define stimulus `s1` merge without a duplicate stimulus id.
  - merging `mcq-01` twice throws `BatchAlreadyMerged`.
  - the merged text still contains `- { bn: দ্রুতি, en: Speed }` (existing flow style preserved).
- [ ] **Step 2: Run** `npx vitest run tests/pipeline/merge.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `schema/batch.schema.json` (reuse `$defs` from `mcq-file`/`cq-file` with `ref` replacing `id`, status optional) and `mergeBatch`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(pipeline): merge drafted batches into chapter files`.

### Task 4: Apply checks, review sample, promote

**Files:**
- Create: `schema/check.schema.json`, `src/lib/pipeline/checks.ts`, `tests/pipeline/checks.test.ts`

**Interfaces:**
- Consumes: chapter YAML text, `mulberry32` from `src/lib/rng.ts`.
- Produces:
  - Check file format (written by the Sonnet checker): `{ batch: string; results: { id: string; solved_answer?: number; parts_ok?: boolean; issues: { kind: 'answer' | 'translation' | 'tags' | 'clarity' | 'math' | 'figure'; note: string }[] }[] }`
  - `applyChecks(chapterYaml: string, check: CheckFile): { yaml: string; checked: string[]; flagged: { id: string; issues: Issue[] }[] }` — a question with no issues and (for MCQs) `solved_answer === answer` goes `draft → checked`; anything else stays `draft` and is listed in `flagged`. A disagreeing `solved_answer` adds an `answer` issue automatically.
  - `reviewSample(ids: string[], seed: number, rate = 0.1): string[]` — `ceil(rate × n)` ids, deterministic for a seed.
  - `setStatus(chapterYaml: string, ids: string[], status: 'draft'|'checked'|'reviewed'): string` — throws if an id is missing.

- [ ] **Step 1: Write failing tests**:
  - a check with `solved_answer` equal to the answer and no issues sets `status: checked`; one with a different `solved_answer` leaves `draft` and appears in `flagged` with an `answer` issue.
  - a check result naming an id not in the file throws with that id.
  - `reviewSample` of 200 ids returns 20 distinct ids, the same 20 for the same seed.
  - `setStatus(..., ['ssc-phy-02-mcq-0001'], 'reviewed')` changes only that question's status line.
- [ ] **Step 2: Run** `npx vitest run tests/pipeline/checks.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** the schema and `checks.ts`.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(pipeline): apply blind checks and pick review samples`.

### Task 5: Chapter report and the CLI

**Files:**
- Create: `src/lib/pipeline/report.ts`, `scripts/pipeline.ts`, `tests/pipeline/report.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1, 3 and 4; `readContentFiles`, `deriveContent`, `validateAll`.
- Produces:
  - `chapterReport(input: { blueprint: Blueprint; questions: Question[]; flaggedFixed: { id: string; what: string }[]; samples: string[]; issues: ValidationIssue[] }): string` — markdown with: totals by kind and status; a topic × difficulty table with planned vs actual; MCQ type counts; correct-answer position counts with a `⚠` on any position above 40%; validator warnings; the fixed-item list; 5 sample questions in both languages.
  - CLI `npm run pipeline -- <cmd> <level>/<subject>/<chapter> [...]`:
    - `plan` → writes `pipeline/<…>/blueprint.yaml` from `planBatches` with totals 200/100 (flags `--mcq N --cq N` override).
    - `merge <batch>` → merges `batches/<batch>.yaml` into the chapter file, updates `ledger.json`, writes `checks/<batch>.input.yaml` (the merged questions with `answer`, `explanation` and CQ `solution` fields removed, for the blind checker), runs the validator on the chapter and exits 1 on errors.
    - `apply-checks <batch>` → applies `checks/<batch>.yaml`, prints flagged ids.
    - `sample [--seed N]` → prints the 10% review sample of `checked` ids.
    - `promote <ids…|--all-checked>` → sets `reviewed`.
    - `report` → prints the PR report.

- [ ] **Step 1: Write failing tests**: `chapterReport` with 10 MCQs whose answers are all `1` contains `⚠` on the খ/B row; its topic table has a row for every blueprint topic, including ones with 0 actual; it contains exactly 5 `<details>` sample blocks.
- [ ] **Step 2: Run** `npx vitest run tests/pipeline/report.test.ts` — expect FAIL.
- [ ] **Step 3: Implement** `report.ts` and `scripts/pipeline.ts` (argument parsing by hand, no new dependency).
- [ ] **Step 4: Run** `npx vitest run tests/pipeline && npm run pipeline -- report ssc/physics/02-motion` — tests PASS, the report prints for the current 10-question chapter (blueprint missing → it says so and still prints counts).
- [ ] **Step 5: Commit** `feat(pipeline): chapter report and pipeline CLI`.

### Task 6: Prompts, style guide and runbook

**Files:**
- Create: `pipeline/prompts/style-guide.md`, `draft-mcq.md`, `draft-cq.md`, `check.md`, `supervise.md`, `docs/content-pipeline.md`
- Modify: `README.md` (one line linking the runbook)

These are instructions for models, so the "test" is a dry run, not a unit test.

Content each file must carry:
- **style-guide.md**: NCTB Bangla terms for the subject (glossary table seeded from the syllabus titles); Latin digits; SI units in `\text{}`; `g = 9.8 m s⁻²` unless stated; bohupodi option wording exactly `i ও ii` / `i and ii`, `i ও iii`, `ii ও iii`, `i, ii ও iii` in that order; CQ part expectations per mark (ka: one fact; kha: explain in 2–3 sentences; ga: one calculation or application; gha: analysis or comparison with a justified conclusion); no letters ("option B") inside explanations, since options get shuffled; figures only as simple SVGs following `docs/superpowers/specs/2026-10-04-design-system.md`, and only when a CQ cannot work without one.
- **draft-mcq.md / draft-cq.md**: input is one blueprint batch; output is exactly one batch file matching `schema/batch.schema.json`; write English and Bangla together, not one translated after; vary scenarios, names and numbers across the batch; every numeric MCQ gets a `computable` block.
- **check.md**: input is the merged questions of one batch with `answer` and solutions removed (the CLI's `merge` also writes `checks/<batch>.input.yaml` for this); solve each independently; then compare against the full version and record issues in the check-file format; check bn/en meaning, tags and difficulty.
- **supervise.md**: Opus checklist — review every flagged item, the 10% sample and every near-duplicate warning; fix small issues directly, send a batch back for redraft when more than 20% of it is flagged; promote; write the PR.
- **docs/content-pipeline.md**: the step-by-step for one chapter with the exact CLI calls, how many subagents run at once (4 drafters, then 4 checkers), and how to record cost.

- [ ] **Step 1: Write** the six files with the content above.
- [ ] **Step 2: Dry run**: dispatch one Sonnet drafter on a 5-question MCQ batch for `02-motion`, run `merge`, one Sonnet checker, `apply-checks`. Expected: merge exits 0, the checker's file passes `schema/check.schema.json`. Fix the prompts until both hold, then `git restore content/` to throw the dry-run questions away.
- [ ] **Step 3: Commit** `docs(pipeline): prompts, style guide and runbook`.
- [ ] **Step 4: Open the tooling PR** (Tasks 1–6) and get it merged before any chapter work.

### Task 7: Pilot chapter, SSC Physics 02 Motion, at full size

**Files:**
- Create: `pipeline/ssc/physics/02-motion/{blueprint.yaml, checks/*, ledger.json}`
- Modify: `content/ssc/physics/02-motion/mcq.yaml`, `cq.yaml`

Chosen first because it already has samples and is core to every later chapter.

- [ ] **Step 1: Blueprint (Opus)**: `npm run pipeline -- plan ssc/physics/02-motion`, then adjust topic weights and per-batch `focus` lists so no two batches cover the same sub-skill. Expected: `loadBlueprint` accepts it.
- [ ] **Step 2: Draft (Sonnet)**: dispatch the 18 batches, 4 at a time, each with `pipeline/prompts/style-guide.md` + its draft prompt + its batch entry. After each returns, `npm run pipeline -- merge ssc/physics/02-motion <batch>`. Expected: every merge exits 0.
- [ ] **Step 3: Check (Sonnet)**: one fresh checker per batch on `checks/<batch>.input.yaml`, then `apply-checks`. Expected: every question is either `checked` or listed as flagged.
- [ ] **Step 4: Supervise (Opus)**: follow `supervise.md`; fix or redraft flagged items; review the sample; resolve every near-duplicate warning; `promote --all-checked`. Expected: `npm run validate` 0 errors; report shows 200 MCQs + 100 CQs reviewed, mix within ±5 points, no `⚠`.
- [ ] **Step 5: Site check**: `npm test && npm run build && npm run e2e`. Expected: all pass; the bank page for Physics loads with the full chapter.
- [ ] **Step 6: Record cost**: note the credits this chapter used in `docs/content-pipeline.md` (a "Cost log" table: chapter, questions, credits).
- [ ] **Step 7: PR** `content: SSC Physics ch 2 Motion (200 MCQ, 100 CQ)` with the report as its body. **Stop and report the real cost to Arefin** with a recommendation for chapter size for the rest of the budget.

### Task 8: Remaining pilot chapters

Repeat Task 7 for the next chapters in this order, at the size Arefin picks after the pilot: **03 Force, 04 Work Power Energy, 01 Physical Quantities, 05 State of Matter and Pressure**, then onward through the syllabus while credits last. One PR per chapter, each with its report and a cost-log line. If remaining credits will not cover a full chapter, stop and ask instead of shipping a partial one.

---

## Not in this plan

- Board questions 2015–2026 and the admission section (spec section 5). They reuse Tasks 3–5 with `source` set, but collection needs its own feasibility pilot and gets plan 3.
- Subjects other than SSC Physics.
