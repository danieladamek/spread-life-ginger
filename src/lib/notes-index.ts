import { conceptsIndex, figuresIndex, sectionsIndex } from '@/lib/data';
import { loadGlossary, loadRecipes, loadReferences, loadSynthesis } from '@/lib/heavy';
import { pageLabel } from '@/lib/routes';
import type { AnchorIndex } from '@/lib/notepad';

let cached: Promise<AnchorIndex> | null = null;
/**
 * The ids notes can anchor to, from the current build. Built lazily (references, the glossary, synthesis passages
 * and recipes are separate chunks). Rows come from figures-index (each row's first field); pages from the route table.
 */
export function loadAnchorIndex(): Promise<AnchorIndex> {
  if (!cached) cached = Promise.all([loadReferences(), loadGlossary(), loadSynthesis(), loadRecipes()]).then(([refs, glossary, syn, recipes]) => ({
    sections: sectionsIndex.filter((s) => !s.part).map((s) => ({ id: s.id, title: s.title, number: s.number })),
    synthesis: new Map(syn.map((y) => [y.id, { section: y.section }])),
    recipes: new Map(recipes.recipes.map((r) => [r.id, { title: r.title, sections: r.links.sections }])),
    refs: new Map(refs.map((r) => [r.n, { citation: r.citation, sections: r.cited_in_actual }])),
    concepts: new Map(conceptsIndex.map((u) => [u.id, { title: u.title, sections: [] as string[] }])),
    terms: new Map(glossary.map((g) => [g.id, { term: g.term, sections: g.appears_in }])),
    figures: new Map(figuresIndex.map((f) => [f.id, { label: `${f.label}: ${f.title}`, sections: f.discussed_in }])),
    rows: new Map(figuresIndex.flatMap((f) => f.row_labels.map((cell, i) => [`${f.id}:${i}`, { figure: f.id, label: `${f.label}, row ${i + 1} (${cell})` }] as const))),
    page: pageLabel,
  }));
  return cached;
}
