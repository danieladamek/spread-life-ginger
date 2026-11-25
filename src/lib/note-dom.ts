/**
 * The notepad's DOM side (APP-SPEC v0.8 §3.1): find what a selection hangs on, capture it, and find it again.
 *
 * Every object the app renders carries `data-note-anchor="<kind>:<id>"`. Popover panels and fold-outs also carry
 * `data-note-within="popover|foldout"`, `data-note-opener` (the trigger's own `data-note-opener`) and
 * `data-note-host` (the anchor the trigger sits in), so a note taken inside one can reopen it on the way back.
 * Nothing here touches the review's text: the highlight uses the CSS Custom Highlight API and changes no DOM.
 */
import { norm, normWithMap } from '@/lib/anchor';
import { parseAnchor, type Anchor, type Within } from '@/lib/notepad';

export const CONTEXT_CHARS = 32;
const HEADINGS = 'h1[id], h2[id], h3[id]';

const elementOf = (n: Node | null): Element | null => (!n ? null : n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement);

/** The nearest h1–h3 with an id at or before `el` in document order, within `scope` (default: <main>). */
export function nearestHeading(el: Element, scope: Element | null = document.getElementById('main')): string | undefined {
  const root = scope ?? document.body;
  let best: Element | undefined;
  for (const h of root.querySelectorAll(HEADINGS)) {
    const pos = h.compareDocumentPosition(el);
    if (h === el || h.contains(el) || pos & Node.DOCUMENT_POSITION_FOLLOWING) best = h; else break;
  }
  return best?.id || undefined;
}

export interface Found { anchor: Anchor; element: Element; within?: Within }

/**
 * Walk up from a DOM node to the closest `data-note-anchor`. Inside a
 * popover or fold-out with no anchor of its own, the trigger's host anchor is used. With nothing at all, the page
 * itself: `{ type: 'page', id: location.pathname, heading: <nearest preceding h1–h3 id> }`. Never null.
 */
export function nearestAnchor(node: Node | null, pathname: string = location.pathname): Found {
  const start = elementOf(node);
  let within: Within | undefined;
  const w = start?.closest('[data-note-within]');
  if (w) within = { kind: w.getAttribute('data-note-within') as Within['kind'], opener: w.getAttribute('data-note-opener') ?? '', ...(w.getAttribute('data-note-host') ? { host: w.getAttribute('data-note-host')! } : {}) };
  const el = start?.closest('[data-note-anchor]') ?? null;
  const parsed = el ? parseAnchor(el.getAttribute('data-note-anchor')!) : null;
  if (el && parsed) {
    const heading = parsed.type === 'concept' || parsed.type === 'page' ? nearestHeading(start ?? el, el) : undefined;
    return { anchor: { ...parsed, ...(heading ? { heading } : {}) }, element: el, within };
  }
  if (within?.host) {
    const host = parseAnchor(within.host);
    const hostEl = document.querySelector(`[data-note-anchor="${CSS.escape(within.host)}"]`);
    if (host && hostEl) return { anchor: host, element: w!, within };
  }
  const main = document.getElementById('main') ?? document.body;
  const heading = start ? nearestHeading(start) : undefined;
  return { anchor: { type: 'page', id: pathname, ...(heading ? { heading } : {}) }, element: w ?? main, within };
}

/** The anchor string of the closest anchored element around `el` (used for a trigger's host), or the page. */
export function hostOf(el: Element | null): string {
  const f = nearestAnchor(el);
  return `${f.anchor.type}:${f.anchor.id}`;
}

export interface Capture { anchor: Anchor; quote: string; prefix: string; suffix: string; route: string; within?: Within }

/** What a selection range hangs on, with its quote and ~32 characters of context either side (raw text nodes). */
export function captureRange(range: Range, loc: { pathname: string; search: string } = location): Capture {
  // When both ends of the selection hang on the same object (one paragraph split into several spans by term links, say),
  // that object wins over whatever their common ancestor is.
  const fs = nearestAnchor(range.startContainer, loc.pathname);
  const fe = nearestAnchor(range.endContainer, loc.pathname);
  const same = fs.anchor.type !== 'page' && fs.anchor.type === fe.anchor.type && fs.anchor.id === fe.anchor.id;
  const found = same ? (fs.element.contains(fe.element) ? fs : fe.element.contains(fs.element) ? fe : fs) : nearestAnchor(range.commonAncestorContainer, loc.pathname);
  const quote = range.toString().replace(/\s+/g, ' ').trim();
  // context comes from an element that holds the whole selection
  const ctx = found.element.contains(range.startContainer) && found.element.contains(range.endContainer) ? found.element : (elementOf(range.commonAncestorContainer) ?? found.element);
  const before = document.createRange();
  before.selectNodeContents(ctx);
  let prefix = '', suffix = '';
  try { before.setEnd(range.startContainer, range.startOffset); prefix = before.toString().replace(/\s+/g, ' ').slice(-CONTEXT_CHARS); } catch { /* range outside the element */ }
  const after = document.createRange();
  after.selectNodeContents(ctx);
  try { after.setStart(range.endContainer, range.endOffset); suffix = after.toString().replace(/\s+/g, ' ').slice(0, CONTEXT_CHARS); } catch { /* range outside the element */ }
  return { anchor: found.anchor, quote, prefix, suffix, route: loc.pathname + loc.search, ...(found.within ? { within: found.within } : {}) };
}

/** Selections the notepad ignores: inside the notepad itself, form fields, the nav chrome. */
export function ignorable(node: Node | null): boolean {
  const el = elementOf(node);
  if (!el) return true;
  return !!el.closest('[data-note-ignore], input, textarea, select, [contenteditable=""], [contenteditable="true"], header, footer, nav, [data-note-capture]');
}

// ------------------------------------------------------------------------------------------ finding it again
interface TextMap { text: string; nodes: { node: Text; start: number }[] }
function textMap(root: Element): TextMap {
  const nodes: TextMap['nodes'] = [];
  let text = '';
  // the notepad's own copies of quotes (the dock on /read, the list on /notes) are never a match
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest('[data-note-ignore]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) { nodes.push({ node: n, start: text.length }); text += n.data; }
  return { text, nodes };
}
function pointAt(tm: TextMap, offset: number): [Text, number] {
  let lo = 0;
  for (let i = 0; i < tm.nodes.length; i++) if (tm.nodes[i].start <= offset) lo = i; else break;
  const n = tm.nodes[lo];
  return [n.node, Math.min(offset - n.start, n.node.data.length)];
}

/**
 * Find a captured quote inside `root`: among its occurrences, the one whose surroundings best match the captured
 * prefix and suffix (whitespace normalised). Returns a DOM Range, or null if the quote is not there any more.
 */
export function findQuote(root: Element, quote: string, prefix = '', suffix = ''): Range | null {
  const q = norm(quote);
  if (!q) return null;
  const tm = textMap(root);
  const { s, map } = normWithMap(tm.text);
  const p = norm(prefix), x = norm(suffix);
  let best = -1, bestScore = -1;
  for (let i = s.indexOf(q); i !== -1; i = s.indexOf(q, i + 1)) {
    let score = 0;
    const pre = s.slice(Math.max(0, i - p.length - 1), i).trim();
    const post = s.slice(i + q.length, i + q.length + x.length + 1).trim();
    for (let k = 1; k <= Math.min(pre.length, p.length) && pre[pre.length - k] === p[p.length - k]; k++) score++;
    for (let k = 0; k < Math.min(post.length, x.length) && post[k] === x[k]; k++) score++;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  if (best === -1) return null;
  const r = document.createRange();
  const [sn, so] = pointAt(tm, map[best]);
  const [en, eo] = pointAt(tm, map[best + q.length - 1] + 1);
  r.setStart(sn, so); r.setEnd(en, eo);
  return r;
}

const HL = 'bx-note';
type HighlightRegistry = { set: (k: string, v: unknown) => void; delete: (k: string) => void };
const registry = (): HighlightRegistry | null => ((globalThis as { CSS?: { highlights?: HighlightRegistry } }).CSS?.highlights ?? null);

/** Highlight a range (CSS Custom Highlight API). Where the API is missing, flash the element instead. */
export function highlight(range: Range | null, fallback: Element | null) {
  const reg = registry();
  const H = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  if (range && reg && H) { reg.set(HL, new H(range)); return 'highlight' as const; }
  if (fallback) { fallback.classList.add('bx-flash'); setTimeout(() => fallback.classList.remove('bx-flash'), 1800); }
  return 'flash' as const;
}
export function clearHighlight() { registry()?.delete(HL); }
