import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { conceptsIndex, figuresIndex, sectionsIndex } from '@/lib/data';
import { ROUTES_FOR_NOTES } from '@/lib/routes';
import { useNotepad } from '@/lib/notepad-context';
import { resolveAnchor, ANCHOR_TYPES, fromMarkdown, groupBySection, SURFACE_LABEL, SURFACES, type AnchorType, type Surface } from '@/lib/notepad';
import { exportNotes, NoteEditor, SaveStatus, useAnchorIndex } from '@/components/notepad/NotepadPanel';

/**
 * The notepad as a page (APP-SPEC §2 /notes, §3.1): notes anchored to review sections, synthesis passages,
 * references, 101s, terms, figures and their rows, recipes and pages, in reading order; export is Markdown organised
 * by section with anchors and quotes.
 * Every word is the reader's.
 */
export default function Notes() {
  const np = useNotepad();
  const idx = useAnchorIndex();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AnchorType>('section');
  const [anchorId, setAnchorId] = useState('');
  const [surface, setSurface] = useState<Surface | ''>('');
  const [kind, setKind] = useState<AnchorType | ''>('');
  const groups = useMemo(() => (idx ? groupBySection(np.state, idx) : []).map((g) => ({ ...g, notes: g.notes.filter((n) => (!surface || n.surface === surface) && (!kind || n.anchor.type === kind)) })).filter((g) => g.notes.length), [np.state, idx, surface, kind]);
  const options = useMemo(() => {
    if (!idx) return [] as { id: string; label: string }[];
    if (type === 'section') return sectionsIndex.filter((s) => !s.part).map((s) => ({ id: s.id, label: s.title }));
    if (type === 'synthesis') return [...idx.synthesis.entries()].map(([id, y]) => ({ id, label: `${id.replace(/^syn-/, '')} (${y.section})` }));
    if (type === 'recipe') return [...idx.recipes.entries()].map(([id, r]) => ({ id, label: r.title }));
    if (type === 'ref') return [...idx.refs.entries()].map(([n, r]) => ({ id: String(n), label: `[${n}] ${r.citation.slice(0, 70)}` }));
    if (type === 'concept') return conceptsIndex.map((u) => ({ id: u.id, label: u.title }));
    if (type === 'term') return [...idx.terms.entries()].map(([id, t]) => ({ id, label: t.term })).sort((a, b) => a.label.localeCompare(b.label));
    if (type === 'figure') return figuresIndex.map((f) => ({ id: f.id, label: `${f.label}: ${f.title}` }));
    if (type === 'row') return [...idx.rows.entries()].map(([id, r]) => ({ id, label: r.label }));
    if (type === 'page') return ROUTES_FOR_NOTES.map((p) => ({ id: p, label: idx.page(p) ?? p }));
    return [];
  }, [idx, type]);
  const add = () => {
    if (type !== 'free' && !anchorId) return;
    const quote = undefined;
    // anchored from /notes, the note belongs to its anchor's page, not to /notes
    const to = type === 'free' || !idx ? undefined : (type === 'page' ? anchorId : resolveAnchor({ type, id: anchorId }, idx).to);
    np.addNote({ type, id: type === 'free' ? '' : anchorId }, quote, '', to ? { route: to.split('#')[0] } : {});
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Notes</h1>
      <p className="bx-prose mt-2">
        Your notes, from anywhere in the app: notes on the review in reading order, then the rest by surface. Select text on any page to quote it, use ✎ Note this, or anchor a note here; export them as Markdown any time.
      </p>
      <div className="mt-2"><SaveStatus /></div>
      <section className="bx-card p-3 mt-5 text-sm no-print" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg">New note</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] items-end">
          <label className="block"><span className="block text-xs bx-muted mb-1">Anchor to</span>
            <select className="bx-input" value={type} onChange={(e) => { setType(e.target.value as AnchorType); setAnchorId(''); }} data-testid="anchor-type">
              <option value="section">a section of the review</option><option value="synthesis">a synthesis passage</option><option value="ref">a reference</option><option value="concept">a 101</option><option value="term">a term</option><option value="figure">a figure</option><option value="row">a figure row</option><option value="recipe">a recipe</option><option value="page">a page</option><option value="free">nothing</option>
            </select></label>
          {type !== 'free' ? (
            <label className="block min-w-0"><span className="block text-xs bx-muted mb-1">Which</span>
              <select className="bx-input" value={anchorId} onChange={(e) => setAnchorId(e.target.value)} data-testid="anchor-id"><option value="">choose…</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          ) : <span />}
          <button type="button" className="bx-btn-primary" onClick={add} disabled={type !== 'free' && !anchorId} data-testid="add-anchored-note">Add note</button>
        </div>
      </section>
      <div className="mt-4 flex flex-wrap gap-2 no-print">
        <button type="button" className="bx-btn" disabled={!idx || !np.state.notes.length} onClick={() => idx && exportNotes(np.state, idx)} data-testid="export-notes">Export Markdown (by section)</button>
        <button type="button" className="bx-btn" onClick={() => fileRef.current?.click()}>Import Markdown</button>
        <input ref={fileRef} type="file" accept=".md,text/markdown,text/plain" className="sr-only" aria-label="Import notes from a Markdown file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) np.dispatch({ type: 'merge', notes: fromMarkdown(await f.text()) }); e.target.value = ''; }} />
        <label className="text-sm"><span className="sr-only">Surface</span>
          <select className="bx-input !w-auto" value={surface} onChange={(e) => setSurface(e.target.value as Surface | '')} data-testid="filter-surface"><option value="">every surface</option>{SURFACES.map((x) => <option key={x} value={x}>{SURFACE_LABEL[x]}</option>)}</select></label>
        <label className="text-sm"><span className="sr-only">Anchor kind</span>
          <select className="bx-input !w-auto" value={kind} onChange={(e) => setKind(e.target.value as AnchorType | '')} data-testid="filter-anchor-kind"><option value="">every anchor kind</option>{ANCHOR_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <span className="text-sm bx-muted self-center" role="status">{np.state.notes.length} note{np.state.notes.length === 1 ? '' : 's'}</span>
      </div>
      {!idx ? <p className="mt-6 bx-muted" role="status">Loading…</p> : groups.length === 0 ? <p className="mt-6 bx-muted">{np.state.notes.length ? 'No notes match these filters.' : <>No notes yet. Select text on any page — <Link className="underline" to="/read">the review</Link>, a popover, a recipe — use ✎ Note this, or add one above.</>}</p> : (
        <div className="mt-6 grid gap-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`ng-${g.key}`}>
              <h2 id={`ng-${g.key}`} className="text-xl">{g.title}</h2>
              <ul className="mt-2 grid gap-2">{g.notes.map((n) => <NoteEditor key={n.id} note={n} idx={idx} autoFocus={np.focusId === n.id} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
