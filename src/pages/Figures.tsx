import { Link } from 'react-router-dom';
import { figuresIndex } from '@/lib/data';

/** The figures (APP-SPEC §2 /figures): every one synthesised by the builder from the cited works; none reproduced. */
export default function Figures() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Figures</h1>
      <p className="bx-prose mt-2 max-w-3xl">
        {figuresIndex.length} figures, each built by the builder of the review from values that the cited studies report — not reproduced from any publication, and not a meta-analysis.
        Every row of their data names the reference it came from. Hover or focus a bar for its exact value.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {figuresIndex.map((f) => (
          <li key={f.id} className="bx-card p-4 bx-noteable" data-note-anchor={`figure:${f.id}`}>
            <p className="text-xs bx-muted">{f.label} · {f.kind} · synthesised from {f.synthesis === 'data' ? 'data' : 'sources'} in refs {f.refs.map((n) => `[${n}]`).join(' ')}</p>
            <Link to={`/figures/${f.id}`} className="font-display text-lg font-semibold underline text-[color:var(--bx-heading)]">{f.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
