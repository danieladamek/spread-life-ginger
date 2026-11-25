import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotepad } from '@/lib/notepad-context';
import { clearHighlight, findQuote, highlight } from '@/lib/note-dom';
import { norm } from '@/lib/anchor';
import type { Note } from '@/lib/notepad';

const sel = (a: string) => `[data-note-anchor="${CSS.escape(a)}"]`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(get: () => T | null | undefined, cancelled: () => boolean, ms = 5000): Promise<T | null> {
  for (let t = 0; t < ms && !cancelled(); t += 100) { const v = get(); if (v) return v; await sleep(100); }
  return null;
}

/**
 * Coming back to a note (APP-SPEC v0.8 §3.1): after the note's link has navigated to its route, open the popover or
 * fold-out it was taken in (its trigger, inside the anchor that holds it), scroll the anchor into view and highlight
 * the quote, found by its prefix + quote + suffix, then the quote alone, then just flash the anchor. Returns false
 * when the anchor or the quote is no longer on the page ("passage not found after rebuild").
 */
export async function revisit(n: Note, cancelled: () => boolean = () => false): Promise<boolean> {
  const anchor = `${n.anchor.type}:${n.anchor.id}`;
  const q = n.quote ? norm(n.quote) : '';
  const holds = (el: Element) => !el.closest('[data-note-ignore]') && (!q || norm(el.textContent ?? '').includes(q));
  let container: Element | null = null;
  if (n.within) {
    const { opener, host, kind } = n.within;
    const trigger = await waitFor(() => {
      const hosts = host ? [...document.querySelectorAll(sel(host))] : [document.body];
      return hosts.map((h) => h.querySelector<HTMLElement>(`[data-note-opener="${CSS.escape(opener)}"]`)).find(Boolean) ?? document.querySelector<HTMLElement>(`[data-note-opener="${CSS.escape(opener)}"]:not([data-note-within])`);
    }, cancelled);
    if (trigger) {
      trigger.scrollIntoView({ block: 'center' });
      if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      container = await waitFor(() => {
        const open = [...document.querySelectorAll(`[data-note-within="${kind}"][data-note-opener="${CSS.escape(opener)}"]`)];
        return open.find(holds) ?? open[0];
      }, cancelled, 3000);
    }
  }
  if (!container && n.anchor.type !== 'free') {
    container = await waitFor(() => {
      const xs = [...document.querySelectorAll(sel(anchor))].filter((el) => !el.closest('[data-note-ignore]'));
      const hit = xs.find(holds);
      if (hit) return hit;
      // one object rendered as several pieces (a passage split by term links): their common ancestor holds the quote
      if (xs.length > 1) {
        const r = document.createRange(); r.setStartBefore(xs[0]); r.setEndAfter(xs[xs.length - 1]);
        const common = r.commonAncestorContainer as Element;
        if (common.nodeType === Node.ELEMENT_NODE && holds(common)) return common;
      }
      if (xs[0]) return xs[0];
      if (n.anchor.type === 'page') return (n.anchor.heading && document.getElementById(n.anchor.heading)?.closest('section')) || document.getElementById('main');
      return null;
    }, cancelled);
  }
  if (!container || cancelled()) return false;
  const range = n.quote ? findQuote(container, n.quote, n.prefix, n.suffix) : null;
  const target = (range?.startContainer.parentElement ?? container) as HTMLElement;
  target.scrollIntoView({ block: 'center' });
  highlight(range, container);
  return !n.quote || !!range;
}

/** Mounted once in Layout: runs `revisit` for the note the reader just followed; clears the highlight on navigation. */
export default function NoteReturn() {
  const np = useNotepad();
  const loc = useLocation();
  useEffect(() => { clearHighlight(); }, [loc.key]);
  useEffect(() => {
    const n = np.returning;
    if (!n) return;
    // wait until the note's page is the one on screen (the link has navigated)
    const target = (n.route ?? '').split(/[?#]/)[0];
    if (target && loc.pathname !== target) return;
    let gone = false;
    void revisit(n, () => gone).then((ok) => { if (gone) return; np.markLost(n.id, !ok); np.returnTo(null); });
    return () => { gone = true; };
  }, [np.returning, loc.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
