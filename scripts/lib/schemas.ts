/**
 * zod schemas mirroring docs/CONTENT-PACK.md (topic mode) and tools/validate_pack.py, plus this app's extension
 * file recipes.yaml (KICKOFF §8.5). Shape errors come from zod; cross-file rules (ids that must resolve, citation
 * coverage, the quotation rule) live in scripts/build-content.ts.
 *
 * Every record is closed (`.strict()`), so a typo'd key fails loudly instead of being silently ignored. The
 * bookkeeping keys this pack actually carries (verified_level, candidate_n, extensions, safety_profile…) are listed
 * explicitly. scope.yaml is the exception: it is published content rendered on /methods, and its long tail of
 * keys (presweep, assumptions, history_sources_rule…) is rendered as written, so it is passthrough beyond the
 * required keys.
 */
import { z } from 'zod';

const kebab = z.string().regex(/^[a-z0-9-]+$/, 'must be kebab-case');
const dateish = z.union([z.string(), z.date()]).transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb colour');

export const Manifest = z.object({
  mode: z.literal('topic', { errorMap: () => ({ message: "mode must be 'topic' — this app renders a commissioned review (KICKOFF §8.1)" }) }),
  slug: kebab,
  title: z.string().min(1),
  short_title: z.string().min(1),
  question: z.string().min(1, 'question is REQUIRED in topic mode'),
  purpose: z.enum(['orientation', 'direction', 'teaching', 'grant-background']),
  as_of: dateish,
  authors: z.array(z.string()).min(1),
  venue: z.string().min(1).refine((v) => /not peer[- ]reviewed/i.test(v), 'venue must make the non-peer-reviewed status unmissable'),
  year: z.number().int(),
  plain_abstract: z.string().min(1),
  reading_minutes: z.number().default(30),
  audience: z.string().optional(),
  palette: z.object({ groups: z.record(hex).default({}) }).strict().default({}),
  permissions: z.object({ text: z.string().min(1, 'permissions.text is REQUIRED'), figures: z.string().min(1) }).strict(),
  delivery: z.enum(['local', 'pages', 'private']),
  builder: z.object({ name: z.string(), version: z.string(), date: dateish }).strict(),
  github_account: z.string(),
  notes_storage: z.enum(['file', 'browser']).default('file'),
  concept_self_checks: z.boolean().default(false),
  link_every_occurrence: z.boolean().default(false),
  safety_profile: z.enum(['general', 'health', 'crisis-adjacent']).default('general'),
  extensions: z.object({ recipes: z.string().optional() }).strict().default({}),
  verification_level: z.string().optional(),
}).strict().superRefine((m, ctx) => {
  if (m.delivery === 'pages' && /^\s*unknown\s*$/i.test(m.permissions.text)) ctx.addIssue({ code: 'custom', path: ['permissions', 'text'], message: "permissions.text is 'unknown' — not allowed for delivery: pages" });
});
export type Manifest = z.infer<typeof Manifest>;

export const Scope = z.object({
  topic: z.string().min(1),
  question: z.string().min(1),
  purpose: z.string().optional(),
  boundary: z.object({ in: z.array(z.string()).min(1), out: z.array(z.string()).min(1), rationale: z.string().optional() }).strict(),
  time_window: z.object({ current_from: z.number().int(), seminal: z.string() }).passthrough(),
  depth: z.enum(['brief', 'standard', 'deep', 'textbook']),
  interview: z.array(z.object({ q: z.string(), answer: z.string(), asked: dateish.optional() }).passthrough()).default([]),
  search_strategy: z.object({
    run_on: dateish,
    sources: z.array(z.string()).min(1),
    queries: z.array(z.object({ q: z.string(), source: z.string(), hits: z.number().int().nullable(), kept: z.number().int().nullable().optional() }).passthrough()).min(1),
  }).passthrough(),
  corpus_profile: z.object({ by_tier: z.record(z.number()) }).passthrough(),
}).passthrough();
export type Scope = z.infer<typeof Scope>;

export const GlossaryEntry = z.object({
  id: kebab,
  term: z.string().min(1),
  kind: z.enum(['science', 'methods', 'statistics', 'notation', 'drug']),
  variants: z.array(z.string()).default([]),
  short: z.string().min(1).max(200, 'short must be ≤ 200 chars'),
  definition: z.string().min(1),
  concept: z.string().optional().nullable(),
  see: z.array(z.string()).default([]),
  sources: z.array(z.union([z.number().int(), z.string()])).default([]),
}).strict();
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

export const TIERS = ['seminal', 'classic', 'current', 'background'] as const;
export const ROLES = ['support', 'method', 'contrast', 'prior-result', 'data-source', 'background', 'guideline', 'review', 'consensus'] as const;
export const Reference = z.object({
  n: z.number().int().positive(),
  tier: z.enum(TIERS, { errorMap: (i, c) => ({ message: i.code === 'invalid_enum_value' ? `tier '${String(c.data)}' not in ${TIERS.join(', ')}` : c.defaultError }) }),
  anchor: z.boolean().default(false),
  citation: z.string().min(1),
  year: z.number().int(),
  doi: z.string().optional(),
  url: z.string().optional(),
  summary: z.string().optional().default(''),
  why_it_mattered: z.string().optional(),
  role_here: z.enum(ROLES),
  role_note: z.string().optional().default(''),
  cited_in: z.array(z.string()).default([]),
  verified: z.boolean(),
  verified_level: z.string().optional(),
  candidate_n: z.number().int().optional(),
}).strict().superRefine((r, ctx) => {
  if (!r.doi && !r.url) ctx.addIssue({ code: 'custom', message: 'doi or url required' });
  if (!r.summary.trim() && r.verified) ctx.addIssue({ code: 'custom', message: 'verified reference with no summary' });
  if (r.tier === 'seminal' && !r.why_it_mattered?.trim()) ctx.addIssue({ code: 'custom', message: 'seminal reference needs why_it_mattered' });
});
export type Reference = z.infer<typeof Reference>;

const Explain = z.object({ on: z.string().optional(), text: z.string(), concept: z.string().optional(), term: z.string().optional() }).strict();
const Axis = z.object({ field: z.string(), label: z.string(), unit: z.string().optional() }).strict();
export const CHART_TYPES = ['line', 'bar', 'grouped-bar', 'stacked-bar', 'scatter', 'area', 'step', 'box', 'heatmap', 'forest'] as const;

export const Figure = z.object({
  id: kebab,
  label: z.string(),
  title: z.string(),
  kind: z.enum(['chart', 'table', 'network', 'pathway', 'image']),
  synthesis: z.enum(['data', 'conceptual'], { errorMap: () => ({ message: 'topic mode needs synthesis: data | conceptual' }) }),
  refs: z.array(z.number().int()).min(1, 'refs: [n, …] is REQUIRED — a figure with no references does not ship'),
  chart: z.object({ type: z.enum(CHART_TYPES), x: Axis, y: Axis, series: z.string().optional(), ci: z.array(z.string()).optional(), log: z.boolean().optional() }).strict().optional(),
  data: z.string().optional(),
  image: z.string().optional(),
  hotspots: z.array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), text: z.string(), term: z.string().optional() }).strict()).optional(),
  caption: z.string(),
  how_to_read: z.string(),
  explain: z.array(Explain).default([]),
  concepts: z.array(z.string()).default([]),
  discussed_in: z.array(z.string()).default([]),
  source: z.string().min(1),
}).strict().superRefine((f, ctx) => {
  if (['chart', 'table', 'network', 'pathway'].includes(f.kind) && !f.data) ctx.addIssue({ code: 'custom', message: `${f.kind} needs data` });
  if (f.kind === 'chart' && !f.chart) ctx.addIssue({ code: 'custom', message: 'chart needs chart: {type, x, y}' });
  if (f.kind === 'image' && !f.image) ctx.addIssue({ code: 'custom', message: 'image needs image:' });
});
export type Figure = z.infer<typeof Figure>;

export const ConceptFront = z.object({
  id: kebab,
  title: z.string(),
  one_liner: z.string(),
  why_here: z.string(),
  prerequisites: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  figures: z.array(z.string()).default([]),
  further_reading: z.array(z.object({ title: z.string(), url: z.string(), kind: z.string().optional() }).strict()).min(2, 'needs ≥ 2 further_reading'),
  self_check: z.array(z.unknown()).optional(),
}).strict();
export type ConceptFront = z.infer<typeof ConceptFront>;

export const Todo = z.array(z.object({ where: z.string(), what: z.string() }).strict());

/** recipes.yaml — KICKOFF §8.5. No field may carry a quantity, a serving, a timing or a method step of the
 * builder's own; the schema is closed so one cannot be smuggled in under a new key. */
export const RECIPE_KEYS = ['id', 'title', 'kind', 'date', 'place', 'source_ref', 'source_note', 'original_text', 'original_language', 'gloss', 'gloss_by', 'ingredients', 'ginger_form', 'heated', 'links', 'science_note', 'safety_note'] as const;
export const Recipe = z.object({
  id: kebab,
  title: z.string().min(1),
  kind: z.enum(['culinary', 'medicinal']),
  date: z.string().min(1),
  place: z.string().min(1),
  source_ref: z.number().int(),
  source_note: z.string().min(1),
  original_text: z.string().nullable().optional(),
  original_language: z.string().optional(),
  gloss: z.string().min(1),
  gloss_by: z.string().min(1),
  ingredients: z.array(z.string()).min(1),
  ginger_form: z.string().min(1),
  heated: z.boolean(),
  links: z.object({ sections: z.array(z.string()).default([]), compounds: z.array(z.string()).default([]), terms: z.array(z.string()).default([]) }).strict(),
  science_note: z.string().min(1),
  safety_note: z.string().min(1),
}).strict().superRefine((r, ctx) => {
  if (r.original_text && !r.original_language) ctx.addIssue({ code: 'custom', message: 'original_text needs original_language' });
});
export type Recipe = z.infer<typeof Recipe>;
export const RecipesFile = z.object({ as_of: dateish.optional(), status: z.string().optional(), recipes: z.array(z.unknown()) }).strict();

/** Format zod issues as one line each, prefixed with the file and record. */
export function zodErrors(where: string, err: z.ZodError): string[] {
  return err.issues.map((i) => {
    const path = i.path.length ? `.${i.path.join('.')}` : '';
    const msg = i.code === 'unrecognized_keys' ? `unknown key(s) ${(i as z.ZodIssue & { keys: string[] }).keys.join(', ')} — the schema is closed` : i.message;
    return `${where}${path}: ${msg}`;
  });
}
