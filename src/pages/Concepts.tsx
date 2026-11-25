import { Link } from 'react-router-dom';
import { conceptsIndex } from '@/lib/data';

/** The 101s (APP-SPEC §2 /concepts): the ideas the review presumes, each one short page. */
export default function Concepts() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">101s — what to know first</h1>
      <p className="bx-prose mt-2 max-w-3xl">
        {conceptsIndex.length} short primers, written by the builder of the review. Each says what the idea is, why the review needs it and where the review uses it. Every factual sentence carries a citation, as in the review.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {conceptsIndex.map((c) => (
          <li key={c.id} className="bx-card p-4 bx-noteable" data-testid="concept-card" data-note-anchor={`concept:${c.id}`}>
            <Link to={`/concepts/${c.id}`} className="font-display text-lg font-semibold underline text-[color:var(--bx-heading)]">{c.title}</Link>
            <p className="text-sm mt-1">{c.one_liner}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
