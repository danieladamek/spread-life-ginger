/**
 * The notepad (APP-SPEC v0.8 §3.1): the reader's own notes, each hung on anything the app renders, on any route.
 * Pure state + serialisation, so it is unit-tested and survives content rebuilds: notes are keyed to stable ids
 * (section ids, synthesis ids, [12], concept ids, term ids, figure ids, fig-gastric:3, recipe ids, route paths)
 * and an anchor that disappears from the pack is kept and reported as orphaned — never dropped.
 *
 * Ported from ptsd-inflammation-critique via traumatic-stress-concepts (which added "notes from anywhere"):
 * - Anchor kinds: this app's objects (review section, synthesis passage, reference, 101, term, figure, figure/table
 *   row, recipe) plus `page` — the route itself, with the nearest heading — so nothing is un-anchorable. The lens
 *   kinds of the reference app (claim, annotation, atlas entry/construct) do not exist here; a note saved with one
 *   is kept as unanchored, never dropped.
 * - A note can carry where it was taken (`route`), ~32 characters either side of its quote (`prefix`, `suffix`)
 *   for re-finding the passage, and `within` when it was taken inside a popover or fold-out (which trigger opens it,
 *   and the anchor that trigger sits in), so returning to the note can reopen it.
 * - Every new field is optional: a state saved before this change loads, and round-trips, unchanged.
 *
 * Every note is typed by the reader; the app writes none of them.
 */

export type AnchorType = 'section' | 'synthesis' | 'ref' | 'concept' | 'term' | 'figure' | 'row' | 'recipe' | 'page' | 'free';
export const ANCHOR_TYPES: AnchorType[] = ['section', 'synthesis', 'ref', 'concept', 'term', 'figure', 'row', 'recipe', 'page', 'free'];
export interface Anchor { type: AnchorType; id: string; heading?: string }
/** A popover or fold-out the note was taken in: the `data-note-opener` of its trigger, and the anchor the trigger sits in. */
export interface Within { kind: 'popover' | 'foldout'; opener: string; host?: string }
export interface Note {
  id: string; anchor: Anchor; quote?: string; body: string; created: string; updated: string;
  route?: string; prefix?: string; suffix?: string; within?: Within;
}
export interface NotepadState { version: 2; notes: Note[] }

export const emptyNotepad = (): NotepadState => ({ version: 2, notes: [] });

type NewNote = Omit<Note, 'id' | 'created' | 'updated'> & { id?: string; created?: string };
export type NotepadAction =
  | { type: 'add'; note: NewNote }
  | { type: 'update'; id: string; body?: string; anchor?: Anchor; quote?: string }
  | { type: 'remove'; id: string }
  | { type: 'replace'; state: NotepadState }
  | { type: 'merge'; notes: Note[] }
  | { type: 'clear' };

let counter = 0;
export function newId(now = Date.now()): string {
  counter = (counter + 1) % 1e6;
  return `n-${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Drop undefined optional fields, so a note without them serialises exactly as it did before they existed. */
function tidy(n: Note): Note {
  const out = { ...n } as Record<string, unknown>;
  for (const k of ['quote', 'route', 'prefix', 'suffix', 'within']) if (out[k] === undefined) delete out[k];
  if (n.anchor.heading === undefined) out.anchor = { type: n.anchor.type, id: n.anchor.id };
  return out as unknown as Note;
}

export function reducer(state: NotepadState, action: NotepadAction, now: () => string = () => new Date().toISOString()): NotepadState {
  switch (action.type) {
    case 'add': {
      const t = now();
      const { id, created, ...rest } = action.note;
      const note = tidy({ ...rest, id: id ?? newId(), created: created ?? t, updated: t });
      return { ...state, notes: [...state.notes, note] };
    }
    case 'update':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? tidy({ ...n, body: action.body ?? n.body, anchor: action.anchor ?? n.anchor, quote: action.quote ?? n.quote, updated: now() }) : n)) };
    case 'remove':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case 'replace':
      return normalise(action.state);
    case 'merge': {
      const byId = new Map(state.notes.map((n) => [n.id, n]));
      for (const n of normalise({ notes: action.notes }).notes) {
        const prev = byId.get(n.id);
        if (!prev || prev.updated < n.updated) byId.set(n.id, n);
      }
      return { ...state, notes: [...byId.values()] };
    }
    case 'clear':
      return emptyNotepad();
  }
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** Accept anything that looks like a saved state (v2), or a v1 single-text notepad, and return a valid v2 state. */
export function normalise(raw: unknown): NotepadState {
  if (!raw || typeof raw !== 'object') return emptyNotepad();
  const r = raw as { version?: number; notes?: unknown; text?: unknown };
  if (Array.isArray(r.notes)) {
    const notes = r.notes.filter((n): n is Note => !!n && typeof n === 'object' && typeof (n as Note).id === 'string' && typeof (n as Note).body === 'string' && !!(n as Note).anchor)
      .map((n) => {
        const t = (n.anchor.type as string) === 'unit' ? 'concept' : n.anchor.type;
        const known = ANCHOR_TYPES.includes(t);
        const w = n.within as Partial<Within> | undefined;
        return tidy({
          ...n,
          // An unknown anchor kind becomes free — the note, its quote and its body are kept.
          anchor: { type: (known ? t : 'free') as AnchorType, id: known ? String(n.anchor.id ?? '') : '', heading: known ? str(n.anchor.heading) : undefined },
          quote: str(n.quote), route: str(n.route), prefix: str(n.prefix), suffix: str(n.suffix),
          within: w && (w.kind === 'popover' || w.kind === 'foldout') && typeof w.opener === 'string' ? { kind: w.kind, opener: w.opener, ...(typeof w.host === 'string' ? { host: w.host } : {}) } : undefined,
        });
      });
    return { version: 2, notes };
  }
  if (typeof r.text === 'string' && r.text.trim()) {
    const t = new Date().toISOString();
    return { version: 2, notes: [{ id: newId(), anchor: { type: 'free', id: '' }, body: r.text, created: t, updated: t }] };
  }
  return emptyNotepad();
}

/** `data-note-anchor` values are `<kind>:<id>`; ids may contain colons (`row:tab1:3`). */
export function parseAnchor(s: string): Anchor | null {
  const i = s.indexOf(':');
  if (i < 1) return null;
  const type = s.slice(0, i) as AnchorType;
  if (!ANCHOR_TYPES.includes(type) || type === 'free') return null;
  return { type, id: s.slice(i + 1) };
}
export const anchorString = (a: Anchor) => `${a.type}:${a.id}`;

// ------------------------------------------------------------------------------------------ surfaces
/** Where in the app a note lives, in nav order after the paper (APP-SPEC §3.1 export order). */
export const SURFACES = ['paper', 'glossary', 'concepts', 'figures', 'references', 'recipes', 'other'] as const;
export type Surface = (typeof SURFACES)[number];
export const SURFACE_LABEL: Record<Surface, string> = { paper: 'The review', glossary: 'Glossary', concepts: '101s', figures: 'Figures', references: 'References', recipes: 'Recipes', other: 'Other pages' };

export function surfaceOfPath(path: string): Surface {
  const p = path.split(/[?#]/)[0];
  if (p === '/read') return 'paper';
  for (const [prefix, s] of [['/glossary', 'glossary'], ['/concepts', 'concepts'], ['/figures', 'figures'], ['/references', 'references'], ['/recipes', 'recipes']] as const) if (p === prefix || p.startsWith(`${prefix}/`)) return s;
  return 'other';
}
const SURFACE_OF_KIND: Partial<Record<AnchorType, Surface>> = { section: 'paper', synthesis: 'paper', term: 'glossary', concept: 'concepts', figure: 'figures', row: 'figures', ref: 'references', recipe: 'recipes' };
/** A note's surface: where it was taken, if recorded; otherwise the natural home of its anchor kind. */
export function surfaceOf(n: Note): Surface {
  if (n.route) return surfaceOfPath(n.route);
  if (n.anchor.type === 'page') return surfaceOfPath(n.anchor.id);
  return SURFACE_OF_KIND[n.anchor.type] ?? 'other';
}

// ------------------------------------------------------------------------------------------ resolving anchors
export interface AnchorIndex {
  sections: { id: string; title: string; number: string | null }[];   // reading order
  synthesis: Map<string, { section: string }>;
  recipes: Map<string, { title: string; sections: string[] }>;
  refs: Map<number, { citation: string; sections: string[] }>;
  concepts: Map<string, { title: string; sections: string[] }>;
  terms: Map<string, { term: string; sections: string[] }>;
  figures: Map<string, { label: string; sections: string[] }>;
  rows: Map<string, { figure: string; label: string }>;
  /** The route table: a label for a path the router serves, or null. */
  page: (path: string) => string | null;
}

export interface ResolvedAnchor { ok: boolean; label: string; kind: string; section: string | null; to: string }

const KIND_LABEL: Record<AnchorType, string> = { section: 'section', synthesis: 'synthesis passage', ref: 'reference', concept: '101', term: 'term', figure: 'figure', row: 'figure row', recipe: 'recipe', page: 'page', free: 'unanchored' };

export function resolveAnchor(a: Anchor, idx: AnchorIndex): ResolvedAnchor {
  const kind = KIND_LABEL[a.type];
  const secTitle = (id: string) => { const s = idx.sections.find((x) => x.id === id); return s ? (s.number ? `§${s.number}` : s.title) : id; };
  const inPaper = (xs: string[]) => xs.find((s) => idx.sections.some((x) => x.id === s)) ?? null;
  const R = (ok: boolean, label: string, section: string | null, to: string): ResolvedAnchor => ({ ok, label, kind, section, to });
  switch (a.type) {
    case 'section': {
      const s = idx.sections.find((x) => x.id === a.id);
      return R(!!s, s ? `section ${s.number ? `§${s.number} ` : ''}${s.title.replace(/^\d+(\.\d+)*\.?\s+/, '')}` : `section ${a.id}`, s ? s.id : null, `/read#${a.id}`);
    }
    case 'synthesis': {
      const y = idx.synthesis.get(a.id);
      return R(!!y, y ? `synthesis passage in ${secTitle(y.section)}` : `synthesis ${a.id}`, y?.section ?? null, `/read#${a.id}`);
    }
    case 'recipe': {
      const r = idx.recipes.get(a.id);
      return R(!!r, r ? `recipe: ${r.title}` : `recipe ${a.id}`, null, `/recipes/${a.id}`);
    }
    case 'ref': {
      const r = idx.refs.get(Number(a.id));
      return R(!!r, `reference [${a.id}]`, r ? inPaper(r.sections) : null, `/references#ref-${a.id}`);
    }
    case 'concept': {
      const u = idx.concepts.get(a.id);
      return R(!!u, u ? `101: ${u.title}` : `101 ${a.id}`, u ? inPaper(u.sections) : null, `/concepts/${a.id}`);
    }
    case 'term': {
      const t = idx.terms.get(a.id);
      return R(!!t, t ? `term ${t.term}` : `term ${a.id}`, t ? inPaper(t.sections) : null, `/glossary#${a.id}`);
    }
    case 'figure': {
      const f = idx.figures.get(a.id);
      return R(!!f, f ? f.label : `figure ${a.id}`, f ? inPaper(f.sections) : null, `/figures/${a.id}`);
    }
    case 'row': {
      const r = idx.rows.get(a.id);
      return R(!!r, r ? r.label : `figure row ${a.id}`, null, `/figures/${r?.figure ?? a.id.split(':')[0]}`);
    }
    case 'page': {
      const label = idx.page(a.id);
      return R(!!label, label ? `page ${label}` : `page ${a.id}`, null, `${a.id}${a.heading ? `#${a.heading}` : ''}`);
    }
    default:
      return R(true, 'unanchored', null, '/notes');
  }
}

export interface NoteGroup { key: string; title: string; notes: (Note & { resolved: ResolvedAnchor; surface: Surface })[] }

/**
 * Notes for export and /notes: body notes by section in reading order, then the other surfaces in nav order
 * (Glossary, 101s, Figures, References, Recipes, other pages), then unanchored, then orphaned anchors.
 * A note is a body note when it was taken on /read (or, for notes saved before routes were recorded, when its
 * anchor is a section or a synthesis passage); a body note with no section of its own goes with the review's other notes.
 */
export function groupBySection(state: NotepadState, idx: AnchorIndex): NoteGroup[] {
  const groups = new Map<string, NoteGroup>();
  for (const s of idx.sections) groups.set(s.id, { key: s.id, title: s.number ? `§${s.number} ${s.title.replace(/^\d+(\.\d+)*\.?\s+/, '')}` : s.title, notes: [] });
  const bySurface = new Map<Surface, NoteGroup>(SURFACES.map((s) => [s, { key: `_s-${s}`, title: s === 'paper' ? 'The review (no section)' : SURFACE_LABEL[s], notes: [] }]));
  const free: NoteGroup = { key: '_free', title: 'Unanchored', notes: [] };
  const orphan: NoteGroup = { key: '_orphan', title: 'Anchors no longer in the pack (re-anchor these)', notes: [] };
  const sorted = [...state.notes].sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
  for (const n of sorted) {
    const resolved = resolveAnchor(n.anchor, idx);
    const surface = surfaceOf(n);
    const item = { ...n, resolved, surface };
    if (!resolved.ok) orphan.notes.push(item);
    else if (n.anchor.type === 'free') free.notes.push(item);
    else if (surface === 'paper' && resolved.section && groups.has(resolved.section)) groups.get(resolved.section)!.notes.push(item);
    else bySurface.get(surface)!.notes.push(item);
  }
  return [...groups.values(), ...SURFACES.map((s) => bySurface.get(s)!), free, orphan].filter((g) => g.notes.length);
}

// ------------------------------------------------------------------------------------------ Markdown export / import
const MARK = 'bx-note';

export function toMarkdown(state: NotepadState, idx: AnchorIndex, meta: { title: string; slug: string; date?: string; app?: string }): string {
  const out: string[] = [
    `# Notes — ${meta.title}`,
    '',
    `_Exported ${meta.date ?? new Date().toISOString().slice(0, 10)} from ${meta.app ?? 'the Explorer'} (${meta.slug}). Notes on the review by section, in reading order; then notes from the rest of the app by surface. Each note keeps its anchor, the page it was taken on and the quote it hangs on. Every note below was written by you._`,
    '',
  ];
  for (const g of groupBySection(state, idx)) {
    out.push(`## ${g.title}`, '');
    for (const n of g.notes) {
      out.push(`### ${n.resolved.label}`, '');
      if (n.route) out.push(`_on ${n.route}_`, '');
      if (n.quote) { out.push(...n.quote.split('\n').map((l) => `> ${l}`), ''); }
      out.push(n.body.trim() || '_(empty note)_', '');
      const m: Record<string, unknown> = { id: n.id, anchor: n.anchor, quote: n.quote, created: n.created, updated: n.updated };
      for (const k of ['route', 'prefix', 'suffix', 'within'] as const) if (n[k] !== undefined) m[k] = n[k];
      out.push(`<!-- ${MARK} ${JSON.stringify(m).replace(/--/g, '\\u002d\\u002d')} -->`, '');
    }
  }
  return out.join('\n');
}

/** Parse an exported file (old or new) back into notes. A Markdown file without note markers becomes one unanchored note. */
export function fromMarkdown(md: string): Note[] {
  const re = new RegExp(`^### [^\\n]*\\n([\\s\\S]*?)<!-- ${MARK} (\\{[\\s\\S]*?\\}) -->`, 'gm');
  const notes: Note[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    let meta: Partial<Note>;
    try { meta = JSON.parse(m[2]) as Partial<Note>; } catch { continue; }
    const lines = m[1].split('\n');
    let i = 0;
    while (i < lines.length && (lines[i].startsWith('>') || /^_on \S.*_$/.test(lines[i]) || !lines[i].trim())) i++;
    let body = lines.slice(i).join('\n').trim();
    if (body === '_(empty note)_') body = '';
    if (!meta.id || !meta.anchor) continue;
    const t = new Date().toISOString();
    notes.push({ ...meta, id: meta.id, anchor: meta.anchor, body, created: meta.created ?? t, updated: meta.updated ?? t } as Note);
  }
  if (!notes.length && md.trim()) {
    const t = new Date().toISOString();
    notes.push({ id: newId(), anchor: { type: 'free', id: '' }, body: md.trim(), created: t, updated: t });
  }
  return normalise({ notes }).notes;
}
