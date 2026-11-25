# Spread Life: Ginger Explorer

A static web app around one commissioned review: **ginger (*Zingiber officinale*) read three ways at once — its
history and lore, the human health evidence, and the plant itself** — with a glossary, 101 primers, synthesised
figures, historical recipes set beside the science, and a notepad. Written as a reference for the UAH Greenhouse
team. **Commissioned review — not peer reviewed. Current as of 24 November 2026. A literature review for education,
not medical advice.**

Live: <https://danieladamek.github.io/spread-life-ginger/>

## Quick start

On Daniel's machine, double-click **`▶ Open Spread Life Ginger.command`** in `manuscript-interrogator/App Shortcuts/`.
It runs `npm ci` if `node_modules` is missing, `npm run build` if the source is newer than `dist/`, then
`npm run preview -- --port 4202 --strictPort`, and opens <http://localhost:4202/>.

By hand:

```bash
npm install
npm run build:content     # validate content-pack/ and regenerate src/data/*.json + public/provenance.json
npm run dev               # http://localhost:5173 — for editing
npm run build && npm run preview   # http://localhost:4173 — the production bundle
npm test                  # Vitest: pack schemas, term linker, parser, figure data, notepad, shipped content
npm run test:e2e          # Playwright against dist/ on :4173
```

## Editing the content pack

`content-pack/` is the only source of content. Nothing scientific is written in the app.

1. Edit the pack (`review.md`, `glossary.yaml`, `references.yaml`, `figures.yaml`, `concepts/*.md`, `recipes.yaml`,
   `scope.yaml`, `todo.yaml`). Optionally check it with `python3 tools/validate_pack.py content-pack`.
2. `npm run build:content`. It validates every file against zod schemas that mirror `docs/CONTENT-PACK.md`,
   parses `review.md` into sections, links glossary terms and `[n]` citations, runs the citation-coverage gate,
   resolves recipe links, and prints a summary table. It only rewrites outputs that changed.
3. If the pack is wrong the build exits non-zero, writes `content-pack/BUILD-ERRORS.md`, and still emits what
   validated; the errors appear on `/methods`. Fix the pack, never the build.
4. `npm run build`, then commit `src/data/` and `public/provenance.json` with the pack change.

## Provenance (topic mode)

- **The review is rendered as written.** The build only adds link syntax around its characters (a unit test strips
  the links and compares every block with `review.md`).
- **Uncited prose fails the build.** Any block of ≥ 25 words in `review.md` with no `[n]` and no `<!-- framing -->`
  marker is an error. It is never repaired by adding a citation. Current state: 87 blocks, 0 uncited.
- **Synthesis stays visible.** Each `<!-- synthesis -->` block renders with a quiet left rule and the label
  *synthesis*; the sentence the marker closes is underlined and has a stable id; `/methods` links every one (14).
- **How far the sources were read.** No full text was read: every reference was read at abstract, abstract-fragment
  or record-page level. `/methods` says so at the top and counts each level; every reference card shows its level.
- **Figures are synthesised**, never reproduced: each data row carries the reference it came from, and each figure
  page names its references.
- **Health profile.** No doses or advice in the interface; a dose appears only inside the review's text as a study's
  test article. Section 10 (safety) is linked from every health section; medicinal recipes are labelled
  *historical document, not advice*.
- `public/provenance.json` holds the counts (terms, references by tier and by verified level, blocks, synthesis,
  figures, recipes, TODOs).

## Look

Colours follow the UAH Greenhouse "Spread Life" style (cream, sage, cornflower and deep blue, butter, olive). All
brand values live in **`src/styles/tokens.css`** — estimates from a photo, to be swapped for values sampled from the
original artwork; contrast is checked there. The ginger drawing is the app's own; the Spread Life logo and the UAH
mark are not reproduced.

## Stack

Vite 5 · React 18 · TypeScript (strict) · Tailwind 3 · react-router 6 · react-markdown + remark-gfm (+ remark-math /
rehype-katex, loaded only where there is maths) · Recharts (charts, code-split per route) · @floating-ui/react ·
zod · js-yaml · papaparse · Vitest · Playwright. No d3 sub-package is used: the pack has no network or pathway
figures. The notepad is ported from `ptsd-inflammation-critique` via `traumatic-stress-concepts` (APP-SPEC §3.1):
localStorage per slug, plus an autosave to `notes/notepad.md` that exists only under `npm run dev` / `npm run
preview` on localhost. `notes/` is excluded from git.

`BASE_PATH` sets Vite's `base` for GitHub Pages; `dist/404.html` is a copy of `index.html` for deep links.
