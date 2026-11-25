import { describe, expect, it } from 'vitest';
import { buildMatcher, expandCitation, findAmbiguousVariants, linkCitations, linkTerms, unlink } from '../../scripts/lib/linker';

// Terms shaped like this pack's glossary: numbered compound variants, an all-caps receptor, a two-word term.
const terms = [
  { id: 'gingerol', term: 'Gingerol', variants: ['gingerols', '6-gingerol', '8-gingerol', '10-gingerol'] },
  { id: 'shogaol', term: 'Shogaol', variants: ['shogaols', '6-shogaol'] },
  { id: 'trpv1', term: 'TRPV1', variants: ['TRPV1 receptor', 'TRPV1 channel'] },
  { id: 'umbrella-review', term: 'Umbrella review', variants: ['umbrella reviews'] },
  { id: 'meta-analysis', term: 'Meta-analysis', variants: ['meta-analyses'] },
];
const m = buildMatcher(terms);

describe('term matcher', () => {
  it('matches variants case-insensitively and whole-word', () => {
    const r = linkTerms('Fresh Gingerols are pungent; gingerolic is not a variant.', m);
    expect(r.text).toBe('Fresh [Gingerols](#term:gingerol) are pungent; gingerolic is not a variant.');
  });
  it('prefers the longest match (TRPV1 receptor over TRPV1; 6-gingerol as one token)', () => {
    expect(linkTerms('activate the TRPV1 receptor here', m).text).toBe('activate the [TRPV1 receptor](#term:trpv1) here');
    expect(linkTerms('6-gingerol is the major one', m).text).toBe('[6-gingerol](#term:gingerol) is the major one');
  });
  it('respects hyphen and word boundaries', () => {
    expect(linkTerms('the pre-gingerol stage', m).linked).toEqual([]);
    expect(linkTerms('a meta-analysis of trials', m).linked).toEqual(['meta-analysis']);
  });
  it('matches all-caps variants case-sensitively only', () => {
    expect(linkTerms('trpv1 in lower case', m).linked).toEqual([]);
    expect(linkTerms('TRPV1 in capitals', m).linked).toEqual(['trpv1']);
  });
  it('skips headings, code, maths, links, HTML and comments', () => {
    const md = '# Shogaol heading\n`shogaol` $shogaol$ [shogaol](http://x) <!-- shogaol --> <mark data-syn="s">and shogaol here</mark>';
    const r = linkTerms(md, m);
    expect(r.linked).toEqual(['shogaol']);
    expect(r.text).toContain('and [shogaol](#term:shogaol) here');
  });
  it('links the first occurrence per section only (unless every occurrence is asked for)', () => {
    const seen = new Set<string>();
    expect(linkTerms('shogaols and shogaols', m, { seen }).text).toBe('[shogaols](#term:shogaol) and shogaols');
    expect(linkTerms('shogaols again', m, { seen }).text).toBe('shogaols again');
    expect(linkTerms('shogaols and shogaols', m, { everyOccurrence: true }).text).toBe('[shogaols](#term:shogaol) and [shogaols](#term:shogaol)');
  });
  it('reports ambiguous variants', () => {
    expect(findAmbiguousVariants([...terms, { id: 'x', term: '6-Gingerol' }])).toEqual([{ variant: '6-gingerol', ids: ['gingerol', 'x'] }]);
  });
});

describe('citations', () => {
  it('expands lists (with and without spaces) and en-dash ranges', () => {
    expect(expandCitation('18–20')).toEqual([18, 19, 20]);
    expect(expandCitation('1, 2, 3')).toEqual([1, 2, 3]);
    expect(expandCitation('59, 60')).toEqual([59, 60]);
  });
  it('keeps the brackets in the link text and unlink() restores the source exactly', () => {
    const src = 'Gingerols convert to shogaols on drying [3, 4], and steaming too [62]; see [18–20].';
    const linked = linkCitations(linkTerms(src, m).text);
    expect(linked.cites).toEqual([3, 4, 62, 18, 19, 20]);
    expect(linked.text).toContain('[\\[3, 4\\]](#cite:3,4)');
    expect(unlink(linked.text)).toBe(src);
  });
});
