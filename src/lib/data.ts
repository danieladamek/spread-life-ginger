import manifestJson from '@/data/manifest.json';
import provenanceJson from '@/data/provenance.json';
import conceptsIndexJson from '@/data/concepts-index.json';
import figuresIndexJson from '@/data/figures-index.json';
import sectionsIndexJson from '@/data/sections-index.json';
import recipesIndexJson from '@/data/recipes-index.json';
import type { ConceptMeta, FigureMeta, SectionMeta } from '@/types';

/*
 * Only slim indexes ride in the first chunk. Full files (sections, references, concepts, figures, glossary,
 * recipes, scope) are imported by the routes that need them (src/lib/heavy.ts).
 */
export const manifest = manifestJson;
export const provenance = provenanceJson;
export const conceptsIndex = conceptsIndexJson as unknown as ConceptMeta[];
export const figuresIndex = figuresIndexJson as unknown as FigureMeta[];
export const sectionsIndex = sectionsIndexJson as unknown as SectionMeta[];
export const recipesIndex = recipesIndexJson as unknown as { id: string; title: string; kind: 'culinary' | 'medicinal'; date: string; place: string }[];

const conceptById = new Map(conceptsIndex.map((c) => [c.id, c]));
const figureById = new Map(figuresIndex.map((f) => [f.id, f]));
const sectionById = new Map(sectionsIndex.map((s) => [s.id, s]));
const recipeById = new Map(recipesIndex.map((r) => [r.id, r]));

export const getConcept = (id?: string | null) => (id ? conceptById.get(id) : undefined);
export const getFigure = (id?: string | null) => (id ? figureById.get(id) : undefined);
export const getSection = (id?: string | null) => (id ? sectionById.get(id) : undefined);
export const getRecipe = (id?: string | null) => (id ? recipeById.get(id) : undefined);

export function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  return base + rel.replace(/^\//, '');
}
export const doiUrl = (doi: string) => (/^https?:/.test(doi) ? doi : `https://doi.org/${doi}`);

export const sectionTitle = (id: string) => getSection(id)?.title ?? getFigure(id)?.label ?? id;
export const shortSectionTitle = (s: { title: string }) => s.title.replace(/^\d+(\.\d+)*\.?\s+/, '');
export const sectionLabel = (id: string) => { const s = getSection(id); return s ? (s.number ? `§${s.number}` : s.title) : id; };
export const SLUG = manifest.slug;

/** The `as_of` date, written out ("24 November 2026"). */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export const AS_OF = longDate(String(manifest.as_of));

/** Section 10 (safety) — linked from every health section and from /recipes (KICKOFF §8.4). */
export const SAFETY_SECTION = sectionsIndex.find((s) => s.number === '10')?.id ?? null;
/** The health strand: the sections of Part III, read from the review's own part structure. */
export const HEALTH_PART = sectionsIndex.find((s) => s.part && /health/i.test(s.title))?.id ?? null;
export const HEALTH_SECTIONS = new Set(sectionsIndex.filter((s) => HEALTH_PART && s.in_part === HEALTH_PART).map((s) => s.id));

export const TIER_ORDER = ['seminal', 'classic', 'current', 'background'] as const;
/** What each tier means (CONTENT-PACK, references under mode: topic) — shown at the head of each group. */
export const TIER_NOTE: Record<string, string> = {
  seminal: 'The cross-cutting canon: work that founded or redirected the field. Oldest first, so the history reads forward.',
  classic: 'Older primary studies the later literature leans on, but which did not found the field.',
  current: `Work in the scope's current window${manifest.counts.current_from ? ` (${manifest.counts.current_from} onward)` : ''}. Newest first.`,
  background: 'Monographs, guidelines, regulatory documents and reference sources.',
};
export const TIER_LABEL: Record<string, string> = { seminal: 'Seminal', classic: 'Classic', current: 'Current', background: 'Background' };

/** The strand a section belongs to, for the palette chips (manifest.palette.groups). */
export const GROUP_COLOURS: Record<string, string> = manifest.palette.groups;
