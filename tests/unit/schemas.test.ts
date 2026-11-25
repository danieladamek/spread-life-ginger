import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFixture, edit, editYaml } from './helpers';

type Rec = Record<string, unknown>;
type Recipes = { recipes: Rec[] };

/**
 * The content build fails loudly: one deliberate error per rule, each with the right message (KICKOFF §5), on the
 * topic-min fixture pack. The pack is never repaired; every failure also writes content-pack/BUILD-ERRORS.md.
 */
describe('content build on the topic-min fixture pack', () => {
  it('builds the clean fixture with no errors and no report', () => {
    const r = buildFixture();
    expect(r.errors).toEqual([]);
    expect(r.code).toBe(0);
    expect(r.report).toBeNull();
  });

  const UNCITED = 'This sentence states a fact about the plant without any citation at all, and it is long enough to cross the twenty-five word line that the gate draws for prose.';
  const cases: [string, (d: string) => void, RegExp][] = [
    // manifest (CONTENT-PACK, manifest under mode: topic)
    ['a manuscript-mode manifest', (d) => editYaml<Rec>(d, 'manifest.yaml', (m) => { m.mode = 'manuscript'; }), /mode must be 'topic'/],
    ['a venue that implies peer review', (d) => editYaml<Rec>(d, 'manifest.yaml', (m) => { m.venue = 'Journal of Fixtures'; }), /venue must make the non-peer-reviewed status unmissable/],
    ['no as_of', (d) => editYaml<Rec>(d, 'manifest.yaml', (m) => { delete m.as_of; }), /manifest\.as_of: /],
    ['permissions.text unknown under pages', (d) => editYaml<Rec>(d, 'manifest.yaml', (m) => { (m.permissions as Rec).text = 'unknown'; }), /permissions\.text is 'unknown' — not allowed for delivery: pages/],
    // review.md (APP-SPEC §6.1)
    ['an uncited block of 25+ words', (d) => edit(path.join(d, 'review.md'), (s) => s.replace('## 2. The chemistry\n', `## 2. The chemistry\n\n${UNCITED}\n`)), /review: uncited block of \d+ words in 2-the-chemistry — cite it or mark it <!-- framing -->/],
    ['an unresolved [n]', (d) => edit(path.join(d, 'review.md'), (s) => s.replace('[1, 2]', '[1, 99]')), /review: citation \[99\] has no entry in references\.yaml/],
    ['a quotation longer than 25 words', (d) => edit(path.join(d, 'review.md'), (s) => s.replace('which a later', `“${Array(30).fill('word').join(' ')}” [2], which a later`)), /review: quotation longer than 25 words/],
    ['a figure marker with no figure', (d) => edit(path.join(d, 'review.md'), (s) => s.replace('<!-- figure: fig-a -->', '<!-- figure: fig-a -->\n\n<!-- figure: fig-zz -->')), /<!-- figure: fig-zz --> has no entry in figures\.yaml/],
    // references (topic tiers)
    ['a reference with no tier', (d) => editYaml<Rec[]>(d, 'references.yaml', (x) => { delete x[0].tier; }), /references\/1\.tier/],
    ['a seminal reference with no why_it_mattered', (d) => editYaml<Rec[]>(d, 'references.yaml', (x) => { delete x[0].why_it_mattered; }), /seminal reference needs why_it_mattered/],
    ['a reference with an unknown key', (d) => editYaml<Rec[]>(d, 'references.yaml', (x) => { x[1].rating = 5; }), /references\/2: unknown key\(s\) rating — the schema is closed/],
    // glossary / concepts
    ['an ambiguous term variant', (d) => editYaml<Rec[]>(d, 'glossary.yaml', (x) => { x[2].variants = ['gingerols']; }), /ambiguous variant "gingerols" claimed by gingerol, shogaol/],
    ['an unknown concept id', (d) => editYaml<Rec[]>(d, 'glossary.yaml', (x) => { x[0].concept = 'no-such-101'; }), /glossary\/rhizome: concept no-such-101 not in concepts\//],
    ['an unknown term id in a 101', (d) => edit(path.join(d, 'concepts', 'the-plant.md'), (s) => s.replace('terms: [rhizome, gingerol]', 'terms: [rhizome, gizmo]')), /concept the-plant: term gizmo not in glossary/],
    ['a popover text over 200 characters', (d) => editYaml<Rec[]>(d, 'glossary.yaml', (x) => { x[0].short = 'x'.repeat(201); }), /glossary\/rhizome\.short: short must be ≤ 200 chars/],
    // figures (topic mode)
    ['a figure with no refs', (d) => editYaml<Rec[]>(d, 'figures.yaml', (x) => { x[0].refs = []; }), /a figure with no references does not ship/],
    ['a figure with no synthesis kind', (d) => editYaml<Rec[]>(d, 'figures.yaml', (x) => { delete x[0].synthesis; }), /topic mode needs synthesis: data \| conceptual/],
    ['a missing data file', (d) => fs.rmSync(path.join(d, 'figures', 'data', 'fig-a.csv')), /figure fig-a: data file missing/],
    ['a chart field that is not in the data', (d) => editYaml<Rec[]>(d, 'figures.yaml', (x) => { ((x[0].chart as Rec).y as Rec).field = 'count'; }), /figure fig-a: chart field "count" is not a column/],
    ['a synthesis data csv with no ref column', (d) => edit(path.join(d, 'figures', 'data', 'fig-a.csv'), (s) => s.replace(/,ref$/m, '').replace(/,[12]$/gm, '')), /needs a 'ref' column so every row is traceable/],
    ['a data row citing a reference the figure does not list', (d) => editYaml<Rec[]>(d, 'figures.yaml', (x) => { x[0].refs = [1]; }), /figure fig-a: a row cites ref 2, which is not in the figure's refs/],
    ['a non-numeric value', (d) => edit(path.join(d, 'figures', 'data', 'fig-a.csv'), (s) => s.replace('One,Ginger,1.5,1', 'One,Ginger,fast,1')), /figure fig-a: value = "fast" is not a number/],
    // scope.yaml
    ['a scope with no queries', (d) => editYaml<Rec>(d, 'scope.yaml', (x) => { (x.search_strategy as Rec).queries = []; }), /scope\.search_strategy\.queries/],
    ['a scope with no boundary out', (d) => editYaml<Rec>(d, 'scope.yaml', (x) => { delete (x.boundary as Rec).out; }), /scope\.boundary\.out/],
    // recipes (KICKOFF §8.5)
    ['a recipe linking an unknown section', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { (x.recipes[0].links as Rec).sections = ['99-nowhere']; }), /recipes\/sauce: links\.sections 99-nowhere is not a section of review\.md/],
    ['a recipe citing an unknown [n]', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[0].science_note = 'Dried ginger has shogaols [7].'; }), /citation \[7\] has no entry in references\.yaml/],
    ['a recipe with a servings field', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[0].servings = 4; }), /recipes\/sauce: unknown key\(s\) servings — the schema is closed/],
    ['a recipe with a quantity field', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[1].dose = '2 g'; }), /recipes\/remedy: unknown key\(s\) dose — the schema is closed/],
    ['a recipe with an unknown source_ref', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[0].source_ref = 42; }), /recipes\/sauce: source_ref \[42\] has no reference entry/],
    ['a recipe compound that matches no term', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { (x.recipes[0].links as Rec).compounds = ['zingiberene']; }), /compound "zingiberene" matches no glossary term or variant/],
    // pack 0.2 fields (K45)
    ['a reference with an unknown read level', (d) => editYaml<Rec[]>(d, 'references.yaml', (x) => { x[0].verified_level = 'skimmed'; }), /references\/1\.verified_level/],
    ['a recipe with no tradition', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { delete x.recipes[0].tradition; }), /recipes\/sauce\.tradition: Required/],
    ['a recipe with neither an original text nor a gloss', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[0].original_text = null; x.recipes[0].gloss = ''; }), /recipes\/sauce: recipe has neither original_text nor gloss/],
    ['a declared table column that is not in the data', (d) => editYaml<Rec[]>(d, 'figures.yaml', (x) => { x[0].columns = [{ field: 'nope', label: 'Nope' }]; }), /figure fig-a: columns field "nope" is not a column/],
    ['a pathway edge of an unknown kind', (d) => addPathway(d, { kind: 'guessed' }), /figure fig-p data\.edges\.0\.kind/],
    ['a pathway edge citing a reference the figure does not list', (d) => addPathway(d, { refs: [2] }), /figure fig-p: edge a → b cites 2, which is not in the figure's refs/],
    ['a pathway edge naming a missing node', (d) => addPathway(d, { to: 'z' }), /figure fig-p: edge a → z names a node that does not exist/],
    ['a recipe with an unknown kind', (d) => editYaml<Recipes>(d, 'recipes.yaml', (x) => { x.recipes[1].kind = 'modern'; }), /recipes\/remedy\.kind/],
  ];
  for (const [name, mutate, message] of cases) {
    it(`fails on ${name}`, () => {
      const r = buildFixture(mutate);
      expect(r.code).toBe(1);
      expect(r.errors.join('\n')).toMatch(message);
      expect(r.report).toContain('# BUILD-ERRORS');
    });
  }

  it('reports uncited 101 prose as a warning, not repaired', () => {
    const r = buildFixture((d) => edit(path.join(d, 'concepts', 'the-plant.md'), (s) => s.replace('## What it is\n', `## What it is\n${UNCITED}\n\n`)));
    expect(r.code).toBe(0);
    expect(r.warnings.join('\n')).toMatch(/concept the-plant: uncited block of \d+ words/);
  });
});

/** Adds a two-node pathway figure (fig-p, refs [1]) whose single edge is overridden by `edge`. */
function addPathway(d: string, edge: Rec) {
  editYaml<Rec[]>(d, 'figures.yaml', (x) => {
    x.push({ id: 'fig-p', label: 'Figure 9', title: 'A path', kind: 'pathway', synthesis: 'conceptual', refs: [1], data: 'figures/data/fig-p.json', caption: 'A path.', how_to_read: 'Follow the arrow.', source: 'Drawn by the builder.' });
  });
  const g = { id: 'fig-p', nodes: [{ id: 'a', kind: 'precursor', label: 'A', col: 0, row: 0, refs: [1] }, { id: 'b', kind: 'product', label: 'B', col: 1, row: 0, refs: [1] }], edges: [{ from: 'a', to: 'b', kind: 'shown', refs: [1], ...edge }] };
  fs.writeFileSync(path.join(d, 'figures', 'data', 'fig-p.json'), JSON.stringify(g));
}
