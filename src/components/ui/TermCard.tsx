import { Link } from 'react-router-dom';
import type { TermShort } from '@/types';
import { getConcept } from '@/lib/data';

/** The short popover body for a glossary term (short definition + full entry + 101 link). */
export default function TermCard({ term }: { term: TermShort }) {
  const concept = getConcept(term.concept);
  return (
    <div data-note-anchor={`term:${term.id}`} className="font-body">
      <p className="font-display text-base font-semibold leading-snug text-[color:var(--bx-heading)]">{term.term} <span className="bx-chip bg-paper-2 dark:bg-night-2 align-middle text-ink dark:text-night-ink">{term.kind}</span></p>
      <p className="mt-1 leading-6">{term.short}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs bx-targets">
        <Link className="underline font-semibold" to={`/glossary#${term.id}`}>Full entry →</Link>
        {concept && <Link className="underline" to={`/concepts/${concept.id}`}>Learn the concept → 101</Link>}
      </p>
    </div>
  );
}
