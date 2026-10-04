# SSC/HSC Science Question Bank

A free, bilingual (বাংলা / English) question bank for SSC and HSC science students: browse and filter questions with solutions, practise MCQs, take timed mock exams, build your own question sets and export them to PDF or Word.

- Design spec: `docs/superpowers/specs/2026-10-04-question-bank-design.md`
- Design system: `docs/superpowers/specs/2026-10-04-design-system.md`
- Website plan: `docs/superpowers/plans/2026-10-04-website.md`

## Local development

Needs Node 22.

```bash
npm ci
npm run dev          # local site at http://localhost:4321
npm test             # unit tests
npm run lint:design  # design rules (no gradients, glass, raw colours…)
npm run validate     # check content files
npm run build        # validate content, compile data, build the site into dist/
npm run e2e          # end-to-end tests and screenshots (after npm run build)
```

`npm run e2e` downloads its own browser via `npx playwright install chromium`. On a machine that already has Chromium, set `PW_CHROMIUM=/path/to/chrome` instead.

## Content

Questions live in `content/` as YAML, one folder per chapter:

```
content/
  syllabus/ssc/physics.yaml              chapters and topics
  ssc/physics/02-motion/mcq.yaml         MCQs (and অভিন্ন তথ্যভিত্তিক stimuli)
  ssc/physics/02-motion/cq.yaml          CQs with ক/খ/গ/ঘ parts
  ssc/physics/02-motion/figures/*.svg
  board/ssc/physics/dhaka-2023.yaml      a board paper: the ids of its questions
  admission/varsity/du-2023-ka.yaml      an admission paper
```

Every text field has `bn` and `en`; math goes between `$…$` as LaTeX. Only questions with `status: reviewed` are published (set `SHOW_DRAFTS=1` to also show `checked` ones). The JSON schemas in `schema/` and `npm run validate` enforce the format. Board and admission questions must carry a matching `source`.

## Deploying to Cloudflare Pages (free)

Connecting the repository needs the owner's Cloudflare account, so this is a one-time manual step:

1. Sign in at dash.cloudflare.com, then go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repository.
2. Use these build settings:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
3. Save and deploy. Every push to `main` then redeploys the site, and every pull request gets its own preview link.
