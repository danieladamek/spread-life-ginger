import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { hostOf } from '@/lib/note-dom';
import type { Reference } from '@/types';
import ReferenceCard from './ReferenceCard';
import { loadReferences } from '@/lib/heavy';

interface ParagraphCtx { active: number | null; toggle: (n: number) => void; id: string }
const Ctx = createContext<ParagraphCtx | null>(null);

/** Paragraph wrapper: owns one citation fold-out, inserted directly after the paragraph (one open per paragraph). */
export function Paragraph({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const id = `fo-${useId().replace(/:/g, '')}`;
  const toggle = useCallback((n: number) => setActive((a) => (a === n ? null : n)), []);
  return (
    <Ctx.Provider value={{ active, toggle, id }}>
      {inline ? <span>{children}</span> : <p>{children}</p>}
      {active !== null && <CitationFoldout n={active} id={id} onClose={() => setActive(null)} />}
    </Ctx.Provider>
  );
}

export function CitationFoldout({ n, id, onClose }: { n: number; id: string; onClose: () => void }) {
  const [ref, setRef] = useState<Reference | null | undefined>(undefined);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => { let live = true; loadReferences().then((rs) => { if (live) setRef(rs.find((r) => r.n === n) ?? null); }); return () => { live = false; }; }, [n]);
  // the anchor this fold-out's trigger sits in, so a note taken inside it can reopen it
  useEffect(() => { if (el.current) el.current.setAttribute('data-note-host', hostOf(el.current.parentElement)); }, [n]);
  return (
    <div ref={el} id={id} className="bx-foldout not-prose" role="region" aria-label={`Reference ${n}`} data-testid="citation-foldout" data-note-anchor={`ref:${n}`} data-note-within="foldout" data-note-opener={`cite:${n}`}>
      <div className="flex justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[0.15em] bx-muted">REFERENCE {n}</span>
        <button type="button" className="bx-btn !py-0.5 !px-2 text-xs" onClick={onClose} aria-label={`Close reference ${n}`}>Close</button>
      </div>
      {ref === undefined && <p className="mt-2 text-sm bx-muted" role="status">Loading…</p>}
      {ref === null && <p className="mt-2 text-sm"><span className="bx-todo">reference [{n}] not in the content pack</span></p>}
      {ref && <div className="mt-2"><ReferenceCard r={ref} compact /></div>}
    </div>
  );
}

/** Clickable citation token, e.g. [2,3] or [3–5]; each number opens the paragraph's fold-out. */
export default function Cite({ ns, label }: { ns: number[]; label: string }) {
  const ctx = useContext(Ctx);
  const inner = label.replace(/^\[|\]$/g, '');
  if (!ctx) return <span className="bx-cite">[{inner}]</span>;
  const parts = inner.split(/(,\s*|–|-)/);
  let shown = 0;
  return (
    <span className="whitespace-nowrap">
      <span className="bx-cite" aria-hidden="true">[</span>
      {parts.map((p, k) => {
        if (/^\d+$/.test(p)) {
          const n = Number(p);
          shown++;
          return (
            <button key={k} type="button" className="bx-cite" data-note-opener={`cite:${n}`} onClick={() => ctx.toggle(n)} aria-expanded={ctx.active === n} aria-controls={ctx.active === n ? ctx.id : undefined} aria-label={`Reference ${n}`} data-testid={`cite-${n}`}>{p}</button>
          );
        }
        return <span key={k} className="bx-cite" aria-hidden="true">{p}</span>;
      })}
      <span className="bx-cite" aria-hidden="true">]</span>
      {ns.length > shown && (
        <span className="sr-only">{ns.filter((n) => !parts.includes(String(n))).map((n) => <button key={n} type="button" onClick={() => ctx.toggle(n)}>Reference {n}</button>)}</span>
      )}
    </span>
  );
}
