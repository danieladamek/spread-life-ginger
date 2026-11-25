# KICKOFF — instantiated from MI KICKOFF-TEMPLATE (frozen copy in docs/) on 2026-11-24 by the Actualizer Cowork project.
# Slots filled from content-pack/manifest.yaml. Sections 4a, 4b and 4c removed (single review, no claims.yaml, not critique, no conceptual lens).
# Unfilled slots remaining: none

# KICKOFF — Spread Life: Ginger — its history and lore, the health evidence, and the plant itself

You are building **Spread Life: Ginger Explorer**, a static web app that is an interactive textbook-and-journal deep dive on one body of scientific work. You are the build-and-delivery role; the scientific content has already been researched and sits in `content-pack/`.

**Content mode: `topic`.** Read `content-pack/manifest.yaml` first and confirm it matches.

- `manuscript` — the reader's body is `manuscript.md`, one published paper, **verbatim**.
- `topic` — the reader's body is `review.md`, a **commissioned review written by the builder** from a scoped literature sweep. `content-pack/scope.yaml` holds the scoping interview and the search strategy, and it is *published content*, not metadata: `/methods` renders it. The review's promise is traceability, so the citation rules in §1 are hard build gates, not warnings.
- `manuscript` with **`lenses: [conceptual]`** (CONTENT-PACK v0.11) — a manuscript app plus a **critical reading of its concepts**: `definitions.yaml` (the definitions atlas), `claims-audit.yaml` and `annotations.yaml`. Read APP-SPEC §1.4 and §2.2 and §4c below. The annotate-only rule and the broken-anchor rule of critique mode apply to this app too; the confidentiality rule does not.
- `critique` — the reader's body is `manuscript.md`, **an unpublished draft the author is still writing**, rendered verbatim, wrapped in a critical review of itself. The extra pack files are `claims-audit.yaml` (every claim of the draft, anchored by a verbatim quote), `annotations.yaml` (the critique), `artifacts.yaml` (the study's own files, as a citable provenance class) and `subgraphs.yaml`. **This app exists so its one reader can rewrite the draft himself. It must never contain replacement prose for the manuscript** — §1 makes that a hard gate. The draft is confidential.

This is a single-shot build: work through every section below, in order, without stopping for confirmation, and finish with the §6 ship step for this app's delivery mode and the scrum note.

## 0. Ground truth — read these first, in this order

1. `docs/APP-SPEC.md` — what the app must be. Normative. §6 (provenance) and §8 (acceptance) bind you.
2. `docs/DESIGN-SYSTEM.md` — stack, tokens, component classes, layout patterns, engineering bar. Copy the classes verbatim.
3. `docs/CONTENT-PACK.md` — the schema of what's in `content-pack/`.
4. `content-pack/manifest.yaml`, then skim the body (`manuscript.md`, or `review.md` + `scope.yaml` under `mode: topic`), `glossary.yaml`, `concepts/`, `figures.yaml`, `references.yaml`, `todo.yaml`.
   Under `mode: topic`, also read `docs/TOPIC-WORKFLOW.md` §T4 ("The rules that hold the review up") — it is what the pack was written against and what the app must not undermine.
   Under `mode: critique`, the body is `manuscript.md` and the extra files are `claims-audit.yaml`, `annotations.yaml`, `artifacts.yaml`, `subgraphs.yaml` and `scope.yaml`; also read `docs/CRITIQUE-WORKFLOW.md` in full — in particular "The rule that defines the mode" and "Study-internal facts" — plus APP-SPEC §1.3, §2.1, §4.1a, §4.2 and §6.2.
5. The contracts: `../../../CLAUDE.md` (vault) and `../../CLAUDE.md` (this team — nested-app rules). Your work queue for this run is this file. **This app is nested inside the `manuscript-interrogator` team**: your scrum note goes in *this folder's* `notes/Scrums/YYMMDD.md` with frontmatter `project: manuscript-interrogator` and `app: spread-life-ginger` (not the folder name); backlog items for this app live in `../../notes/Backlog/` with an `app: spread-life-ginger` key — set the K0 item there to `inreview` when done.

Reference implementation you may mine for patterns (do **not** copy its data): `../../../CountChocula/` — Bioactive Explorer, same stack and design system. Its `Layout.tsx`, `index.css`, `tailwind.config.js`, `lib/theme.tsx`, `pages/Glossary.tsx`, `pages/Sources.tsx`, `components/InfographicFrame.tsx`, `components/CompoundDrawer.tsx`, `scripts/build-data.py`, `tests/` and `.github/workflows/deploy.yml` are the closest kin to what you're building.

## 1. Hard rules

- **Never invent scientific content.** Definitions, summaries, explanations, data — all come from `content-pack/`. If something is missing, render an amber `TODO(author)` marker (`.bx-todo`) and list it on `/methods`. Do not fill gaps from your own knowledge.
- **Body text is rendered as written.** Structure it, link it, render its maths — never rewrite or paraphrase it. In `manuscript` mode it is someone else's paper; in `topic` mode it is the builder's reviewed prose. Neither is yours to edit.
- **`mode: topic` only — uncited prose fails the build.** Any block of ≥ 25 words in `review.md` with no `[n]` and no `<!-- framing -->` marker immediately before it is a content-build error (APP-SPEC §6.1). List it in `BUILD-ERRORS.md` and surface it on `/methods`. **Do not fix it by adding a citation** — inventing provenance is worse than shipping the error.
- **`mode: topic` only — `<!-- synthesis -->` blocks stay visible.** Render them with a quiet left rule and a "synthesis" label, give each an id, and link every one from `/methods`. Never strip the marker.
- **`mode: topic` only — nothing implies peer review.** `manifest.venue` says what it is; `as_of` appears on `/`, `/read` and `/about`.
- **`mode: critique` only — annotate only, and this is the gate that matters most.** Nowhere in the app — not an annotation, not a popover, not a tooltip, not a control, not a generated summary — is there text intended to go into the manuscript. `/review` has **no copy-to-manuscript affordance**. Annotations render in the margin and on `/review`, never inline in the body. If a pack field looks like it wants replacement prose, it is a pack error: stop, record it in `BUILD-ERRORS.md`, and do not render it.
- **`mode: critique` only — study-internal facts are labelled, never cited.** A value sourced from `artifacts.yaml` renders with the artifact's name and version and the label **"this study, unpublished"**. It never renders as `[n]` and never in any form a reader could take for a literature citation.
- **`mode: critique` only — a broken claim anchor fails loudly.** Each claim's `quote` must match exactly once inside its declared section of `manuscript.md`. Zero or multiple matches is a content-build error listed in `BUILD-ERRORS.md` and surfaced on `/methods`. **Do not re-point it** at a similar sentence; the claim needs re-auditing by the builder and silently re-anchoring would hide that.
- **`mode: critique` only — the draft is confidential.** Under `manifest.confidential: true` there is no Pages workflow, no public remote, and no draft text in any commit message, issue, README or anything else that leaves the machine.
- **No runtime fetches** of content. Everything ships in `dist/`.
- **Fail loudly in the content build.** Schema violation, unresolved `[n]`, unknown term/concept id, missing data file, ambiguous term variant → non-zero exit with a clear list. Do not "fix" the pack silently; if the pack is wrong, stop the content build, write the exact errors to `content-pack/BUILD-ERRORS.md`, and continue building the app with whatever validated (the errors also surface on `/methods`).
- **Delivery mode is `pages`** and it is not yours to change. Under `local`, nothing is pushed anywhere and no remote is created — see §6a. Under `pages`, the app ends up public — see §6b. If this slot is empty or ambiguous, treat it as `local`.
- **Self-check questions on the 101s are an addition, read from `manifest.concept_self_checks`.** Absent or `false` (the default): the concept files carry no `self_check`; render no questions, no heading for them and no empty state, and do not count or mention self-checks anywhere (APP-SPEC §2, v0.6). `true`: each 101 ends with its self-check, as in the earlier apps. Never invent questions.
- **GitHub identity:** `danieladamek`. Verify with `gh auth status` before any push. Under `delivery: local` there is no push, so this check does not apply.
- Vault contract: don't touch anything outside this folder except the K0 item's `state` in `../../notes/Backlog/`; leave a scrum note at `notes/Scrums/YYMMDD.md` in the exact format from `../../../CLAUDE.md` (with the `app:` key above).

## 2. Scaffold

Vite + React 18 + TypeScript (strict) + Tailwind 3, `react-router-dom` 6, `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`, `katex`, `recharts`, `d3` (only the sub-packages you use), `@floating-ui/react`, `zod`, `js-yaml`, `papaparse`; dev: `vitest`, `jsdom`, `@playwright/test`. Repo layout per DESIGN-SYSTEM §7. `BASE_PATH` support and `404.html` fallback as in Bioactive Explorer. `README.md` with quick start, the content-pack editing loop, and provenance notes.

## 3. Content build — `scripts/build-content.ts` (`npm run build:content`)

1. Load and validate every pack file against zod schemas that mirror `docs/CONTENT-PACK.md`.
2. Parse the body — `manuscript.md`, or `review.md` under `mode: topic` — into `sections[]` (id, title, depth, markdown), resolving `<!-- figure: id -->` markers into figure slots and `[n]` into citation tokens. Under `mode: topic`, also parse `<!-- framing -->` and `<!-- synthesis -->` block markers, run the citation-coverage check (§1), and load `scope.yaml` for `/methods`.
3. **Term linking:** build a matcher from `glossary[].term` + `variants` (whole word, case-insensitive, longest match wins, skip headings/code/math/links/existing terms). Wrap the first occurrence per section (`manifest.link_every_occurrence: true` → all). Emit per-term `appears_in` and per-section `terms`.
4. Load figure data (CSV/JSON) and validate the declared fields exist.
4a. **Under `mode: critique`**: load `claims-audit.yaml`, `annotations.yaml`, `artifacts.yaml` and `subgraphs.yaml`. Resolve every claim anchor by matching its `quote` inside its section (exactly once — §1), and emit the character offsets the reader uses to place its marginal markers **without modifying the body text**. Run the ≥ 25-word citation-coverage check over `annotations[].note` and over every concept body, and the level check over the four `## L1`–`## L4` sections. Resolve `supports`/`challenges`/`teaches`, `artifact_refs` and `track`/`method_status`. Load each subgraph's `data` and `golden` and emit them to `public/graph/`.
5. Emit `src/data/{manifest,sections,glossary,concepts,figures,references}.json` (plus `scope.json` under `mode: topic`; plus `claims.json`, `annotations.json`, `artifacts.json`, `subgraphs.json` and `scope.json` under `mode: critique`), `public/provenance.json` (counts: terms total/linked/unmatched, refs total/with-summary, figures by kind, todo count, ambiguous variants — and under `mode: topic`: blocks total/cited/framing/synthesis, refs by tier, unverified-but-cited, figures by `synthesis` kind, `as_of`), and copy `content-pack/figures/images/*` → `public/figures/`.
6. Idempotent: only rewrite outputs whose content changed; print a summary table at the end.

## 4. App — build every route in APP-SPEC §2

Implement, in this order so each step is testable: Layout + theme + header/footer → `/read` reader with section rail and `<Term>` popovers → citation fold-outs → the notepad, **ported from `../ptsd-inflammation-critique/` per APP-SPEC §3.1** (docked panel, drawer, `/notes`, section-ordered export/import, file autosave through `scripts/local-endpoints.ts`, `notes/` in `.git/info/exclude`) — then **extend it to the whole app per APP-SPEC §3.1 (v0.8)**: a `data-note-anchor` on every object every route renders (page fallback included), *Add note* on any text selection anywhere (popovers, fold-outs, cards, tables, `/methods`; mouse, `n`, touch), *Note this* / *Note this page*, return-and-highlight, per-page views. Build the capture layer once, at the Layout level, so every route added after it inherits it → `/glossary` → `/concepts`, `/concepts/:id` (render `concepts/*.md`, KaTeX, self-check quiz component — reuse Bioactive Explorer's tour quiz pattern) → `/figures`, `/figures/:id` (one component per `kind`; charts via Recharts with value tooltips, legend toggles, PNG/CSV download; `network`/`pathway` via d3-force SVG; `image` with hotspots; `table` sortable/filterable; ⓘ popovers from `explain[]`) → `/references` (under `mode: topic`: grouped by tier, sorted by year within tier, filterable, `why_it_mattered` on seminal cards, anchors marked) → `/methods` (provenance + TODO list + BUILD-ERRORS if any; under `mode: topic` this route also publishes the scope in *and* out, the interview, every query with hit counts, the corpus profile, and a link to every synthesis passage — APP-SPEC §2) → `/about` → `NotFound`. Wire ⌘K search over terms, concepts, figures, sections.

Palette for the paper's categories: `manifest.palette` → Tailwind `cat.*`. Header wordmark: **Spread Life: Ginger** *Explorer*. Under `mode: topic`, `/` and `/read` also carry the commissioned-review badge and the `as_of` date (2026-11-24).

## 5. Tests

- Vitest: pack schemas (a fixture pack with one deliberate error per rule must fail with the right message), term matcher (variants, boundaries, skip zones, longest match), section/citation parser, figure data field validation, notepad reducer.
- Playwright (serves `dist/` on :4173): every route 200 and renders its h1; open a term popover by keyboard and close with Esc; open a citation fold-out; notepad write → reload → persists → export downloads section-ordered `.md` → import reads it back; **type a full sentence into a new note in the drawer** (on a page other than `/read`, and on `/read` at 375 px) and assert the textarea holds all of it and still has focus; under `npm run preview`, a note lands in `notes/notepad.md`, and served without the endpoint the panel shows "Saved in this browser only — export to keep a copy."; **notes from anywhere:** on each route in APP-SPEC §2 (and every mode/lens route), select a phrase and add a note, then assert its quote, anchor kind and route; do the same inside a term popover and a citation fold-out, by keyboard (`n`) once, and by touch at 375 px once; follow a note back and assert the quote is highlighted; *Note this page* stores a page anchor; dark mode toggle persists; 375 px viewport for `/read` and one figure; one chart tooltip appears on hover.
**Under the conceptual lens, in addition:** every claim and atlas paper-entry anchor resolves exactly once (a drifted-quote fixture fails the build with the right message); `annotations.yaml` rejects an unknown key, including any field that could carry replacement prose; `/atlas` renders every construct, and each paper entry round-trips `/atlas` → `/read` → `/atlas`; builder-added references carry their label on `/references` and in reader fold-outs; a note anchored to an atlas entry survives a rebuild.

**Under `mode: critique`, in addition:** every claim anchor resolves to exactly one match (a fixture with a drifted quote must fail the content build with the right message); `annotations.yaml` rejects an unknown key; a ≥ 25-word note with no `refs`, no `artifact_refs` and no `framing` fails; **the in-browser analytics reproduce every subgraph's `golden` fixture** (this is the one test that catches a wrong Louvain, projection or null model — treat a drift as a failure, never as a tolerance to widen); BibTeX and RIS exports parse; no study-internal value renders as `[n]` (assert over `provenance.json`); the database panel is absent off localhost and writes nothing to storage; a note anchored to a claim survives a content rebuild.

- Lighthouse on `/read` and `/figures/fig-gastric`: Accessibility 100, Performance ≥ 90 (code-split KaTeX and chart libs per route if needed).

## 6. Ship — delivery mode: **pages**

Both modes do these three first:

1. `git init` (if needed), `.gitignore` (node_modules, dist, test-results, `scripts/.cache`), first commit.
2. Exclude `notes/`, `source/` and the `🚀` hub note via `.git/info/exclude` (vault precedent), and say so in the scrum note.
3. `npm run build` with **no `BASE_PATH`** (base `/`), then `npm run preview` — confirm http://localhost:4173/ serves the root, one deep link, and one figure asset. Stop the server before moving on. This is the same production bundle in both modes; a local build is not a lesser build.

**The app shortcut.** Daniel opens this app by double-clicking `../../App Shortcuts/▶ Open Spread Life Ginger.command`, which the Cowork project has already made. In this folder it runs `npm ci` when `node_modules` is missing, `npm run build` when `src`, `public` or `index.html` is newer than `dist/index.html`, and then `npm run preview -- --port 4202 --strictPort`. Keep those three commands working under those names with no extra arguments. It recognises a copy that is already running by the `<title>` of `dist/index.html`, so keep `<title>…</title>` on one line in `index.html`. Name the shortcut and http://localhost:4202/ in the README quick start. Do not create or edit the shortcut: it sits outside this folder.

**Zotero — when the hub note asks for it.** Open the app hub note in this folder (`🚀 *.md`). If its frontmatter says `zotero: yes`, run `python3 ../../tools/zotero_sync.py .` from this folder, once, after step 3. It reads only `content-pack/references.yaml`, looks DOIs up on Crossref, skips what Daniel's library already holds, and files the rest under *Manuscript Interrogator / <short title>* tagged `mi:<slug>`; it never deletes or edits an existing item, so running it is safe and running it twice is a no-op. It needs Daniel's key in `~/.config/manuscript-interrogator/zotero.env` and network access. If the key file is missing or the run fails, do not install, configure or retry anything — write the error into the scrum note as a **▶️ Next** item for Daniel with the exact command, and carry on with the build. Never pass `--all`, and never touch `tools/` or the other apps. When the hub says `zotero: no` or has no `zotero` key, skip this paragraph and say nothing about Zotero. (Daniel, 2026-11-08: the sync is the tail of the research phase; the build is the first thing that runs on his machine after it, so the build does it.)

Then run **only the branch matching `pages`**. The Cowork project normally leaves just that branch in this file; if both are here, run the one the slot names and say which in the scrum note.

### 6a. `delivery: local` — no remote, nothing public

- Do **not** run `gh repo create`, add a remote, push, or write `.github/workflows/deploy.yml`. The repo stays on Daniel's disk.
- Keep `BASE_PATH` support and the `404.html` fallback in the code (§2). They cost nothing here and are what makes promotion a one-liner later.
- `README.md` quick start is the local one: `npm install` → `npm run build:content` → `npm run dev` (http://localhost:5173) for editing, `npm run build && npm run preview` (http://localhost:4173) for the production bundle. Add the promotion recipe from §6b under a **"Publishing this later"** heading so no one has to re-derive it.
- If `permissions.text` is unknown, that is not a blocker here — but record it in the scrum note and on `/methods` as the thing that must be resolved before this app is ever published.
- The scrum note reports **no live URL**. It reports the commit SHA and the two local commands instead.

### 6b. `delivery: pages` — public repo and live site

1. `content-pack/manifest.yaml` must have a real, non-empty `permissions.text`. If it is empty or reads "unknown", **stop and say so** — a local build is fine without it, a public one is not. Under `mode: topic` it must also state the quotation rule (≤ 25 words, attributed); a topic app that reproduces long passages of someone else's text does not go public.
2. `gh auth status` must show `danieladamek`. If it doesn't, stop; never push to another account.
3. `gh repo create danieladamek/spread-life-ginger --public --source . --push`.
4. `.github/workflows/deploy.yml`: `npm ci → npm test → npm run build:content → npm run build` (with `BASE_PATH=/spread-life-ginger/`) → copy `dist/index.html` → `dist/404.html` → `actions/deploy-pages`. Enable Pages with `build_type: workflow` via `gh api`. Verify the live root, one deep link, and a figure asset.

**Promoting a local app to Pages later** — run steps 1–4 above in the app folder, nothing else. No source change is needed; `BASE_PATH` and `404.html` are already wired, and the git history is already there.

### 6c. `delivery: private` — private repo, nothing public

The critique-mode default. Confidential work with a backup and a history, and no published surface.

1. `manifest.confidential` must be `true` (the validator will already have refused `pages`). If it is not, stop and ask.
2. `gh auth status` must show `danieladamek`. If it doesn't, stop; never push to another account.
3. `gh repo create danieladamek/spread-life-ginger --private --source . --push`.
4. **Do not** write `.github/workflows/deploy.yml`, do not enable Pages, and do not add any other remote. Keep `BASE_PATH` support and `404.html` in the code — they cost nothing and are not a publishing step.
5. Nothing about the draft goes into a commit message, an issue, a PR body or a README beyond its title and slug.
6. `README.md` quick start is the local one (as §6a), with **no** "Publishing this later" section — this app does not get published.
7. The scrum note reports the private repo, the commit SHA and the two local commands. **No live URL, because there is none.**

## 7. Report

Write `notes/Scrums/YYMMDD.md` (format from `../../../CLAUDE.md`, `project: manuscript-interrogator`, `app: spread-life-ginger`): what landed, the live URL, the provenance counts, the Zotero result when the hub asked for it (added · linked · failed, or the error and the command for Daniel), every `TODO(author)` and build error, and what you'd pick up next. Then walk APP-SPEC §8 and append a checked/unchecked copy of it under **✅ Done**. Anything unchecked is a **▶️ Next** item, not a blocker, unless it needs Daniel.

## 8. This app — additions and overrides (Actualizer, 2026-11-24)

These bind in addition to everything above. Where they conflict with the text above, these win.

1. **Mode is `topic`.** Wherever a passage above is conditional on mode, the `topic` branch applies and the `manuscript` and `critique` branches do not. The reader's body is `content-pack/review.md`. The three topic gates bind: uncited prose fails the build, `<!-- synthesis -->` markers stay visible, nothing implies peer review.
2. **Where this app lives.** This folder is `actualizer/apps/spread-life-ginger/`, not under `manuscript-interrogator/apps/`. The frozen specs are in `docs/` here; read those copies. The launcher folder is `manuscript-interrogator/App Shortcuts/` (three levels up, then across); do not create or edit the launcher, the RTE does. Port **4202** is provisional until the RTE registers it.
3. **Verification level is part of the content.** Every reference in `references.yaml` carries `verified_level` (abstract, abstract fragment, record page). No full text was read. `/methods` must state this in plain words near the top, list the count at each level, and render `todo.yaml` in full. The reader shows the level on each reference card.
4. **Safety profile `health`.** No dosing and no health advice anywhere in the interface. Doses in the review are the test article of a study and must not be restyled as recommendations (no call-outs, badges or "how much to take" affordances). A persistent, quiet notice on `/read` and `/recipes`: this is a literature review for education, not medical advice. Section 10 (safety) is linked from every health section.
5. **Recipes surface — new, not in APP-SPEC.** Build `/recipes` (index) and `/recipes/:id` from `content-pack/recipes.yaml`. Each recipe shows: title, kind (culinary or medicinal), date and place, the source with its reference card, the original text where `original_text` is present (set as a quotation in its original language), the gloss with `gloss_by`, the ingredient list, the form of ginger and whether it is heated, the science note with working `[n]` citations, the safety note, and links to the listed review sections and glossary terms. Medicinal recipes carry a visible "historical document, not advice" label. No servings, quantities, timings or method steps are to be invented. Add `/recipes` to the main navigation and link to it from sections 6 and 15. Tests: every `links.sections` id resolves; every `[n]` in a recipe resolves; a medicinal recipe renders its label.
6. **Look.** Follow `source/brand/BRAND-REFERENCE.md` for colour and style in place of the default theme: cream ground, sage second surface, cornflower blue primary, deep blue for links and headings, butter yellow accent, olive and grey-green support; painted botanical feel; arcs and the half-dome as recurring shapes. The palette values there are estimates: keep them in one tokens file so they can be swapped. Check contrast on every text pairing. Draw an original ginger motif (rhizome, leafy shoot, flower spike). **Do not reproduce, trace or embed the Spread Life logo, the UAH mark or the reference photo**, and do not copy `source/` into the repo.
7. **Name.** The wordmark is "Spread Life: Ginger" in the app's own lettering. Daniel confirmed on 2026-11-24 that the "Spread Life" name may be used for this app. That covers the name only: the logo artwork and the UAH mark are still not to be reproduced (item 6).
8. **Self-checks are off** (`concept_self_checks: false`). **Zotero: no.**
9. **Do not add facts.** `content-pack/` is the only source of content. Gaps become `TODO(author)` markers surfaced on `/methods`.
