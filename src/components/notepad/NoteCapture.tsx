import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotepad } from '@/lib/notepad-context';
import { captureRange, ignorable, type Capture } from '@/lib/note-dom';
import type { Anchor } from '@/lib/notepad';

/** Short words for the button: "Add note on this section", "… on [41]", "… on this page". */
export function anchorShort(a: Anchor): string {
  switch (a.type) {
    case 'page': return 'this page';
    case 'section': return 'this section';
    case 'ref': return `[${a.id}]`;
    case 'row': return `row ${Number(a.id.split(':')[1]) + 1}`;
    case 'term': return `term ${a.id}`;
    case 'concept': return 'this 101';
    case 'synthesis': return 'this synthesis';
    case 'recipe': return 'this recipe';
    case 'figure': return a.id;
    default: return a.id;
  }
}

/**
 * Quote capture on every route (APP-SPEC v0.8 §3.1), mounted once in Layout so every page, popover, fold-out, drawer
 * and dialog inherits it. A non-empty selection outside the notepad, form fields and the nav chrome raises a small
 * "Add note" control beside it — above the selection with a mouse, below it on a touch screen so it does not fight
 * the native selection menu. It is reachable by Tab, and `n` triggers it while a selection is active. It stores the
 * quote, the nearest anchor, the route and ~32 characters either side, opens the notepad and focuses the new note.
 */
export default function NoteCapture() {
  const np = useNotepad();
  const loc = useLocation();
  const [cap, setCap] = useState<{ c: Capture; x: number; y: number; below: boolean } | null>(null);
  const capRef = useRef(cap);
  capRef.current = cap;
  const locRef = useRef(loc);
  locRef.current = loc;

  const update = useCallback(() => {
    const s = window.getSelection();
    if (!s || s.rangeCount === 0 || s.isCollapsed) { setCap(null); return; }
    const range = s.getRangeAt(0);
    if (!range.toString().trim() || ignorable(range.commonAncestorContainer) || ignorable(range.startContainer) || ignorable(range.endContainer)) { setCap(null); return; }
    const rects = range.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
    const first = rects.length ? rects[0] : rect;
    const below = !!window.matchMedia?.('(pointer: coarse)').matches;
    const x = Math.min(Math.max((below ? rect.left + rect.width / 2 : first.left + first.width / 2), 70), window.innerWidth - 70);
    const y = below ? Math.min(rect.bottom + 12, window.innerHeight - 48) : Math.max(first.top - 10, 44);
    setCap({ c: captureRange(range, locRef.current), x, y, below });
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(t); t = setTimeout(update, 120); };
    const now = () => { clearTimeout(t); setTimeout(update, 0); };
    document.addEventListener('selectionchange', soon);
    document.addEventListener('pointerup', now);
    document.addEventListener('keyup', now);
    window.addEventListener('scroll', soon, { passive: true, capture: true });
    window.addEventListener('resize', soon);
    return () => { clearTimeout(t); document.removeEventListener('selectionchange', soon); document.removeEventListener('pointerup', now); document.removeEventListener('keyup', now); window.removeEventListener('scroll', soon, { capture: true }); window.removeEventListener('resize', soon); };
  }, [update]);
  useEffect(() => { setCap(null); }, [loc.pathname]);

  const add = useCallback(() => {
    const c = capRef.current?.c;
    if (!c) return;
    np.addNote(c.anchor, c.quote, '', { route: c.route, prefix: c.prefix, suffix: c.suffix, within: c.within });
    np.setOpen(true);
    setCap(null);
    window.getSelection()?.removeAllRanges();
  }, [np]);

  // `n` adds the note while a selection is active (and focus is not in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' || e.metaKey || e.ctrlKey || e.altKey || !capRef.current) return;
      const t = e.target as Element | null;
      if (t?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
      e.preventDefault();
      add();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [add]);

  if (!cap) return null;
  return (
    <button
      type="button"
      data-note-capture=""
      data-testid="add-note"
      className="bx-btn-primary fixed z-[80] shadow-lg no-print whitespace-nowrap"
      style={{ left: cap.x, top: cap.y, transform: cap.below ? 'translateX(-50%)' : 'translate(-50%, -100%)' }}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
      onClick={add}
      aria-keyshortcuts="n"
      title="Add a note with this quote (n)"
    >
      <span aria-hidden="true">✎</span> Add note on {anchorShort(cap.c.anchor)}
    </button>
  );
}
