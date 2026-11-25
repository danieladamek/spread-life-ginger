import { useNotepad } from '@/lib/notepad-context';
import type { Anchor } from '@/lib/notepad';

/**
 * "Note this" (APP-SPEC v0.8 §3.1): one shared small control for objects with no selection — cards, rows, entries,
 * headings. The `hover` variant is quiet until its `.bx-noteable` host is hovered or anything in it has focus (and
 * always visible on touch screens); the `button` variant is an ordinary button, for cards that had one.
 */
export default function NoteThis({ anchor, quote, label, variant = 'hover' }: { anchor: Anchor; quote?: string; label: string; variant?: 'hover' | 'button' }) {
  const np = useNotepad();
  return (
    <button
      type="button"
      data-note-capture=""
      data-testid="note-this"
      className={variant === 'hover' ? 'bx-note-this' : 'bx-btn'}
      onClick={(e) => { e.stopPropagation(); np.addNote(anchor, quote); np.setOpen(true); }}
      aria-label={`Note this: ${label}`}
    >
      <span aria-hidden="true">✎ </span>{variant === 'hover' ? 'Note this' : `Note on ${label}`}
    </button>
  );
}
