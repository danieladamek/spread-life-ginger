/**
 * Content build (KICKOFF §3): validate the topic-mode pack, parse the commissioned review, link terms and
 * citations, run the citation-coverage gate, and emit src/data/*.json and public/provenance.json.
 *
 * Fails loudly: every error is listed, written to content-pack/BUILD-ERRORS.md, surfaced on /methods, and the
 * process exits non-zero — but everything that did validate is still emitted, so the app builds and shows the
 * errors (KICKOFF §1). The pack is never repaired here: an uncited block is never "fixed" by adding a citation.
 *
 * Usage: npm run build:content [-- --pack <dir>] [-- --out <dir>] [-- --quiet]   (the tests run it on fixture packs)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import Papa from 'papaparse';
import type { z } from 'zod';
import {
  ConceptFront, Figure, GlossaryEntry, Manifest, Recipe, RecipesFile, Reference, Scope, Todo, TIERS, zodErrors,
  type ConceptFront as ConceptFrontT, type Figure as FigureT, type GlossaryEntry as GlossaryT, type Recipe as RecipeT, type Reference as ReferenceT,
} from './lib/schemas';
import { buildMatcher, findAmbiguousVariants, linkCitations, linkTerms, normaliseMatch } from './lib/linker';
import { claimWords, hasMath, parseReview, splitBlocks, wordCount, type Section } from './lib/parse';

// ---------------------------------------------------------------------------------------------- setup
const argv = process.argv.slice(2);
const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PACK = path.resolve(arg('--pack') ?? path.join(ROOT, 'content-pack'));
const OUT = path.resolve(arg('--out') ?? ROOT);                   // src/data and public/ live under OUT
const DATA = path.join(OUT, 'src', 'data');
const PUB = path.join(OUT, 'public');
const QUIET = argv.includes('--quiet');
const P = (...a: string[]) => path.join(PACK, ...a);

const errors: string[] = [];
const warnings: string[] = [];
const E = (m: string) => errors.push(m);
const W = (m: string) => warnings.push(m);

const written: { file: string; status: 'written' | 'unchanged' }[] = [];
function emit(file: string, content: string | Buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = typeof content === 'string' ? Buffer.from(content) : content;
  const same = fs.existsSync(file) && fs.readFileSync(file).equals(buf);
  if (!same) fs.writeFileSync(file, buf);
  written.push({ file: path.relative(OUT, file), status: same ? 'unchanged' : 'written' });
}
const emitJson = (file: string, v: unknown) => emit(file, JSON.stringify(v, null, 1) + '\n');

function readYaml(file: string, required = true): { ok: true; raw: unknown } | { ok: false } {
  if (!fs.existsSync(P(file))) { if (required) E(`${file}: missing`); return { ok: false }; }
  try { return { ok: true, raw: yaml.load(fs.readFileSync(P(file), 'utf8')) }; } catch (e) { E(`${file}: YAML parse error — ${(e as Error).message.split('\n')[0]}`); return { ok: false }; }
}
function loadYaml<S extends z.ZodTypeAny>(file: string, schema: S, where: string): z.output<S> | null {
  const y = readYaml(file);
  if (!y.ok) return null;
  const r = schema.safeParse(y.raw);
  if (!r.success) { zodErrors(where, r.error).forEach(E); return null; }
  return r.data;
}
/** Validate a YAML list item by item so one bad record does not hide the rest. */
function validateList<S extends z.ZodTypeAny>(raw: unknown, file: string, schema: S): z.output<S>[] {
  if (!Array.isArray(raw)) { E(`${file}: must be a list`); return []; }
  const out: z.output<S>[] = [];
  raw.forEach((x: Record<string, unknown>, i) => {
    const r = schema.safeParse(x);
    if (r.success) out.push(r.data);
    else zodErrors(`${file.replace(/\.yaml$/, '')}/${String(x?.id ?? x?.n ?? i)}`, r.error).forEach(E);
  });
  return out;
}
function loadList<S extends z.ZodTypeAny>(file: string, schema: S): z.output<S>[] {
  const y = readYaml(file);
  return y.ok ? validateList(y.raw, file, schema) : [];
}
const dupes = (xs: (string | number)[], what: string) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))].forEach((x) => E(`${what}: duplicate id ${x}`));
/** Reference numbers cited in a piece of builder prose ([3], [3, 4], [3–5]). */
const citesIn = (s: string) => linkCitations(s).cites;

// ---------------------------------------------------------------------------------------------- 1. load + validate
const manifest = loadYaml('manifest.yaml', Manifest, 'manifest');
if (!manifest) { finishEarly(); }
const M = manifest!;
const scope = loadYaml('scope.yaml', Scope, 'scope');
const glossary = loadList('glossary.yaml', GlossaryEntry);
const references = loadList('references.yaml', Reference);
const figures = loadList('figures.yaml', Figure);
const todo = fs.existsSync(P('todo.yaml')) ? (loadYaml('todo.yaml', Todo, 'todo') ?? []) : [];

let recipesMeta: { as_of?: string; status?: string } = {};
let recipes: RecipeT[] = [];
if (M.extensions.recipes) {
  const y = readYaml(M.extensions.recipes);
  if (y.ok) {
    const f = RecipesFile.safeParse(y.raw);
    if (!f.success) zodErrors('recipes', f.error).forEach(E);
    else { recipesMeta = { as_of: f.data.as_of, status: f.data.status }; recipes = validateList(f.data.recipes, 'recipes.yaml', Recipe); }
  }
}

dupes(glossary.map((g) => g.id), 'glossary');
dupes(references.map((r) => r.n), 'references');
dupes(figures.map((f) => f.id), 'figures');
dupes(recipes.map((r) => r.id), 'recipes');

const refByN = new Map(references.map((r) => [r.n, r]));
const glossById = new Map(glossary.map((g) => [g.id, g]));
const figById = new Map(figures.map((f) => [f.id, f]));

interface ConceptFile { front: ConceptFrontT; body: string; file: string }
const concepts: ConceptFile[] = [];
if (!fs.existsSync(P('concepts'))) E('concepts/: missing');
else for (const f of fs.readdirSync(P('concepts')).filter((x) => x.endsWith('.md')).sort()) {
  const src = fs.readFileSync(P('concepts', f), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!m) { E(`concept ${f}: no frontmatter`); continue; }
  let fm: unknown;
  try { fm = yaml.load(m[1]); } catch (e) { E(`concept ${f}: frontmatter YAML error — ${(e as Error).message.split('\n')[0]}`); continue; }
  const r = ConceptFront.safeParse(fm);
  if (!r.success) { zodErrors(`concept ${f.replace(/\.md$/, '')}`, r.error).forEach(E); continue; }
  if (r.data.id !== f.replace(/\.md$/, '')) E(`concept ${f}: id ${r.data.id} != filename`);
  if (r.data.self_check?.length && !M.concept_self_checks) W(`concept ${r.data.id}: has self_check but manifest.concept_self_checks is not true — it will not be shown`);
  concepts.push({ front: r.data, body: m[2], file: f });
}
const conceptById = new Map(concepts.map((c) => [c.front.id, c]));

// glossary cross-refs
for (const g of glossary) {
  if (g.concept && !conceptById.has(g.concept)) E(`glossary/${g.id}: concept ${g.concept} not in concepts/`);
  for (const s of g.see) if (!glossById.has(s)) E(`glossary/${g.id}: see ${s} unknown`);
  for (const s of g.sources) if (typeof s === 'number' && !refByN.has(s)) E(`glossary/${g.id}: source [${s}] has no reference entry`);
  const nw = claimWords(g.definition);
  if (nw >= 25 && !/\[\d/.test(g.definition) && !/<!--\s*framing\s*-->/.test(g.definition) && !g.sources.length) E(`glossary/${g.id}: definition is an uncited block of ${nw} words — cite it or mark it <!-- framing -->`);
}
const ambiguous = findAmbiguousVariants(glossary);
for (const a of ambiguous) E(`glossary: ambiguous variant "${a.variant}" claimed by ${a.ids.join(', ')}`);

// concepts cross-refs
for (const c of concepts) {
  for (const p of c.front.prerequisites) if (!conceptById.has(p)) E(`concept ${c.front.id}: prerequisite ${p} unknown`);
  for (const t of c.front.terms) if (!glossById.has(t)) E(`concept ${c.front.id}: term ${t} not in glossary`);
  for (const f of c.front.figures) if (!figById.has(f)) E(`concept ${c.front.id}: figure ${f} not in figures.yaml`);
}

// references: topic-mode rules
for (const r of references) {
  if (!(TIERS as readonly string[]).includes(r.tier)) E(`references/${r.n}: tier missing`);
  if (!r.verified) W(`references/${r.n}: verified: false — may not support a claim (APP-SPEC §6.1 rule 7)`);
}

// ---------------------------------------------------------------------------------------------- 2. the review
const REVIEW = P('review.md');
if (!fs.existsSync(REVIEW)) E('review.md: missing — topic mode renders the commissioned review');
const review = fs.existsSync(REVIEW) ? fs.readFileSync(REVIEW, 'utf8') : '';
const reviewSha = crypto.createHash('sha256').update(review).digest('hex');
if (fs.existsSync(P('manuscript.md'))) W('manuscript.md present in a topic-mode pack — ignored; the reader renders review.md');

const matcher = buildMatcher(glossary);
const parsed = parseReview(review, matcher, { everyOccurrence: M.link_every_occurrence });
const sectionIds = new Set(parsed.sections.map((s) => s.id));
dupes(parsed.sections.map((s) => s.id), 'review sections');
for (const s of parsed.sections) if (!s.title) E(`review: section ${s.id} has no heading`);
for (const f of parsed.figureMarkers) if (!figById.has(f)) E(`review: <!-- figure: ${f} --> has no entry in figures.yaml`);
for (const n of parsed.citations) if (!refByN.has(n)) E(`review: citation [${n}] has no entry in references.yaml`);
// APP-SPEC §6.1 rule 5 — uncited prose fails the build; it is never repaired here.
for (const u of parsed.uncited) E(`review: uncited block of ${u.words} words in ${u.section} — cite it or mark it <!-- framing -->: "${u.excerpt.slice(0, 90)}…"`);
// rule 7 — no claim may rest on a verified: false reference
const unverifiedCited = parsed.citations.filter((n) => refByN.get(n)?.verified === false);
for (const n of unverifiedCited) W(`review: cites [${n}], which is verified: false — flagged amber on /methods and on its card`);
// the quotation rule (TOPIC-WORKFLOW T4.5): ≤ 25 words, in quotation marks, with its [n]
for (const m of review.matchAll(/[“"]([^”"\n]{4,})[”"]/g)) if (m[1].split(/\s+/).length > 25) E(`review: quotation longer than 25 words: "${m[1].slice(0, 60)}…"`);
// cited_in honesty: a reference's cited_in should name the sections that actually cite it
const citedInActual = new Map<number, string[]>();
for (const s of parsed.sections) for (const n of s.cites) { if (!citedInActual.has(n)) citedInActual.set(n, []); citedInActual.get(n)!.push(s.id); }
for (const r of references) for (const s of r.cited_in) if (!sectionIds.has(s)) E(`references/${r.n}: cited_in section ${s} not in review.md`);

// number every md chunk so each paragraph has a stable anchor (para:<section>.<i>)
type ChunkOut = (Section['chunks'][number] & { index?: number });
const sectionsOut = parsed.sections.map((s) => {
  let i = 0;
  const chunks = s.chunks.map((c): ChunkOut => (c.kind === 'md' ? { ...c, index: i++ } : c));
  return { ...s, chunks, part: s.depth === 1 && s.id.startsWith('part-') };
});
// which part each numbered section belongs to (the rail and the section list group by part)
let curPart: string | null = null;
const partOf: Record<string, string | null> = {};
for (const s of sectionsOut) { if (s.part) curPart = s.id; partOf[s.id] = s.part ? null : curPart; }

// ---------------------------------------------------------------------------------------------- 3. figures
type Cell = string | number | null;
interface FigureOut extends Omit<FigureT, 'data'> { data: string | null; rows: Record<string, Cell>[]; fields: string[]; caption_md: string; how_md: string; source_md: string }
const figuresOut: FigureOut[] = [];
for (const f of figures) {
  const out: FigureOut = { ...f, data: f.data ?? null, rows: [], fields: [], caption_md: '', how_md: '', source_md: '' };
  for (const n of f.refs) if (!refByN.has(n)) E(`figure ${f.id}: refs [${n}] has no reference entry`);
  for (const c of f.concepts) if (!conceptById.has(c)) E(`figure ${f.id}: concept ${c} unknown`);
  for (const s of f.discussed_in) if (!sectionIds.has(s)) E(`figure ${f.id}: discussed_in section ${s} unknown`);
  for (const ex of f.explain) {
    if (ex.term && !glossById.has(ex.term)) E(`figure ${f.id}: explain term ${ex.term} unknown`);
    if (ex.concept && !conceptById.has(ex.concept)) E(`figure ${f.id}: explain concept ${ex.concept} unknown`);
  }
  if (f.kind === 'image' && !/reproduc|permitted|permission/i.test(M.permissions.figures)) W(`figure ${f.id}: kind image in topic mode without explicit permission in manifest.permissions.figures`);
  if (f.data) {
    if (!fs.existsSync(P(f.data))) E(`figure ${f.id}: data file missing ${f.data}`);
    else {
      const res = Papa.parse<Record<string, string>>(fs.readFileSync(P(f.data), 'utf8'), { header: true, skipEmptyLines: true });
      if (res.errors.length) E(`figure ${f.id}: CSV parse error — ${res.errors[0].message}`);
      const fields = res.meta.fields ?? [];
      if (!res.data.length) E(`figure ${f.id}: empty csv`);
      const need = f.chart ? [f.chart.x.field, f.chart.y.field, ...(f.chart.series ? [f.chart.series] : []), ...(f.chart.ci ?? [])] : [];
      for (const k of need) if (!fields.includes(k)) E(`figure ${f.id}: chart field "${k}" is not a column of ${f.data} (columns: ${fields.join(', ')})`);
      if (f.synthesis === 'data') {
        if (!fields.includes('ref')) E(`figure ${f.id}: synthesis data csv needs a 'ref' column so every row is traceable (cols: ${fields.join(', ')})`);
        else for (const row of res.data) {
          for (const n of citesIn(`[${row.ref}]`)) if (!f.refs.includes(n)) E(`figure ${f.id}: a row cites ref ${n}, which is not in the figure's refs`);
          if (!String(row.ref ?? '').trim()) E(`figure ${f.id}: a row has an empty ref`);
        }
      }
      out.fields = fields;
      const numeric = new Set(f.chart ? [f.chart.y.field, ...(f.chart.ci ?? [])] : []);
      out.rows = res.data.map((r) => Object.fromEntries(fields.map((k) => {
        const v = r[k];
        if (v === undefined || v === '') return [k, null];   // missing data is a gap, never a zero (DESIGN-SYSTEM §5)
        if (numeric.has(k)) { const x = Number(v); if (!Number.isFinite(x)) E(`figure ${f.id}: ${k} = "${v}" is not a number`); return [k, Number.isFinite(x) ? x : null]; }
        return [k, v];
      })));
      emit(path.join(PUB, 'figures', 'data', path.basename(f.data)), fs.readFileSync(P(f.data)));
    }
  }
  if (f.image) {
    if (!fs.existsSync(P(f.image))) E(`figure ${f.id}: image missing ${f.image}`);
    else emit(path.join(PUB, 'figures', path.basename(f.image)), fs.readFileSync(P(f.image)));
  }
  figuresOut.push(out);
}
// copy content-pack/figures/images/* → public/figures/ (KICKOFF §3.5) — this pack has none
if (fs.existsSync(P('figures', 'images'))) for (const img of fs.readdirSync(P('figures', 'images'))) emit(path.join(PUB, 'figures', img), fs.readFileSync(P('figures', 'images', img)));

// ---------------------------------------------------------------------------------------------- 4. builder prose outside the review
function linkProse(md: string, seen?: Set<string>): { md: string; cites: number[] } {
  const t = linkTerms(md, matcher, { seen: seen ?? new Set() });
  const c = linkCitations(t.text);
  for (const n of c.cites) if (!refByN.has(n)) E(`prose: citation [${n}] has no entry in references.yaml — in "${md.slice(0, 60)}…"`);
  return { md: c.text, cites: c.cites };
}
/**
 * The ≥ 25-word gate over builder prose that is not the review (101s, recipe science notes). In topic mode the
 * hard gate is review.md (KICKOFF §1, APP-SPEC §6.1 rule 5); APP-SPEC applies it to concept bodies as a build
 * error only in critique mode (§6.2 rule 13). So here a hit is a WARNING, listed in amber on /methods as
 * "uncited builder prose outside the review" — never repaired by adding a citation. tools/validate_pack.py skips
 * these blocks because each sits directly under its "## " heading with no blank line; this check strips the
 * heading line first, so it sees them.
 */
const uncitedOutside: { where: string; words: number; excerpt: string }[] = [];
function gate(where: string, body: string) {
  for (const b of splitBlocks(body.replace(/^##.*$/gm, ''))) {
    const plain = b.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!plain || plain.startsWith('#')) continue;
    const words = claimWords(plain);
    if (words >= 25 && !/\[\d/.test(plain) && !/<!--\s*framing\s*-->/.test(b)) uncitedOutside.push({ where, words, excerpt: plain.slice(0, 160) }), W(`${where}: uncited block of ${words} words — cite it or mark it <!-- framing -->: "${plain.slice(0, 80)}…"`);
  }
}
for (const f of figuresOut) {
  f.caption_md = linkProse(f.caption).md;
  f.how_md = linkProse(f.how_to_read).md;
  f.source_md = linkProse(f.source).md;
}

function conceptSections(body: string) {
  const parts = body.split(/^## /m);
  const out: { heading: string; key: string; md: string; hasMath: boolean }[] = [];
  for (const p of parts.slice(1)) {
    const nl = p.indexOf('\n');
    const heading = (nl === -1 ? p : p.slice(0, nl)).trim();
    const md = nl === -1 ? '' : p.slice(nl + 1).trim();
    const key = /^What it is/i.test(heading) ? 'what' : /^How this (paper|guide|review) uses it/i.test(heading) ? 'uses' : heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    out.push({ heading, key, md, hasMath: hasMath(md) });
  }
  return out;
}
const conceptTermLinks = new Map<string, Set<string>>();
const conceptsOut = concepts.map((c) => {
  const f = c.front;
  gate(`concept ${f.id}`, c.body);
  const seen = new Set<string>();
  const secs = conceptSections(c.body).map((s) => { const l = linkProse(s.md, seen); return { ...s, md: l.md, cites: [...new Set(l.cites)] }; });
  for (const s of secs) for (const m of s.md.matchAll(/\(#term:([a-z0-9-]+)\)/g)) { if (!conceptTermLinks.has(m[1])) conceptTermLinks.set(m[1], new Set()); conceptTermLinks.get(m[1])!.add(f.id); }
  const what = secs.find((s) => s.key === 'what');
  const { self_check: _sc, ...front } = f; void _sc;   // concept_self_checks is false: never shipped
  const whySections = [...f.why_here.matchAll(/[Ss]ections?\s+(\d+)/g)].map((m) => sectionsOut.find((s) => s.number === m[1])?.id).filter((x): x is string => !!x);
  return {
    ...front, words: wordCount(c.body), sections: secs, summary_md: what ? what.md.split(/\n\s*\n/)[0] : '',
    why_here_md: linkProse(f.why_here).md, why_sections: whySections,
    from_terms: glossary.filter((g) => g.concept === f.id).map((g) => g.id),
    from_figures: figures.filter((x) => x.concepts.includes(f.id) || x.explain.some((e) => e.concept === f.id)).map((x) => x.id),
    cites: [...new Set(secs.flatMap((s) => s.cites))],
    has_diagram: f.figures.length > 0,
  };
});
for (const c of conceptsOut) if (!c.from_terms.length && !c.from_figures.length) W(`concept ${c.id}: not reachable from any term or figure (APP-SPEC §8)`);

// recipes (KICKOFF §8.5)
function resolveCompound(name: string): string | null {
  const key = normaliseMatch(name).toLowerCase();
  for (const g of glossary) if (g.id === name || [g.term, ...g.variants].some((v) => normaliseMatch(v).toLowerCase() === key)) return g.id;
  return null;
}
const recipesOut = recipes.map((r) => {
  if (!refByN.has(r.source_ref)) E(`recipes/${r.id}: source_ref [${r.source_ref}] has no reference entry`);
  for (const s of r.links.sections) if (!sectionIds.has(s)) E(`recipes/${r.id}: links.sections ${s} is not a section of review.md`);
  for (const t of r.links.terms) if (!glossById.has(t)) E(`recipes/${r.id}: links.terms ${t} is not in the glossary`);
  const compounds = r.links.compounds.map((c) => { const id = resolveCompound(c); if (!id) E(`recipes/${r.id}: compound "${c}" matches no glossary term or variant`); return { name: c, term: id }; });
  gate(`recipes/${r.id}.science_note`, r.science_note);
  if (r.original_text && /in copyright|copyright/i.test(r.source_note) && !/public domain/i.test(r.source_note)) E(`recipes/${r.id}: original_text reproduced from a source not stated as public domain`);
  const science = linkProse(r.science_note);
  return {
    ...r, original_text: r.original_text ?? null,
    science_md: science.md, safety_md: linkProse(r.safety_note).md, gloss_md: linkProse(r.gloss).md,
    cites: [...new Set([r.source_ref, ...science.cites])], compounds,
    terms: [...new Set([...r.links.terms, ...compounds.map((c) => c.term).filter((x): x is string => !!x)])],
  };
});
if (M.extensions.recipes && recipesOut.length === 0) W('recipes.yaml: no recipes validated');

// ---------------------------------------------------------------------------------------------- 5. assemble glossary + references
const appearsIn = new Map<string, string[]>();
for (const s of parsed.sections) for (const t of s.terms) { if (!appearsIn.has(t)) appearsIn.set(t, []); appearsIn.get(t)!.push(s.id); }
const figsByTerm = new Map<string, string[]>();
for (const f of figures) for (const ex of f.explain) if (ex.term) { if (!figsByTerm.has(ex.term)) figsByTerm.set(ex.term, []); figsByTerm.get(ex.term)!.push(f.id); }
const glossaryOut = glossary.map((g: GlossaryT) => ({
  ...g, concept: g.concept ?? null, appears_in: appearsIn.get(g.id) ?? [], figures: figsByTerm.get(g.id) ?? [],
  units: [...(conceptTermLinks.get(g.id) ?? [])].sort(), in_review: (parsed.occurrences[g.id] ?? 0) > 0,
  recipes: recipesOut.filter((r) => r.terms.includes(g.id)).map((r) => r.id),
  source_refs: g.sources.filter((s): s is number => typeof s === 'number'),
  source_links: g.sources.filter((s): s is string => typeof s === 'string'),
}));

const referencesOut = references.map((r: ReferenceT) => ({
  ...r,
  in_review: parsed.citations.includes(r.n),
  cited_in_actual: citedInActual.get(r.n) ?? [],
  in_concepts: conceptsOut.filter((c) => c.cites.includes(r.n)).map((c) => c.id),
  in_glossary: glossary.filter((g) => g.sources.includes(r.n)).map((g) => g.id),
  in_figures: figures.filter((f) => f.refs.includes(r.n)).map((f) => f.id),
  in_recipes: recipesOut.filter((x) => x.cites.includes(r.n)).map((x) => x.id),
}));

// ---------------------------------------------------------------------------------------------- 6. provenance
const count = <T,>(xs: T[], k: (x: T) => string | undefined) => xs.reduce<Record<string, number>>((m, x) => { const key = k(x) ?? 'none'; m[key] = (m[key] ?? 0) + 1; return m; }, {});
const reviewPlain = review.replace(/<!--[\s\S]*?-->/g, '');
const occursAnywhere = (g: GlossaryT) => [g.term, ...g.variants].some((v) => new RegExp(`(?<![\\w-])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i').test(reviewPlain));
const termsInReview = glossary.filter((g) => (parsed.occurrences[g.id] ?? 0) > 0 || occursAnywhere(g));
const termsLinked = new Set(parsed.sections.flatMap((s) => s.terms));
const unmatched = glossary.filter((g) => !termsLinked.has(g.id)).map((g) => g.id);
const refsCitedAnywhere = new Set<number>([...parsed.citations, ...conceptsOut.flatMap((c) => c.cites), ...glossary.flatMap((g) => g.sources.filter((s): s is number => typeof s === 'number')), ...figures.flatMap((f) => f.refs), ...recipesOut.flatMap((r) => r.cites)]);
for (const r of references) if (!refsCitedAnywhere.has(r.n)) W(`reference ${r.n} never cited in the review, the 101s, the glossary, the figures or the recipes`);
const years = references.map((r) => r.year);
const todoMarkers = [
  ...conceptsOut.filter((c) => !c.has_diagram).map((c) => ({ where: `concepts/${c.id}`, what: 'No diagram supplied in the pack for "the key idea in one picture"; none is drawn by the build.' })),
  ...references.filter((r) => !r.summary.trim()).map((r) => ({ where: `references/${r.n}`, what: 'No summary in the pack.' })),
];

const provenance = {
  generated_by: 'scripts/build-content.ts',
  mode: M.mode, slug: M.slug, delivery: M.delivery, builder: M.builder, as_of: M.as_of, safety_profile: M.safety_profile,
  review: { sha256: reviewSha, words: wordCount(review), sections: parsed.sections.length, figure_markers: parsed.figureMarkers.length },
  blocks: { ...parsed.blocks, uncited: parsed.uncited.length, uncited_outside_review: 0 },
  synthesis: parsed.synthesis.map((s) => ({ id: s.id, section: s.section })),
  terms: {
    total: glossary.length, in_review: termsInReview.length, linked: termsLinked.size, unmatched: unmatched.length, unmatched_ids: unmatched,
    occurring_unlinked: termsInReview.filter((g) => !termsLinked.has(g.id)).map((g) => g.id),
    linked_pct_of_occurring: termsInReview.length ? Math.round((1000 * termsInReview.filter((g) => termsLinked.has(g.id)).length) / termsInReview.length) / 10 : 100,
    linked_in_concepts: conceptTermLinks.size, ambiguous_variants: ambiguous.map((a) => a.variant),
  },
  references: {
    total: references.length, with_summary: references.filter((r) => r.summary.trim()).length,
    verified: references.filter((r) => r.verified).length, unverified: references.filter((r) => !r.verified).map((r) => r.n),
    unverified_but_cited: unverifiedCited, by_tier: count(references, (r) => r.tier), by_verified_level: count(references, (r) => r.verified_level ?? 'unstated'),
    anchors: references.filter((r) => r.anchor).map((r) => r.n), cited_in_review: parsed.citations.length, cited_anywhere: refsCitedAnywhere.size,
    never_cited: references.filter((r) => !refsCitedAnywhere.has(r.n)).map((r) => r.n),
    year_range: years.length ? [Math.min(...years), Math.max(...years)] : [], by_role: count(references, (r) => r.role_here),
  },
  figures: { total: figures.length, by_kind: count(figures, (f) => f.kind), by_synthesis: count(figures, (f) => f.synthesis) },
  recipes: { total: recipes.length, by_kind: count(recipes, (r) => r.kind) },
  todo: todo.length, todo_markers: todoMarkers.length,
  concepts: {
    total: concepts.length, self_checks: M.concept_self_checks,
    reachable_from_term_or_figure: conceptsOut.filter((c) => c.from_terms.length || c.from_figures.length).length,
  },
  build: { errors: 0, warnings: 0 },
};

// ---------------------------------------------------------------------------------------------- 7. emit
const manifestOut = {
  ...M,
  counts: {
    references: references.length, concepts: concepts.length, figures: figures.length, recipes: recipes.length, terms: glossary.length,
    words: provenance.review.words, sections: sectionsOut.filter((s) => !s.part).length, synthesis: parsed.synthesis.length,
    current_from: scope?.time_window.current_from ?? null,
  },
};
emitJson(path.join(DATA, 'manifest.json'), manifestOut);
emitJson(path.join(DATA, 'sections.json'), sectionsOut);
emitJson(path.join(DATA, 'sections-index.json'), sectionsOut.map((s) => ({ id: s.id, title: s.title, depth: s.depth, number: s.number, words: s.words, part: s.part, in_part: partOf[s.id] })));
emitJson(path.join(DATA, 'synthesis.json'), parsed.synthesis);
emitJson(path.join(DATA, 'glossary.json'), glossaryOut);
emitJson(path.join(DATA, 'glossary-short.json'), glossaryOut.map((g) => ({ id: g.id, term: g.term, kind: g.kind, short: g.short, concept: g.concept })));
emitJson(path.join(DATA, 'concepts.json'), conceptsOut);
// 101s in reading order: by the first review section their why_here names (APP-SPEC §2 "Concepts to know first")
const secOrder = new Map(sectionsOut.map((s, i) => [s.id, i]));
const firstSec = (c: (typeof conceptsOut)[number]) => Math.min(...c.why_sections.map((s) => secOrder.get(s) ?? 999), 999);
emitJson(path.join(DATA, 'concepts-index.json'), [...conceptsOut].sort((a, b) => firstSec(a) - firstSec(b) || a.title.localeCompare(b.title)).map((c) => ({ id: c.id, title: c.title, one_liner: c.one_liner, why_sections: c.why_sections })));
emitJson(path.join(DATA, 'figures.json'), figuresOut);
emitJson(path.join(DATA, 'figures-index.json'), figuresOut.map((f) => ({ id: f.id, label: f.label, title: f.title, kind: f.kind, synthesis: f.synthesis, refs: f.refs, concepts: f.concepts, discussed_in: f.discussed_in, row_labels: f.rows.map((r) => String(r[f.chart?.x.field ?? f.fields[0]] ?? '')) })));
emitJson(path.join(DATA, 'references.json'), referencesOut);
emitJson(path.join(DATA, 'references-index.json'), referencesOut.map((r) => ({ n: r.n, citation: r.citation, verified: r.verified, tier: r.tier, year: r.year })));
emitJson(path.join(DATA, 'recipes.json'), { ...recipesMeta, recipes: recipesOut });
emitJson(path.join(DATA, 'recipes-index.json'), recipesOut.map((r) => ({ id: r.id, title: r.title, kind: r.kind, date: r.date, place: r.place })));
emitJson(path.join(DATA, 'scope.json'), scope ?? null);
emitJson(path.join(DATA, 'todo.json'), { pack: todo, markers: todoMarkers });

// ⌘K search: terms, concepts, figures, sections, recipes (KICKOFF §4)
const search = [
  ...glossaryOut.map((g) => ({ kind: 'term', id: g.id, title: g.term, subtitle: g.short, to: `/glossary#${g.id}`, hay: [g.term, ...g.variants, g.short].join(' ').toLowerCase() })),
  ...conceptsOut.map((c) => ({ kind: 'concept', id: c.id, title: c.title, subtitle: c.one_liner, to: `/concepts/${c.id}`, hay: `${c.title} ${c.one_liner} ${c.id}`.toLowerCase() })),
  ...figuresOut.map((f) => ({ kind: 'figure', id: f.id, title: `${f.label}: ${f.title}`, subtitle: `${f.kind} · synthesised from ${f.synthesis === 'data' ? 'data' : 'sources'}`, to: `/figures/${f.id}`, hay: `${f.label} ${f.title} ${f.id}`.toLowerCase() })),
  ...sectionsOut.filter((s) => !s.part).map((s) => ({ kind: 'section', id: s.id, title: s.title, subtitle: `${s.words} words`, to: `/read#${s.id}`, hay: `${s.title} ${s.id}`.toLowerCase() })),
  ...recipesOut.map((r) => ({ kind: 'recipe', id: r.id, title: r.title, subtitle: `${r.kind} · ${r.date} · ${r.place}`, to: `/recipes/${r.id}`, hay: `${r.title} ${r.kind} ${r.place} ${r.ingredients.join(' ')}`.toLowerCase() })),
];
emitJson(path.join(DATA, 'search.json'), search);

function writeBuildErrors() {
  emitJson(path.join(DATA, 'build-errors.json'), { errors, warnings, uncited: parsed?.uncited ?? [], uncited_outside: uncitedOutside });
  const beFile = path.join(PACK, 'BUILD-ERRORS.md');
  if (errors.length) {
    const md = [
      '# BUILD-ERRORS — content build of this pack',
      '',
      `Written by \`scripts/build-content.ts\` on ${new Date().toISOString().slice(0, 10)}. The content build refused these; the app was built with what validated and lists them on /methods. Fix the pack (never the build) and re-run \`npm run build:content\`.`,
      '',
      ...errors.map((e) => `- ${e}`),
      '',
      ...(warnings.length ? ['## Warnings', '', ...warnings.map((w) => `- ${w}`), ''] : []),
    ].join('\n');
    fs.writeFileSync(beFile, md);
  } else if (fs.existsSync(beFile) && /^# BUILD-ERRORS — content build/.test(fs.readFileSync(beFile, 'utf8'))) {
    fs.unlinkSync(beFile); // stale report from an earlier failing build
  }
}
function finishEarly(): never {
  console.error('content build: manifest.yaml did not validate — nothing else can be checked');
  for (const x of errors) console.error(`  ERROR ${x}`);
  emitJson(path.join(DATA, 'build-errors.json'), { errors, warnings, uncited: [], uncited_outside: [] });
  fs.writeFileSync(path.join(PACK, 'BUILD-ERRORS.md'), ['# BUILD-ERRORS — content build of this pack', '', 'manifest.yaml did not validate, so nothing else was checked. Fix the pack (never the build) and re-run `npm run build:content`.', '', ...errors.map((e) => `- ${e}`), ''].join('\n'));
  process.exit(1);
}
provenance.build = { errors: errors.length, warnings: warnings.length };
provenance.blocks.uncited_outside_review = uncitedOutside.length;
emitJson(path.join(DATA, 'provenance.json'), provenance);
emitJson(path.join(PUB, 'provenance.json'), provenance);
writeBuildErrors();

// ---------------------------------------------------------------------------------------------- 8. summary
if (!QUIET) {
  const w = written.filter((x) => x.status === 'written').length;
  const b = parsed.blocks;
  const rows: [string, string][] = [
    ['sections', `${parsed.sections.length} (${provenance.review.words} words)`],
    ['blocks', `${b.total} · cited ${b.cited} · framing ${b.framing} · synthesis ${b.synthesis} · uncited ≥25w ${parsed.uncited.length}`],
    ['synthesis passages', String(parsed.synthesis.length)],
    ['terms', `${glossary.length} · in review ${termsInReview.length} · linked ${termsLinked.size} (${provenance.terms.linked_pct_of_occurring}% of occurring) · unmatched ${unmatched.length}`],
    ['references', `${references.length} · ${JSON.stringify(provenance.references.by_tier)} · verified ${provenance.references.verified} · unverified-but-cited ${unverifiedCited.length}`],
    ['verified level', JSON.stringify(provenance.references.by_verified_level)],
    ['concepts', String(concepts.length)],
    ['figures', `${figures.length} ${JSON.stringify(provenance.figures.by_kind)} ${JSON.stringify(provenance.figures.by_synthesis)}`],
    ['recipes', `${recipes.length} ${JSON.stringify(provenance.recipes.by_kind)}`],
    ['todo', `${todo.length} pack items · ${todoMarkers.length} TODO(author) markers`],
    ['outputs', `${written.length} files, ${w} rewritten, ${written.length - w} unchanged`],
    ['errors / warnings', `${errors.length} / ${warnings.length}`],
  ];
  const width = Math.max(...rows.map((r) => r[0].length));
  console.log(`\ncontent build — ${M.slug} (${M.mode}, as of ${M.as_of})`);
  for (const [k, v] of rows) console.log(`  ${k.padEnd(width)}  ${v}`);
  for (const x of warnings) console.log(`  WARN  ${x}`);
  for (const x of errors) console.log(`  ERROR ${x}`);
}
process.exit(errors.length ? 1 : 0);
