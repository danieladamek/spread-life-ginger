import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { buildMatcher, unlink } from '../../scripts/lib/linker';
import { parseReview, splitSections, wrapSynthesis } from '../../scripts/lib/parse';
import { ROOT } from './helpers';

const review = fs.readFileSync(path.join(ROOT, 'content-pack', 'review.md'), 'utf8');
const glossary = yaml.load(fs.readFileSync(path.join(ROOT, 'content-pack', 'glossary.yaml'), 'utf8')) as { id: string; term: string; variants: string[] }[];
const parsed = parseReview(review, buildMatcher(glossary));
const strip = (s: string) => s.replace(/<\/?mark[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();

describe('section and citation parser (the real review.md)', () => {
  it('finds every section marker in order, with its heading', () => {
    const ids = [...review.matchAll(/<!-- section: ([a-z0-9-]+) -->/g)].map((m) => m[1]);
    expect(parsed.sections.map((s) => s.id)).toEqual(ids);
    expect(parsed.sections.every((s) => s.title.length > 0)).toBe(true);
    expect(parsed.sections.find((s) => s.id === '10-safety-interactions-and-pregnancy')!.number).toBe('10');
  });
  it('resolves figure markers into figure slots in place', () => {
    expect(parsed.figureMarkers).toEqual(['fig-drying', 'fig-cmax', 'fig-gastric']);
    const s3 = parsed.sections.find((s) => s.id === '3-the-chemistry-in-brief')!;
    expect(s3.chunks.some((c) => c.kind === 'figure' && c.id === 'fig-drying')).toBe(true);
  });
  it('turns "[n]" and "[n, m]" into citation tokens', () => {
    expect(parsed.citations).toContain(13);   // cited only as "[13, 14]" — the pack validator misses list-with-space
    expect(parsed.citations).toContain(30);
    expect(parsed.citations.length).toBeGreaterThan(70);
  });
  it('renders the review as written: removing link syntax and markers gives back each block', () => {
    for (const s of parsed.sections) {
      const body = splitSections(review).find((x) => x.id === s.id)!.body;
      const raw = strip(body.replace(/^#.*$/gm, '').replace(/<!-- figure: [a-z0-9-]+ -->/g, ''));
      const rendered = strip(s.chunks.filter((c) => c.kind === 'md').map((c) => unlink((c as { md: string }).md)).join(' '));
      expect(rendered).toBe(raw);
    }
  });
  it('counts blocks exactly as tools/validate_pack.py does (87 · 61 cited · 26 framing · 14 synthesis)', () => {
    expect(parsed.blocks).toEqual({ total: 87, cited: 61, framing: 26, synthesis: 14 });
    expect(parsed.uncited).toEqual([]);
  });
  it('gives every synthesis passage a stable id and wraps only the sentence its marker closes', () => {
    expect(parsed.synthesis).toHaveLength((review.match(/<!-- synthesis -->/g) ?? []).length);
    expect(new Set(parsed.synthesis.map((s) => s.id)).size).toBe(parsed.synthesis.length);
    const safety = parsed.synthesis.find((s) => s.section === '10-safety-interactions-and-pregnancy')!;
    expect(safety.excerpt.startsWith('An interval that wide')).toBe(true);
  });
});

describe('framing and synthesis markers', () => {
  const m = buildMatcher([]);
  it('fails an uncited block of 25+ words that has no framing marker, and never adds a citation', () => {
    const md = '<!-- section: s -->\n## S\n\n' + 'This block makes a claim of fact about ginger but it carries no citation and no framing marker either, so it must fail the content build loudly here.\n';
    const r = parseReview(md, m);
    expect(r.uncited).toHaveLength(1);
    expect(r.uncited[0].words).toBeGreaterThanOrEqual(25);
    expect(JSON.stringify(r.sections)).not.toMatch(/#cite:/);
  });
  it('accepts the same block with a framing marker before it or at its end', () => {
    const text = 'This block only says what the rest of the section will do for a reader, and it makes no claim of fact that would need a citation at all.';
    expect(parseReview(`<!-- section: s -->\n## S\n\n<!-- framing -->\n${text}\n`, m).uncited).toEqual([]);
    expect(parseReview(`<!-- section: s -->\n## S\n\n${text} <!-- framing -->\n`, m).uncited).toEqual([]);
  });
  it('wraps a mid-paragraph synthesis sentence, not its neighbours', () => {
    const w = wrapSynthesis('A cited fact [1]. A conclusion of my own. <!-- synthesis --> Another cited fact [2].', false, () => 'syn-x');
    expect(w.text).toBe('A cited fact [1]. <mark data-syn="syn-x">A conclusion of my own.</mark> Another cited fact [2].');
  });
});
