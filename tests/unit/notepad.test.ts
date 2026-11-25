import { describe, expect, it } from 'vitest';
import { emptyNotepad, fromMarkdown, groupBySection, normalise, parseAnchor, reducer, resolveAnchor, surfaceOf, toMarkdown, type AnchorIndex, type Note, type NotepadState } from '../../src/lib/notepad';

const now = () => '2026-11-24T10:00:00.000Z';
const PAGES: Record<string, string> = { '/': 'Home', '/read': 'Read', '/glossary': 'Glossary', '/methods': 'Methods', '/recipes': 'Recipes', '/recipes/gyngener': 'Recipe: Gyngener', '/figures/fig-gastric': 'Figure 1' };
const idx: AnchorIndex = {
  sections: [{ id: 'abstract', title: 'Abstract', number: null }, { id: '8-nausea-and-vomiting', title: '8. Nausea and vomiting', number: '8' }, { id: '15-from-rhizome-to-kitchen', title: '15. From rhizome to kitchen', number: '15' }],
  synthesis: new Map([['syn-15-from-rhizome-to-kitchen-1', { section: '15-from-rhizome-to-kitchen' }]]),
  recipes: new Map([['gyngener', { title: 'Gyngener (a ginger sauce)', sections: ['15-from-rhizome-to-kitchen'] }]]),
  refs: new Map([[32, { citation: 'Vutyavanich 2001', sections: ['8-nausea-and-vomiting'] }], [25, { citation: 'Forme of Cury', sections: [] }]]),
  concepts: new Map([['reading-the-trials', { title: 'Reading the trials', sections: [] }]]),
  terms: new Map([['shogaol', { term: 'Shogaol', sections: ['abstract'] }]]),
  figures: new Map([['fig-gastric', { label: 'Figure 1: Gastric half-emptying', sections: ['11-how-it-might-work'] }]]),
  rows: new Map([['fig-gastric:1', { figure: 'fig-gastric', label: 'Figure 1, row 2 (Healthy volunteers)' }]]),
  page: (p) => PAGES[p.split(/[?#]/)[0]] ?? null,
};

function seed(): NotepadState {
  let s = emptyNotepad();
  const add = (note: Parameters<typeof reducer>[1] extends infer A ? A extends { type: 'add'; note: infer N } ? N : never : never) => { s = reducer(s, { type: 'add', note }, now); };
  add({ id: 'a', anchor: { type: 'section', id: '8-nausea-and-vomiting' }, quote: 'agree on nausea and disagree on vomiting', body: 'Severity vs incidence?', route: '/read' });
  add({ id: 'b', anchor: { type: 'section', id: 'abstract' }, body: 'Three records.' });
  add({ id: 'c', anchor: { type: 'ref', id: '32' }, body: 'Read the full text.' });
  add({ id: 'd', anchor: { type: 'recipe', id: 'gyngener' }, body: 'Uncooked sauce.', route: '/recipes/gyngener' });
  add({ id: 'e', anchor: { type: 'concept', id: 'reading-the-trials' }, body: 'Reread.' });
  add({ id: 'f', anchor: { type: 'term', id: 'shogaol' }, body: 'From the popover.', quote: 'formed from gingerols', route: '/read', prefix: 'Pungent compounds ', suffix: ' when ginger', within: { kind: 'popover', opener: 'term:shogaol', host: 'section:abstract' } });
  add({ id: 'g', anchor: { type: 'page', id: '/methods', heading: 'verification' }, body: 'Abstract-level only.', route: '/methods' });
  add({ id: 'h', anchor: { type: 'row', id: 'fig-gastric:1' }, body: 'Placebo row.', route: '/figures/fig-gastric' });
  add({ id: 'i', anchor: { type: 'synthesis', id: 'syn-15-from-rhizome-to-kitchen-1' }, body: 'Fair inference?', route: '/read' });
  add({ id: 'j', anchor: { type: 'term', id: 'shogaol' }, body: 'Glossary note.', route: '/glossary' });
  return s;
}

describe('notepad reducer', () => {
  it('adds, updates and removes notes', () => {
    let s = seed();
    expect(s.notes).toHaveLength(10);
    s = reducer(s, { type: 'update', id: 'a', body: 'Pooled analyses: nausea only.' }, now);
    expect(s.notes.find((n) => n.id === 'a')!.body).toBe('Pooled analyses: nausea only.');
    s = reducer(s, { type: 'remove', id: 'b' }, now);
    expect(s.notes.map((n) => n.id)).toEqual(['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
  });
  it('merges imported notes by id, keeping the newer', () => {
    const s = seed();
    const merged = reducer(s, { type: 'merge', notes: [{ ...s.notes[0], body: 'newer', updated: '2027-01-01' }] }, now);
    expect(merged.notes.find((n) => n.id === 'a')!.body).toBe('newer');
    const older = reducer(s, { type: 'merge', notes: [{ ...s.notes[0], body: 'older', updated: '2020-01-01' }] }, now);
    expect(older.notes.find((n) => n.id === 'a')!.body).toBe('Severity vs incidence?');
  });
  it('normalises a v1 single-text notepad into one unanchored note', () => {
    expect(normalise({ text: 'old notes' }).notes[0].anchor.type).toBe('free');
  });
  it('an anchor kind this app does not have (a lens claim) becomes free, not dropped', () => {
    const n = normalise({ version: 2, notes: [{ id: 'z', anchor: { type: 'claim', id: 'C0001' }, quote: 'kept', body: 'body kept', created: now(), updated: now() }] });
    expect(n.notes).toHaveLength(1);
    expect(n.notes[0]).toMatchObject({ id: 'z', anchor: { type: 'free', id: '' }, quote: 'kept', body: 'body kept' });
  });
  it('a note with every optional field round-trips (state and Markdown)', () => {
    const s = seed();
    const f = s.notes.find((n) => n.id === 'f')!;
    expect(normalise(JSON.parse(JSON.stringify(s))).notes.find((n) => n.id === 'f')).toEqual(f);
    const back = fromMarkdown(toMarkdown(s, idx, { title: 'T', slug: 'x', date: '2026-11-24' })).find((n) => n.id === 'f')!;
    expect(back).toEqual(f);
  });
  it('parses data-note-anchor values, ids with colons included', () => {
    expect(parseAnchor('row:fig-gastric:1')).toEqual({ type: 'row', id: 'fig-gastric:1' });
    expect(parseAnchor('recipe:gyngener')).toEqual({ type: 'recipe', id: 'gyngener' });
    expect(parseAnchor('page:/methods')).toEqual({ type: 'page', id: '/methods' });
    expect(parseAnchor('claim:C0001')).toBeNull();
  });
  it('resolves this app\'s kinds', () => {
    expect(resolveAnchor({ type: 'synthesis', id: 'syn-15-from-rhizome-to-kitchen-1' }, idx)).toMatchObject({ ok: true, section: '15-from-rhizome-to-kitchen', to: '/read#syn-15-from-rhizome-to-kitchen-1' });
    expect(resolveAnchor({ type: 'recipe', id: 'gyngener' }, idx)).toMatchObject({ ok: true, label: 'recipe: Gyngener (a ginger sauce)', to: '/recipes/gyngener' });
    expect(resolveAnchor({ type: 'row', id: 'fig-gastric:1' }, idx)).toMatchObject({ ok: true, to: '/figures/fig-gastric' });
    expect(resolveAnchor({ type: 'page', id: '/methods', heading: 'verification' }, idx)).toMatchObject({ ok: true, label: 'page Methods', to: '/methods#verification' });
    expect(resolveAnchor({ type: 'page', id: '/no-such-page' }, idx).ok).toBe(false);
  });
});

describe('Markdown export', () => {
  it('puts body notes by section in reading order, then the other surfaces in nav order, and round-trips', () => {
    const s = seed();
    const md = toMarkdown(s, idx, { title: 'T', slug: 'x', date: '2026-11-24', app: 'Spread Life: Ginger Explorer' });
    expect(md).toContain('from Spread Life: Ginger Explorer (x)');
    const order = ['## Abstract', '## §8 Nausea and vomiting', '## §15 From rhizome to kitchen', '## Glossary', '## 101s', '## Figures', '## References', '## Recipes', '## Other pages'].map((h) => md.indexOf(`${h}\n`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(md).toContain('> agree on nausea and disagree on vomiting\n\nSeverity vs incidence?');
    const key = (xs: Note[]) => xs.map((n) => [n.id, n.anchor, n.body, n.route]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    expect(key(fromMarkdown(md))).toEqual(key(s.notes));
  });
  it('places a note by where it was taken, falling back to its anchor kind', () => {
    const sur = Object.fromEntries(seed().notes.map((n) => [n.id, surfaceOf(n)]));
    expect(sur).toEqual({ a: 'paper', b: 'paper', c: 'references', d: 'recipes', e: 'concepts', f: 'paper', g: 'other', h: 'figures', i: 'paper', j: 'glossary' });
  });
  it('a plain Markdown file without note markers imports as one unanchored note', () => {
    expect(fromMarkdown('just some text')).toMatchObject([{ anchor: { type: 'free', id: '' }, body: 'just some text' }]);
  });
});

describe('notes survive a content rebuild', () => {
  it('a recipe that disappears keeps its note, reported as orphaned', () => {
    const g = groupBySection(seed(), { ...idx, recipes: new Map() });
    expect(g.find((x) => x.key === '_orphan')!.notes.map((n) => n.id)).toEqual(['d']);
  });
  it('a rebuild that adds sections and recipes leaves every note resolvable', () => {
    const bigger: AnchorIndex = { ...idx, sections: [...idx.sections, { id: '19-new', title: '19. New', number: '19' }], recipes: new Map([...idx.recipes, ['new', { title: 'New', sections: [] }]]) };
    for (const n of seed().notes) expect(resolveAnchor(n.anchor, bigger).ok).toBe(true);
  });
});
