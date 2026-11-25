import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME, BROWSER_ONLY, useNotepad } from '@/lib/notepad-context';
import { fromMarkdown, resolveAnchor, toMarkdown, type AnchorIndex, type Note } from '@/lib/notepad';
import { pageLabel } from '@/lib/routes';
import { loadAnchorIndex } from '@/lib/notes-index';
import { getSection, manifest, SLUG } from '@/lib/data';
import { downloadBlob } from '@/components/figures/download';

export function useAnchorIndex(): AnchorIndex | undefined {
  const [idx, setIdx] = useState<AnchorIndex>();
  useEffect(() => { let live = true; loadAnchorIndex().then((x) => { if (live) setIdx(x); }); return () => { live = false; }; }, []);
  return idx;
}

export function exportNotes(state: Parameters<typeof toMarkdown>[0], idx: AnchorIndex) {
  const md = toMarkdown(state, idx, { title: manifest.title, slug: SLUG, app: APP_NAME });
  downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${SLUG}-notes-${new Date().toISOString().slice(0, 10)}.md`);
}

/** The path a note belongs to: where it was taken, else where its anchor lives. */
export function notePath(n: Note, idx?: AnchorIndex): string | null {
  if (n.route) return n.route.split(/[?#]/)[0];
  if (n.anchor.type === 'page') return n.anchor.id;
  return idx ? resolveAnchor(n.anchor, idx).to.split(/[?#]/)[0] : null;
}

/**
 * One note: what it hangs on (kind, label, page), the quote, and its body. The link goes back to the passage: the
 * note's own route, then NoteReturn reopens any popover or fold-out, scrolls and highlights the quote.
 */
export function NoteEditor({ note, idx, autoFocus }: { note: Note; idx?: AnchorIndex; autoFocus?: boolean }) {
  const { dispatch, returnTo, lost, setOpen } = useNotepad();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const r = idx ? resolveAnchor(note.anchor, idx) : null;
  const to = note.route ?? r?.to ?? '/notes';
  const where = note.route ? pageLabel(note.route) ?? note.route.split(/[?#]/)[0] : null;
  const back = () => {
    returnTo(note.route ? note : { ...note, route: to.split('#')[0] });
    // a drawer would cover the passage; the docked panel on /read stays
    if (!(to.startsWith('/read') && window.matchMedia?.('(min-width: 1280px)').matches)) setOpen(false);
  };
  return (
    <li className="bx-card p-2.5" data-testid="note" data-note-ignore="" data-anchor-kind={note.anchor.type}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0">
          {r ? (r.ok ? <Link className="underline font-semibold" to={to} onClick={back} data-testid="note-link">{r.label}</Link> : <span className="bx-todo">{r.label} — no longer in the pack</span>) : <span>{note.anchor.type} {note.anchor.id}</span>}
          {where && <span className="bx-muted"> · on {where}</span>}
        </span>
        <button type="button" className="bx-muted hover:underline shrink-0" onClick={() => { if (confirm('Delete this note?')) dispatch({ type: 'remove', id: note.id }); }} aria-label="Delete note">Delete</button>
      </div>
      {lost.has(note.id) && <p className="mt-1"><span className="bx-todo" data-testid="note-lost">passage not found after rebuild — the note is kept</span></p>}
      {note.quote && <blockquote className="mt-1 border-l-2 border-[color:var(--bx-accent)] pl-2 text-xs bx-muted line-clamp-4" data-testid="note-quote">{note.quote}</blockquote>}
      <label className="sr-only" htmlFor={`note-${note.id}`}>Note on {r?.label ?? note.anchor.id}</label>
      <textarea id={`note-${note.id}`} ref={ref} className="bx-input mt-1.5 min-h-[5.5rem] font-body !text-sm leading-6" value={note.body} placeholder="Your note…" onChange={(e) => dispatch({ type: 'update', id: note.id, body: e.target.value })} data-testid="note-body" />
    </li>
  );
}

/** Where notes are being saved (APP-SPEC §3.1). Without the local endpoint it says so plainly. */
export function SaveStatus() {
  const np = useNotepad();
  if (np.file === 'unavailable') return <p className="text-xs font-semibold" role="status" data-testid="save-status">{BROWSER_ONLY}</p>;
  return (
    <p className="text-xs bx-muted" role="status" data-testid="save-status">
      {np.file === 'saved' ? 'Saved in this browser and to notes/notepad.md in the app folder.' : np.file === 'saving' ? 'Saving to notes/notepad.md…' : 'Saved in this browser.'}
    </p>
  );
}

/**
 * The docked notepad / drawer. Views: "This page" and "All" on every route, plus "This section" on /read (old
 * notes with no recorded route match a page through their anchor). Export and import .md.
 */
export default function NotepadPanel({ section, onClose }: { section?: string | null; onClose?: () => void }) {
  const np = useNotepad();
  const idx = useAnchorIndex();
  const loc = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState<'section' | 'page' | 'all'>(section ? 'section' : 'page');
  useEffect(() => { if (!section && scope === 'section') setScope('page'); }, [section, scope]);
  const inScope = (n: Note, sc: typeof scope) => {
    if (sc === 'all' || !idx) return true;
    if (sc === 'section') return resolveAnchor(n.anchor, idx).section === section;
    return notePath(n, idx) === loc.pathname;
  };
  const notes = useMemo(() => [...np.state.notes].sort((a, b) => (a.created < b.created ? 1 : -1)).filter((n) => inScope(n, scope)),
    [np.state.notes, scope, section, idx, loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  // a note just added elsewhere on the page must be in view, so its textarea can take focus
  useEffect(() => {
    const n = np.state.notes.find((x) => x.id === np.focusId);
    if (n && idx && !inScope(n, scope)) setScope(inScope(n, 'page') ? 'page' : 'all');
  }, [np.focusId, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  const sec = getSection(section);

  const onImport = async (f: File) => {
    const text = await f.text();
    np.dispatch({ type: 'merge', notes: fromMarkdown(text) });
  };
  const views: ['section' | 'page' | 'all', string][] = [...(section ? [['section', 'This section'] as ['section', string]] : []), ['page', 'This page'], ['all', `All (${np.state.notes.length})`]];

  return (
    <div className="flex h-full flex-col gap-2 text-sm" data-testid="notepad" data-note-ignore="">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-display">Notepad</h2>
        {onClose && <button type="button" className="bx-btn !py-0.5" onClick={onClose} aria-label="Close notepad">×</button>}
      </div>
      <SaveStatus />
      <p className="text-xs bx-muted">Select text anywhere in the app — the review, a popover, a reference, a recipe — to quote it (or press <kbd className="bx-kbd">n</kbd>), or use ✎ Note this.</p>
      <div className="flex flex-wrap gap-1.5">
        {section && <button type="button" className="bx-btn" onClick={() => { setScope('section'); np.addNote({ type: 'section', id: section }); }} data-testid="new-section-note">+ Note on {sec?.number ? `§${sec.number}` : 'this section'}</button>}
        <button type="button" className="bx-btn" onClick={() => { setScope('all'); np.addNote({ type: 'free', id: '' }); }} data-testid="new-note">+ Unanchored note</button>
      </div>
      <div className="flex flex-wrap gap-1 text-xs" role="group" aria-label="Which notes">
        {views.map(([k, l]) => <button key={k} type="button" className={`bx-btn !py-0.5 ${scope === k ? 'bx-btn-on' : ''}`} aria-pressed={scope === k} onClick={() => setScope(k)} data-testid={`view-${k}`}>{l}</button>)}
      </div>
      <ul className="grid gap-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {notes.length === 0 && <li className="bx-muted text-xs">No notes {scope === 'section' ? 'on this section ' : scope === 'page' ? 'on this page ' : ''}yet.</li>}
        {notes.map((n) => <NoteEditor key={n.id} note={n} idx={idx} autoFocus={np.focusId === n.id} />)}
      </ul>
      <div className="flex flex-wrap gap-1.5 border-t border-[color:var(--bx-line)] pt-2">
        <button type="button" className="bx-btn" disabled={!idx || !np.state.notes.length} onClick={() => idx && exportNotes(np.state, idx)} data-testid="export-notes">Export .md</button>
        <button type="button" className="bx-btn" onClick={() => fileRef.current?.click()}>Import .md</button>
        <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain" className="sr-only" aria-label="Import notes from a Markdown file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
        <Link className="bx-btn" to="/notes">All notes →</Link>
      </div>
    </div>
  );
}
