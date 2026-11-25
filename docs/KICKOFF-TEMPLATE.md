---
type: spec
project: manuscript-interrogator
version: 0.11
---

# KICKOFF-TEMPLATE — the single-shot prompt for Claude Code

**Version 0.7 · 2026-10-02.** Serves all three intake modes — `manuscript` (a paper Daniel hands over), `topic` (a commissioned review the builder wrote from a scoped sweep) and `critique` (an unpublished draft of Daniel's, wrapped in a critical review of itself). The Cowork project copies everything between the `═══` rules into `KICKOFF.md` at the root of the new app repo, fills the `{{…}}` slots, and hands Daniel the one-line launch command. Text outside the rules is guidance for the Cowork project, not part of the prompt.

**Launch (Daniel, terminal, in the new empty repo folder):**

```bash
cd ~/Allofit/Projects/manuscript-interrogator/apps/{{slug}} && claude "Read KICKOFF.md and do exactly what it says."
```

(Equivalent: open `manuscript-interrogator/apps/{{slug}}` in the Claude desktop app's Code mode, local environment, and paste the same sentence.)

Prerequisites the Cowork project checks before handing over: `{{mode}}` is set from `manifest.mode` and the mode-conditional passages below are resolved (keep the matching one, delete the other); `apps/{{slug}}/content-pack/` is complete (CONTENT-PACK definition of done, including the topic-mode additions when `{{mode}}` is `topic`) and `python3 ../../tools/validate_pack.py content-pack` passes; `docs/APP-SPEC.md`, `docs/DESIGN-SYSTEM.md`, `docs/CONTENT-PACK.md` (plus `docs/TOPIC-WORKFLOW.md` when `{{mode}}` is `topic`) are copied into `apps/{{slug}}/docs/` (frozen at the builder version); the app hub `🚀 <Short title> Explorer.md` and `notes/Scrums/` exist in the app folder; `manifest.delivery` is set (`local` or `pages`) from Daniel's intake answer, and **only under `delivery: pages`**, `gh auth status` shows `{{github_account}}`; the app shortcut has been made in `App Shortcuts/` and its port reserved (BUILDER-WORKFLOW Phase 5), which fills `{{port}}` and `{{shortcut}}`. Instantiate §6 by keeping only the branch that matches `{{delivery}}` and deleting the other.

═══════════════════════════════════════════════════════════════

# KICKOFF — {{title}}

You are building **{{short_title}} Explorer**, a static web app that is an interactive textbook-and-journal deep dive on one body of scientific work. You are the build-and-delivery role; the scientific content has already been researched and sits in `content-pack/`.

**Content mode: `{{mode}}`.** Read `content-pack/manifest.yaml` first and confirm it matches.

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
5. The contracts: `../../../CLAUDE.md` (vault) and `../../CLAUDE.md` (this team — nested-app rules). Your work queue for this run is this file. **This app is nested inside the `manuscript-interrogator` team**: your scrum note goes in *this folder's* `notes/Scrums/YYMMDD.md` with frontmatter `project: manuscript-interrogator` and `app: {{slug}}` (not the folder name); backlog items for this app live in `../../notes/Backlog/` with an `app: {{slug}}` key — set the K0 item there to `inreview` when done.

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
- **Delivery mode is `{{delivery}}`** and it is not yours to change. Under `local`, nothing is pushed anywhere and no remote is created — see §6a. Under `pages`, the app ends up public — see §6b. If this slot is empty or ambiguous, treat it as `local`.
- **Self-check questions on the 101s are an addition, read from `manifest.concept_self_checks`.** Absent or `false` (the default): the concept files carry no `self_check`; render no questions, no heading for them and no empty state, and do not count or mention self-checks anywhere (APP-SPEC §2, v0.6). `true`: each 101 ends with its self-check, as in the earlier apps. Never invent questions.
- **GitHub identity:** `{{github_account}}`. Verify with `gh auth status` before any push. Under `delivery: local` there is no push, so this check does not apply.
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

Palette for the paper's categories: `manifest.palette` → Tailwind `cat.*`. Header wordmark: **{{short_title}}** *Explorer*. Under `mode: topic`, `/` and `/read` also carry the commissioned-review badge and the `as_of` date ({{as_of}}).

## 4a. Volume apps and the graph lab — only when the pack has `volumes:` and/or `claims.yaml`

This run is volume **{{volume}}** ({{volume_title}}). {{volume_run}}

- **Content build.** Read `manifest.volumes`; parse every `status: ready` volume's `volumes/<id>/review.md` with the same rules as `review.md` (section ids already carry the volume prefix — reject any that don't). Emit `sections.json` grouped by volume, `volumes.json` (id, title, status, word count, `as_of`), and per-volume topic provenance counts. Validate `claims.yaml` against its own `vocabulary` and against the references, glossary and sections (CONTENT-PACK v0.4 §claims). Emit `src/data/claims.json` and generate `public/graph/claims.cypher`, `nodes.csv`, `edges.csv`, `claims.graphml` and `claims.json` from it — deterministic output, so a rebuild with no pack change leaves them byte-identical.
- **Routes.** `/read` is the volume index and `/read/:volume` the reader (APP-SPEC §1.2). Keep the old `/read#section` links working by redirecting to the owning volume. `/concepts/:id` gets the L1–L4 switch when `manifest.concept_levels` is true. `/graph` implements APP-SPEC §4.1 exactly: claims-only canvas, filters and presets, contested/inferred styling, client-side analytics, exports, and the reader-opened Neo4j panel (`neo4j-driver`, in-memory credentials, test/load/read-only actions, download fallback). Code-split `/graph` and the driver so `/read` stays under the Lighthouse bar.
- **Tests (in addition to §5).** Volume index and every ready volume render; a note written in V0 survives a content rebuild that adds a fixture volume; claims schema fixture fails on each rule; analytics give known answers on a 10-node fixture (PageRank ordering, a shortest path, component count); the Cypher export parses (and loads, if `NEO4J_TEST_URL` is set); Playwright opens the Neo4j panel, confirms nothing is written to `localStorage`/`sessionStorage`/cookies, and that no write-query control exists.
- **Later volumes.** Do not rescaffold. Pull, add the volume's content, re-run the content build and the full test suite, check that no existing section id, term id, concept id, figure id, claim id or reference number changed (fail if one did), then ship per §6.

## 4b. Critique surfaces — only when `{{mode}}` is `critique`

Build these after §4's shared machinery, in this order. APP-SPEC §2.1 is the normative text; this is the build order.

1. **`/read` claim layer.** Marginal claim markers placed from the build's character offsets — the body text itself is untouched. Clicking one opens the claim card (status, the draft's own citations, its annotations, links to `/review` and to the units that teach it). A status filter dims the sentences that do not match. Margin annotations collapse to a per-paragraph count below 1280 px.
2. **`/review`.** Grouped by section and by claim (switchable), filtered by status, kind, severity and area, every entry deep-linking into `/read`. **No copy-to-manuscript control.**
3. **`/library`** — `/references` renamed, `/references` redirecting, `#ref-n` anchors preserved. Tier groups, area filter, `supports`/`challenges`/`teaches` as links, **BibTeX and RIS export** of the corpus and of any filtered view.
4. **`/learn`** — `/concepts` renamed, `/concepts/:id` still canonical. Track grouping, the L1–L4 switch (default L1, persisted), `method_status` badges, equation walkthroughs, and the small demos the pack's concepts call for.
5. **`/graph`** — APP-SPEC §4.1a: the subgraph picker, node cards carrying the study's identifiers, the client-side analytics with resolution and damping controls, and the exports. **The localhost-only database panel** (hidden off localhost; credentials in memory only; read queries only). Code-split this route and the driver.
6. **`/figures`** — APP-SPEC §4.2: SVG, PDF, data, GraphML/Cypher where applicable, and the reproducible script, with the provenance and "this study, unpublished" labelling.
7. **`/notes`** — already there from §4 (APP-SPEC §3.1); add the **claim-id** and **curriculum-unit** anchors.
8. **`/methods`** — the artifact inventory with versions and exclusions, every study-internal fact, the known-corrections record with `open` first, the audit coverage counts, the per-area corpus profile, every query, and every synthesis-marked annotation.

**Notepad persistence** is APP-SPEC §3.1 and the same in every mode: `localStorage` always, plus the file autosave when `manifest.notes_storage` is `file` (the default). The endpoint exists **only** under `npm run dev` / `npm run preview` on localhost — never in a built bundle served anywhere else.

## 4c. Conceptual-lens surfaces — only when `manifest.lenses` includes `conceptual`

Port the claim layer, the claim card and `/review` from `../ptsd-inflammation-critique/` rather than building them; they are the same components over the same schemas. APP-SPEC §2.2 is the normative text; this is the build order.

1. **Content build.** In `build-content.ts`, load `definitions.yaml`, `claims-audit.yaml` and `annotations.yaml`. Resolve every claim anchor **and every atlas paper-entry anchor** by quote, exactly once, emitting character offsets without touching the body (a miss is a build error, never a re-point). Emit `definitions.json`, `claims.json`, `annotations.json`. Enforce the closed annotation schema (an unknown key fails the build) and the ≥ 25-word evidence rule on notes.
2. **`/read`** — the critique claim layer, plus a second, visually distinct marker on atlas paper-entry sentences that opens the construct's atlas row with the sentence highlighted. Filters by claim status and annotation kind.
3. **`/atlas` and `/atlas/:construct`** — the register × source grid, the register legend with glosses, register and referent chips coloured from `manifest.palette.registers`, quoted text in quotation marks and paraphrase marked as such, reference fold-outs, a link into `/read` from every paper entry, a timeline toggle by `year`, and per-entry annotation counts linking to `/review`.
4. **`/review`** — as critique mode's, with the kind filter grouped (conceptual kinds, then citation kinds, each with its one-line meaning) and a construct filter. **No control produces text for the paper.**
5. **`/references`** — builder-added references (`added: true`) grouped after the paper's own list and labelled "added by the builder"; `check:` rendered on the card as "What the source says", amber.
6. **`/methods`** — the lens, its vocabularies, the sourcing rules, the audit coverage counts and the list of added references.
7. **Notepad** — add claim-id and atlas-entry anchors.

If `claims-audit.yaml` or `annotations.yaml` is absent (the pack was dispatched before its audit stage), build `/atlas` and the rest, render `/review` with an honest empty state ("The conceptual audit has not been written yet"), and say so in the scrum note.

## 5. Tests

- Vitest: pack schemas (a fixture pack with one deliberate error per rule must fail with the right message), term matcher (variants, boundaries, skip zones, longest match), section/citation parser, figure data field validation, notepad reducer.
- Playwright (serves `dist/` on :4173): every route 200 and renders its h1; open a term popover by keyboard and close with Esc; open a citation fold-out; notepad write → reload → persists → export downloads section-ordered `.md` → import reads it back; **type a full sentence into a new note in the drawer** (on a page other than `/read`, and on `/read` at 375 px) and assert the textarea holds all of it and still has focus; under `npm run preview`, a note lands in `notes/notepad.md`, and served without the endpoint the panel shows "Saved in this browser only — export to keep a copy."; **notes from anywhere:** on each route in APP-SPEC §2 (and every mode/lens route), select a phrase and add a note, then assert its quote, anchor kind and route; do the same inside a term popover and a citation fold-out, by keyboard (`n`) once, and by touch at 375 px once; follow a note back and assert the quote is highlighted; *Note this page* stores a page anchor; dark mode toggle persists; 375 px viewport for `/read` and one figure; one chart tooltip appears on hover.
**Under the conceptual lens, in addition:** every claim and atlas paper-entry anchor resolves exactly once (a drifted-quote fixture fails the build with the right message); `annotations.yaml` rejects an unknown key, including any field that could carry replacement prose; `/atlas` renders every construct, and each paper entry round-trips `/atlas` → `/read` → `/atlas`; builder-added references carry their label on `/references` and in reader fold-outs; a note anchored to an atlas entry survives a rebuild.

**Under `mode: critique`, in addition:** every claim anchor resolves to exactly one match (a fixture with a drifted quote must fail the content build with the right message); `annotations.yaml` rejects an unknown key; a ≥ 25-word note with no `refs`, no `artifact_refs` and no `framing` fails; **the in-browser analytics reproduce every subgraph's `golden` fixture** (this is the one test that catches a wrong Louvain, projection or null model — treat a drift as a failure, never as a tolerance to widen); BibTeX and RIS exports parse; no study-internal value renders as `[n]` (assert over `provenance.json`); the database panel is absent off localhost and writes nothing to storage; a note anchored to a claim survives a content rebuild.

- Lighthouse on `/read` and `/figures/{{first_figure_id}}`: Accessibility 100, Performance ≥ 90 (code-split KaTeX and chart libs per route if needed).

## 6. Ship — delivery mode: **{{delivery}}**

Both modes do these three first:

1. `git init` (if needed), `.gitignore` (node_modules, dist, test-results, `scripts/.cache`), first commit.
2. Exclude `notes/`, `source/` and the `🚀` hub note via `.git/info/exclude` (vault precedent), and say so in the scrum note.
3. `npm run build` with **no `BASE_PATH`** (base `/`), then `npm run preview` — confirm http://localhost:4173/ serves the root, one deep link, and one figure asset. Stop the server before moving on. This is the same production bundle in both modes; a local build is not a lesser build.

**The app shortcut.** Daniel opens this app by double-clicking `../../App Shortcuts/{{shortcut}}`, which the Cowork project has already made. In this folder it runs `npm ci` when `node_modules` is missing, `npm run build` when `src`, `public` or `index.html` is newer than `dist/index.html`, and then `npm run preview -- --port {{port}} --strictPort`. Keep those three commands working under those names with no extra arguments. It recognises a copy that is already running by the `<title>` of `dist/index.html`, so keep `<title>…</title>` on one line in `index.html`. Name the shortcut and http://localhost:{{port}}/ in the README quick start. Do not create or edit the shortcut: it sits outside this folder.

**Zotero — when the hub note asks for it.** Open the app hub note in this folder (`🚀 *.md`). If its frontmatter says `zotero: yes`, run `python3 ../../tools/zotero_sync.py .` from this folder, once, after step 3. It reads only `content-pack/references.yaml`, looks DOIs up on Crossref, skips what Daniel's library already holds, and files the rest under *Manuscript Interrogator / <short title>* tagged `mi:<slug>`; it never deletes or edits an existing item, so running it is safe and running it twice is a no-op. It needs Daniel's key in `~/.config/manuscript-interrogator/zotero.env` and network access. If the key file is missing or the run fails, do not install, configure or retry anything — write the error into the scrum note as a **▶️ Next** item for Daniel with the exact command, and carry on with the build. Never pass `--all`, and never touch `tools/` or the other apps. When the hub says `zotero: no` or has no `zotero` key, skip this paragraph and say nothing about Zotero. (Daniel, 2026-11-08: the sync is the tail of the research phase; the build is the first thing that runs on his machine after it, so the build does it.)

Then run **only the branch matching `{{delivery}}`**. The Cowork project normally leaves just that branch in this file; if both are here, run the one the slot names and say which in the scrum note.

### 6a. `delivery: local` — no remote, nothing public

- Do **not** run `gh repo create`, add a remote, push, or write `.github/workflows/deploy.yml`. The repo stays on Daniel's disk.
- Keep `BASE_PATH` support and the `404.html` fallback in the code (§2). They cost nothing here and are what makes promotion a one-liner later.
- `README.md` quick start is the local one: `npm install` → `npm run build:content` → `npm run dev` (http://localhost:5173) for editing, `npm run build && npm run preview` (http://localhost:4173) for the production bundle. Add the promotion recipe from §6b under a **"Publishing this later"** heading so no one has to re-derive it.
- If `permissions.text` is unknown, that is not a blocker here — but record it in the scrum note and on `/methods` as the thing that must be resolved before this app is ever published.
- The scrum note reports **no live URL**. It reports the commit SHA and the two local commands instead.

### 6b. `delivery: pages` — public repo and live site

1. `content-pack/manifest.yaml` must have a real, non-empty `permissions.text`. If it is empty or reads "unknown", **stop and say so** — a local build is fine without it, a public one is not. Under `mode: topic` it must also state the quotation rule (≤ 25 words, attributed); a topic app that reproduces long passages of someone else's text does not go public.
2. `gh auth status` must show `{{github_account}}`. If it doesn't, stop; never push to another account.
3. `gh repo create {{github_account}}/{{slug}} --public --source . --push`.
4. `.github/workflows/deploy.yml`: `npm ci → npm test → npm run build:content → npm run build` (with `BASE_PATH=/{{slug}}/`) → copy `dist/index.html` → `dist/404.html` → `actions/deploy-pages`. Enable Pages with `build_type: workflow` via `gh api`. Verify the live root, one deep link, and a figure asset.

**Promoting a local app to Pages later** — run steps 1–4 above in the app folder, nothing else. No source change is needed; `BASE_PATH` and `404.html` are already wired, and the git history is already there.

### 6c. `delivery: private` — private repo, nothing public

The critique-mode default. Confidential work with a backup and a history, and no published surface.

1. `manifest.confidential` must be `true` (the validator will already have refused `pages`). If it is not, stop and ask.
2. `gh auth status` must show `{{github_account}}`. If it doesn't, stop; never push to another account.
3. `gh repo create {{github_account}}/{{slug}} --private --source . --push`.
4. **Do not** write `.github/workflows/deploy.yml`, do not enable Pages, and do not add any other remote. Keep `BASE_PATH` support and `404.html` in the code — they cost nothing and are not a publishing step.
5. Nothing about the draft goes into a commit message, an issue, a PR body or a README beyond its title and slug.
6. `README.md` quick start is the local one (as §6a), with **no** "Publishing this later" section — this app does not get published.
7. The scrum note reports the private repo, the commit SHA and the two local commands. **No live URL, because there is none.**

## 7. Report

Write `notes/Scrums/YYMMDD.md` (format from `../../../CLAUDE.md`, `project: manuscript-interrogator`, `app: {{slug}}`): what landed, the live URL, the provenance counts, the Zotero result when the hub asked for it (added · linked · failed, or the error and the command for Daniel), every `TODO(author)` and build error, and what you'd pick up next. Then walk APP-SPEC §8 and append a checked/unchecked copy of it under **✅ Done**. Anything unchecked is a **▶️ Next** item, not a blocker, unless it needs Daniel.

═══════════════════════════════════════════════════════════════

## Slot reference

| Slot | Source |
|---|---|
| `{{title}}`, `{{short_title}}`, `{{slug}}`, `{{github_account}}` | `content-pack/manifest.yaml` |
| `{{first_figure_id}}` | first `chart`-kind id in `figures.yaml` (fallback: first figure) |
| `{{delivery}}` | `content-pack/manifest.yaml` → `delivery:` (`local` \| `pages` \| `private`), from Daniel's intake answer. Empty ⇒ `local`. `private` is critique mode's default and the only remote a `confidential: true` pack may have. |
| `{{mode}}` | `content-pack/manifest.yaml` → `mode:` (`manuscript` \| `topic` \| `critique`). Empty ⇒ `manuscript`. Decides which mode-conditional passages survive instantiation. |
| `{{phase}}`, `{{phase_run}}` | critique mode: `manifest.phase` (`v1` \| `v2` \| `v3`) and either "This is the first phase: build the whole app." or "The app already exists: extend it in place — no rescaffold, and no existing claim, annotation, section, concept, figure or reference id may change." |
| `{{volume}}`, `{{volume_title}}` | the `manifest.volumes` entry this KICKOFF ships. Delete §4a entirely for a single-review pack with no `claims.yaml`. |
| `{{volume_run}}` | "This is the first volume: build the whole app." — or — "The app already exists: extend it (last bullet of this section)." |
| `{{as_of}}` | `content-pack/manifest.yaml` → `as_of:` (topic mode only — the date the sweep closed). |
| `{{port}}`, `{{shortcut}}` | the app's own port (its row in `tools/app-ports.tsv`) and the launcher's file name, `▶ Open <Short title> Explorer.command`, as printed by `tools/make_shortcut.py` in Phase 5. |

## Versioning

The template version is stamped into `manifest.builder.version`. When a pilot review changes APP-SPEC, DESIGN-SYSTEM or this template, bump all three together (v0.2 …) and note the change in this file's history below.

## History

- v0.11 (2026-11-08) — **Zotero in the ship step.** §6 runs `tools/zotero_sync.py` for the app when its hub note says `zotero: yes`, reports the counts in the scrum note (§7), and leaves a ▶️ Next for Daniel if the key is missing or the run fails. Pairs with BUILDER-WORKFLOW v0.7. Raised by Convergence Explorer (`apps/disease-process-convergence`), the first pack synced by hand.

- v0.4 (2026-09-15) — **volume apps and the graph lab.** New §4a (volume content build, `/read/:volume`, L1–L4 switch, `/graph` with exports and the reader-opened Neo4j panel, extra tests, the extend-don't-rescaffold rule for later volumes) and `{{volume}}`/`{{volume_title}}`/`{{volume_run}}` slots. Pairs with APP-SPEC v0.3, CONTENT-PACK v0.4, TOPIC-WORKFLOW v0.2. Nothing changes for single-review packs.

- v0.1 (2026-09-14) — first draft, derived from the Bioactive Explorer kickoff pattern (data file → validating build script → static app → tests → Pages). **Pilot run (Thyroid Markers Explorer) succeeded single-shot: all §8 items checked, Lighthouse 100/92.**
- v0.1.1 (2026-09-14) — apps now live at `manuscript-interrogator/apps/<slug>/`; relative paths, scrum frontmatter (`project: manuscript-interrogator` + `app:`), single builder backlog. Launch line updated. No change to the build instructions.
- v0.3 (2026-09-14) — **topic mode.** New `{{mode}}` and `{{as_of}}` slots; §0 reads `review.md` + `scope.yaml`; §1 adds three hard gates (uncited prose fails the build, synthesis markers stay visible, nothing implies peer review); §3 parses block markers and emits `scope.json` + topic provenance counts; §4 gains tiered references and the expanded `/methods`; §6b adds the quotation rule to the public-build gate. Pairs with APP-SPEC v0.2, CONTENT-PACK v0.3, DESIGN-SYSTEM v0.2 (§3.1 topic components) and TOPIC-WORKFLOW v0.1. Manuscript-mode instructions unchanged.
- v0.2 (2026-09-14) — **delivery modes.** §6 branches on the new `{{delivery}}` slot: `local` (git init, no remote, no Pages workflow — the app is viewed with `npm run dev` / `npm run preview`) or `pages` (the v0.1 path). Both build and test the production bundle identically. Default is `local`; the question is asked at intake (BUILDER-WORKFLOW v0.2 Phase 0). `permissions.text` is a hard gate only under `pages`. APP-SPEC and DESIGN-SYSTEM unchanged at v0.1.

- v0.5 (2026-09-20) — **critique mode.** `{{mode}}: critique` throughout; four new §1 hard gates (annotate only with no copy-to-manuscript affordance, study-internal facts labelled and never cited, a broken claim anchor as a loud build error rather than a repair, and confidentiality); §3 step 4a for the claim-anchor resolution, the annotation and concept citation-coverage checks and the subgraph exports; new **§4b** with the build order for `/read`'s claim layer, `/review`, `/library`, `/learn`, `/graph`, `/figures`, `/notes` and `/methods`, plus the optional file-backed notepad; §5 critique tests led by the **golden-fixture analytics gate**; new **§6c `delivery: private`**; `{{phase}}`/`{{phase_run}}` slots. Pairs with APP-SPEC v0.4, CONTENT-PACK v0.8, CRITIQUE-WORKFLOW v0.1, BUILDER-WORKFLOW v0.4. Manuscript- and topic-mode instructions unchanged.
- v0.7 (2026-10-02) — **the app shortcut.** Every app has a double-click launcher in `App Shortcuts/`, made by the Cowork project in BUILDER-WORKFLOW v0.5 Phase 5. New `{{port}}` and `{{shortcut}}` slots; §6 tells Claude Code which three npm commands the launcher depends on and to name it in the README, and that the file is not its to edit. Build instructions otherwise unchanged.
- v0.6 (2026-09-21) — **one notepad everywhere.** §4 ports the notepad from `../ptsd-inflammation-critique/` per APP-SPEC §3.1 in every mode; §4b's `/notes` step only adds claim and unit anchors; the persistence paragraph applies to all modes with `file` as the default; §5 adds the drawer-typing focus test, the import round-trip and the file-autosave check. Pairs with APP-SPEC v0.5 and CONTENT-PACK v0.9.
- v0.8 (2026-10-05) — **self-checks are an addition.** §1 tells Claude Code to read `manifest.concept_self_checks` and to render questions on the 101s only when it is `true` (APP-SPEC v0.6, CONTENT-PACK v0.10).
- v0.9 (2026-11-06) — **the conceptual lens.** The mode list gains manuscript-with-`lenses: [conceptual]`; new **§4c** (content build for the atlas and audit, `/read`'s two marker layers, `/atlas`, `/review` with grouped kinds and a construct filter, labelled added references and `check:` notes, `/methods`, notepad anchors, and the empty state when the audit has not been written); §5 lens tests. Pairs with APP-SPEC v0.7 and CONTENT-PACK v0.11.
- v0.10 (2026-11-07) — **notes from anywhere.** §4 extends the ported notepad to the whole app per APP-SPEC v0.8 §3.1, with the capture layer built once at the Layout level; §5 adds a capture-on-every-route test, popover/fold-out, keyboard, touch and return-and-highlight checks.
