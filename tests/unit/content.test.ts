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
    expect(prov.figures.by_synthesis).toEqual({ data: 3 });
  });
  it('states how far every reference was read (KICKOFF §8.3)', () => {
    expect(refs.every((r) => typeof r.verified_level === 'string' && r.verified_level.length > 0)).toBe(true);
    const counted = Object.values(prov.references.by_verified_level as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(counted).toBe(refs.length);
  });
  it('links ≥ 95 % of the glossary terms that occur in the review', () => {
    expect(prov.terms.linked_pct_of_occurring).toBeGreaterThanOrEqual(95);
  });
});

describe('recipes (KICKOFF §8.5)', () => {
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
