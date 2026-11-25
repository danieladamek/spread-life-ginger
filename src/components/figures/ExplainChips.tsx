import { Link } from 'react-router-dom';
import type { Explain } from '@/types';
import { getConcept } from '@/lib/data';
import { loadTerms, useAsync } from '@/lib/heavy';
import Popover from '@/components/ui/Popover';

/**
 * ⓘ popovers written from the pack's `explain:` block, each linking its 101 or glossary term. This pack's entries
 * carry no `on:` label, so each chip is named after the term or 101 it links to (pack data, not new text).
 */
export default function ExplainChips({ items, figure }: { items: Explain[]; figure: string }) {
  const terms = useAsync(loadTerms);
  if (!items.length) return null;
  const name = (e: Explain) => e.on ?? (e.term ? terms?.get(e.term)?.term ?? e.term : e.concept ? getConcept(e.concept)?.title ?? e.concept : 'Note');
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Explanations">
      {items.map((e, i) => (
        <li key={i} className="max-w-full">
          <Popover className="bx-chip border border-[color:var(--bx-line)] hover:bg-paper-2 dark:hover:bg-night-2 text-left max-w-full whitespace-normal" testId={`explain-${i}`} noteOpener={`explain:${figure}:${i}`} ariaLabel={`ⓘ ${name(e)} — explanation`}
            content={(
              <div>
                <p className="font-semibold">{name(e)}</p>
                <p className="mt-1 leading-6">{e.text}</p>
                <p className="mt-2 text-xs flex flex-wrap gap-3">
                  {e.concept && <Link className="underline" to={`/concepts/${e.concept}`}>101: {getConcept(e.concept)?.title ?? e.concept} →</Link>}
                  {e.term && <Link className="underline" to={`/glossary#${e.term}`}>Glossary: {terms?.get(e.term)?.term ?? e.term} →</Link>}
                </p>
              </div>
            )}>
            <span aria-hidden="true">ⓘ</span> {name(e)}
          </Popover>
        </li>
      ))}
    </ul>
  );
}
