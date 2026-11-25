import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJson, ROOT } from './helpers';

/**
 * The shipped content (src/data/*.json, from the real pack) against the KICKOFF's gates: topic-mode provenance,
 * the recipes surface (§8.5), the verification-level disclosure (§8.3) and the health profile (§8.4).
 */
type Sec = { id: string; part: boolean; chunks: { kind: string; md?: string; marker?: string | null; id?: string | null }[] };
const sections = readJson<Sec[]>('src/data/sections.json');
const prov = readJson<Record<string, any>>('src/data/provenance.json'); // eslint-disable-line @typescript-eslint/no-explicit-any
const refs = readJson<{ n: number; verified_level?: string; tier: string; year: number }[]>('src/data/references.json');
const recipes = readJson<{ recipes: { id: string; kind: string; links: { sections: string[] }; science_md: string; safety_md: string; gloss_md: string; cites: number[]; source_ref: number }[] }>('src/data/recipes.json').recipes;
const syn = readJson<{ id: string; section: string }[]>('src/data/synthesis.json');
const be = readJson<{ errors: string[] }>('src/data/build-errors.json');
const review = fs.readFileSync(path.join(ROOT, 'content-pack', 'review.md'), 'utf8');
const refN = new Set(refs.map((r) => r.n));
const secIds = new Set(sections.map((s) => s.id));

describe('topic-mode provenance', () => {
  it('builds with zero errors and zero uncited blocks', () => {
    expect(be.errors).toEqual([]);
    expect(prov.blocks.uncited).toBe(0);
  });
  it('keeps every synthesis marker visible: one id per marker, each present in the reader data', () => {
    expect(syn).toHaveLength((review.match(/<!-- synthesis -->/g) ?? []).length);
    const all = JSON.stringify(sections);
    for (const y of syn) expect(all).toContain(`data-syn=\\"${y.id}\\"`);
  });
  it('writes the topic-mode counts into provenance.json', () => {
    for (const k of ['total', 'cited', 'framing', 'synthesis']) expect(typeof prov.blocks[k]).toBe('number');
    expect(prov.as_of).toBe('2026-11-24');
    expect(Object.keys(prov.references.by_tier).sort()).toEqual(['background', 'classic', 'current', 'seminal']);
    expect(prov.references.unverified_but_cited).toEqual([]);
    expect(prov.figures.by_synthesis).toEqual({ data: 5, conceptual: 1 });
    expect(prov.figures.by_kind).toEqual({ table: 3, chart: 2, pathway: 1 });
  });
  it('states how far every reference was read (KICKOFF §8.3)', () => {
    expect(refs.every((r) => typeof r.verified_level === 'string' && r.verified_level.length > 0)).toBe(true);
    const counted = Object.values(prov.references.by_verified_level as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(counted).toBe(refs.length);
  });
  it('counts the read levels from the data, and those are the counts /methods shows (K45: 23 · 121 · 18)', () => {
    const fromRefs = refs.reduce<Record<string, number>>((m, r) => { m[r.verified_level!] = (m[r.verified_level!] ?? 0) + 1; return m; }, {});
    expect(prov.references.by_verified_level).toEqual(fromRefs);
    expect(fromRefs).toEqual({ 'full-text': 23, abstract: 121, partial: 18 });
    // Methods and the reference cards read the levels from the data; nothing in the source hard-codes the counts
    const methods = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'Methods.tsx'), 'utf8');
    expect(methods).not.toMatch(/\b(23|121|18)\b(?![^<]*px)/);
    expect(methods).toContain('LEVEL_COUNTS[k]');
  });
  it('every reference card shows its read level (the card renders LevelChip with verified_level)', () => {
    const card = fs.readFileSync(path.join(ROOT, 'src', 'components', 'reader', 'ReferenceCard.tsx'), 'utf8');
    expect(card).toMatch(/<LevelChip level=\{r\.verified_level\} \/>/);
    expect(refs.every((r) => ['full-text', 'abstract', 'partial'].includes(r.verified_level!))).toBe(true);
  });
  it('links ≥ 95 % of the glossary terms that occur in the review', () => {
    expect(prov.terms.linked_pct_of_occurring).toBeGreaterThanOrEqual(95);
  });
});

describe('every [n] resolves (K45 build work 1)', () => {
  const cites = (md: string) => [...md.matchAll(/#cite:([\d,]+)/g)].flatMap((m) => m[1].split(',').map(Number));
  it('in the review, figure captions, explain text and pathway nodes, glossary sources and 101s', () => {
    for (const s of sections) for (const c of s.chunks) if (c.md) for (const n of cites(c.md)) expect(refN.has(n), `${s.id} cites ${n}`).toBe(true);
    const figs = readJson<{ id: string; refs: number[]; caption_md: string; how_md: string; source_md: string; explain: { text_md?: string }[]; rows: Record<string, unknown>[]; graph?: { nodes: { refs: number[]; detail_md?: string }[]; edges: { refs: number[] }[] } }[]>('src/data/figures.json');
    for (const f of figs) {
      for (const n of f.refs) expect(refN.has(n), `${f.id} refs ${n}`).toBe(true);
      for (const md of [f.caption_md, f.how_md, f.source_md, ...f.explain.map((e) => e.text_md ?? '')]) for (const n of cites(md)) expect(refN.has(n), `${f.id} cites ${n}`).toBe(true);
      for (const r of f.rows) if (r.ref != null) for (const n of String(r.ref).split(/[,;\s]+/).map(Number)) expect(f.refs, `${f.id} row ref ${n}`).toContain(n);
      for (const x of [...(f.graph?.nodes ?? []), ...(f.graph?.edges ?? [])]) for (const n of x.refs) expect(f.refs, `${f.id} graph ref ${n}`).toContain(n);
    }
    const glossary = readJson<{ id: string; source_refs: number[]; definition: string }[]>('src/data/glossary.json');
    for (const g of glossary) for (const n of [...g.source_refs, ...cites(g.definition)]) expect(refN.has(n), `glossary ${g.id} → ${n}`).toBe(true);
    const concepts = readJson<{ id: string; sections: { md: string }[]; why_here_md: string }[]>('src/data/concepts.json');
    for (const c of concepts) for (const md of [c.why_here_md, ...c.sections.map((x) => x.md)]) for (const n of cites(md)) expect(refN.has(n), `101 ${c.id} → ${n}`).toBe(true);
  });
  it('the pathway figure carries edges of all three kinds', () => {
    const figs = readJson<{ id: string; graph?: { edges: { kind: string }[] } }[]>('src/data/figures.json');
    const kinds = new Set(figs.find((f) => f.id === 'fig-pathway')!.graph!.edges.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['chemical', 'proposed', 'shown']);
  });
});

describe('recipes (KICKOFF §8.5)', () => {
  it('pack 0.2.1 carries 32 recipes, 10 of them medicinal; each has an original text or a paraphrase', () => {
    expect(recipes).toHaveLength(32);
    expect(recipes.filter((r) => r.kind === 'medicinal')).toHaveLength(10);
    const full = readJson<{ recipes: { id: string; original_text: string | null; gloss: string }[] }>('src/data/recipes.json').recipes;
    for (const r of full) expect(!!r.original_text || r.gloss.trim().length > 0, r.id).toBe(true);
  });
  it('every links.sections id resolves to a review section', () => {
    for (const r of recipes) for (const s of r.links.sections) expect(secIds.has(s), `${r.id} → ${s}`).toBe(true);
  });
  it('every [n] in a recipe resolves to a reference', () => {
    for (const r of recipes) {
      expect(refN.has(r.source_ref)).toBe(true);
      for (const md of [r.science_md, r.safety_md, r.gloss_md]) for (const m of md.matchAll(/#cite:([\d,]+)/g)) for (const n of m[1].split(',')) expect(refN.has(Number(n)), `${r.id} cites ${n}`).toBe(true);
    }
  });
  it('carries at least one medicinal recipe (rendered with its label — see e2e)', () => {
    expect(recipes.some((r) => r.kind === 'medicinal')).toBe(true);
  });
});

describe('health profile (KICKOFF §8.4)', () => {
  it('the app source contains no dosing affordance', () => {
    const src = fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }).filter((f) => String(f).endsWith('.tsx')).map((f) => fs.readFileSync(path.join(ROOT, 'src', String(f)), 'utf8')).join('\n');
    expect(src).not.toMatch(/how much to take|recommended dose|dosage calculator|daily dose:/i);
  });
});
