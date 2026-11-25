import type { ReactNode } from 'react';
import { loadTerms, useAsync } from '@/lib/heavy';
import Popover from '@/components/ui/Popover';
import TermCard from '@/components/ui/TermCard';

function TermBody({ id }: { id: string }) {
  const terms = useAsync(loadTerms);
  if (!terms) return <p className="bx-muted" role="status">Loading…</p>;
  const t = terms.get(id);
  return t ? <TermCard term={t} /> : <p><span className="bx-todo">term {id} is not in the glossary</span></p>;
}

/** A glossary term: visually quiet dotted underline, popover with the short definition (loaded on first open). */
export default function Term({ id, children }: { id: string; children: ReactNode }) {
  return <Popover className="bx-term" content={<TermBody id={id} />} testId={`term-${id}`} noteOpener={`term:${id}`}>{children}</Popover>;
}
