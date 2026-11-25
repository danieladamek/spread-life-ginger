import { useEffect, useRef, useState } from 'react';
import { hostOf } from '@/lib/note-dom';
import type { Reference } from '@/types';
import { loadReferences, useAsync } from '@/lib/heavy';
import Todo from '@/components/ui/Todo';
import ReferenceCard from './ReferenceCard';

/**
 * A list of reference numbers as fold-outs (figure pages, recipe pages): each [n] expands the same summary card the
 * reader uses; an unverified one says so, even before it is opened.
 */
export function CitationList({ ns }: { ns: number[] }) {
  const refs = useAsync(loadReferences);
  const [open, setOpen] = useState<number | null>(null);
  const byN = new Map((refs ?? []).map((r) => [r.n, r]));
  const r: Reference | undefined = open !== null ? byN.get(open) : undefined;
  const fo = useRef<HTMLDivElement>(null);
  useEffect(() => { if (fo.current) fo.current.setAttribute('data-note-host', hostOf(fo.current.parentElement)); }, [open, r]);
  return (
    <div className="mt-1">
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {ns.map((n) => {
          const x = byN.get(n);
          return (
            <li key={n} className="inline-flex items-center gap-1 text-sm">
              <button type="button" className="underline font-semibold text-[color:var(--bx-accent)] min-h-6 min-w-6 inline-flex items-center justify-center" aria-expanded={open === n} data-note-opener={`cite:${n}`} onClick={() => setOpen((o) => (o === n ? null : n))} data-testid={`ref-toggle-${n}`}>[{n}]</button>
              {x && !x.verified && <Todo>not verified</Todo>}
            </li>
          );
        })}
      </ul>
      {r && (
        <div ref={fo} className="bx-foldout" role="region" aria-label={`Reference ${r.n}`} data-testid="ref-foldout" data-note-anchor={`ref:${r.n}`} data-note-within="foldout" data-note-opener={`cite:${r.n}`}>
          <div className="flex justify-end"><button type="button" className="bx-btn !py-0.5 !px-2 text-xs" onClick={() => setOpen(null)} aria-label={`Close reference ${r.n}`}>Close</button></div>
          <ReferenceCard r={r} compact />
        </div>
      )}
    </div>
  );
}
