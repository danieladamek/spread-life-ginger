/** Shapes of the generated src/data/*.json (scripts/build-content.ts). */

export type BlockMarker = 'framing' | 'synthesis' | null;
export type Chunk =
  | { kind: 'md'; md: string; hasMath: boolean; marker: BlockMarker; id: string | null; synthesis: string[]; index: number }
  | { kind: 'figure'; id: string };

export interface Section {
  id: string; title: string; depth: number; number: string | null; part: boolean;
  words: number; terms: string[]; cites: number[]; figures: string[]; chunks: Chunk[];
  blocks: number; cited_blocks: number; framing_blocks: number; synthesis_blocks: number;
}
export interface SectionMeta { id: string; title: string; depth: number; number: string | null; words: number; part: boolean; in_part: string | null }
export interface SynthesisPassage { id: string; section: string; excerpt: string; words: number }

export interface TermShort { id: string; term: string; kind: string; short: string; concept: string | null }
export interface GlossaryEntry extends TermShort {
  variants: string[]; definition: string; see: string[]; sources: (string | number)[]; appears_in: string[]; figures: string[]; units: string[];
  in_review: boolean; recipes: string[]; source_refs: number[]; source_links: string[];
}

export interface ConceptSection { heading: string; key: string; md: string; hasMath: boolean; cites: number[] }
export interface ConceptMeta { id: string; title: string; one_liner: string }
export interface Concept extends ConceptMeta {
  why_here: string; why_here_md: string; why_sections: string[]; prerequisites: string[]; terms: string[]; figures: string[];
  further_reading: { title: string; url: string; kind?: string }[];
  words: number; sections: ConceptSection[]; summary_md: string; from_terms: string[]; from_figures: string[]; cites: number[]; has_diagram: boolean;
}

export interface Explain { on?: string; text: string; concept?: string; term?: string }
export interface Axis { field: string; label: string; unit?: string }
export interface FigureMeta { id: string; label: string; title: string; kind: string; synthesis: 'data' | 'conceptual'; refs: number[]; concepts: string[]; discussed_in: string[]; row_labels: string[] }
export type Cell = string | number | null;
export interface Figure extends Omit<FigureMeta, 'row_labels'> {
  chart?: { type: string; x: Axis; y: Axis; series?: string; ci?: string[]; log?: boolean };
  data: string | null; caption: string; how_to_read: string; explain: Explain[]; source: string;
  caption_md: string; how_md: string; source_md: string;
  rows: Record<string, Cell>[]; fields: string[];
  image?: string; hotspots?: { x: number; y: number; w: number; h: number; text: string; term?: string }[];
}

export interface Reference {
  n: number; tier: 'seminal' | 'classic' | 'current' | 'background'; anchor: boolean; citation: string; year: number;
  doi?: string; url?: string; summary: string; why_it_mattered?: string; role_here: string; role_note: string;
  cited_in: string[]; cited_in_actual: string[]; verified: boolean; verified_level?: string;
  in_review: boolean; in_concepts: string[]; in_glossary: string[]; in_figures: string[]; in_recipes: string[];
}

export interface Recipe {
  id: string; title: string; kind: 'culinary' | 'medicinal'; date: string; place: string; source_ref: number; source_note: string;
  original_text: string | null; original_language?: string; gloss: string; gloss_by: string; ingredients: string[];
  ginger_form: string; heated: boolean; links: { sections: string[]; compounds: string[]; terms: string[] };
  science_note: string; safety_note: string; science_md: string; safety_md: string; gloss_md: string;
  cites: number[]; compounds: { name: string; term: string | null }[]; terms: string[];
}
export interface RecipesFile { as_of?: string; status?: string; recipes: Recipe[] }

export interface BuildErrors {
  errors: string[]; warnings: string[];
  uncited: { section: string; words: number; excerpt: string }[];
  uncited_outside: { where: string; words: number; excerpt: string }[];
}
export interface TodoFile { pack: { where: string; what: string }[]; markers: { where: string; what: string }[] }
