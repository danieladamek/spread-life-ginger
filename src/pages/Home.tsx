import { Link } from 'react-router-dom';
import { AS_OF, conceptsIndex, GROUP_COLOURS, manifest, provenance, recipesIndex, sectionsIndex } from '@/lib/data';
import GingerMotif from '@/components/ui/GingerMotif';
import ReviewBadges from '@/components/ui/ReviewBadges';

/** The three records the review reads together, each pointing at its part of the review. Labels are the review's own part titles. */
const STRANDS: { key: string; part: RegExp }[] = [
  { key: 'history', part: /history/i },
  { key: 'health', part: /health/i },
  { key: 'plant', part: /plant itself/i },
];

export default function Home() {
  const c = manifest.counts;
  const parts = sectionsIndex.filter((s) => s.part);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] items-center" aria-labelledby="home-title" data-note-anchor="page:/">
        <div>
          <ReviewBadges />
          <h1 id="home-title" className="mt-4 text-3xl sm:text-5xl leading-tight">{manifest.short_title}</h1>
          <p className="mt-2 text-lg sm:text-xl font-display text-ink dark:text-night-ink">{manifest.title.replace(/^[^—]+—\s*/, '')}</p>
          <p className="mt-4 text-sm"><span className="font-semibold">The question: </span>{manifest.question}</p>
          <p className="mt-2 text-xs bx-muted">{manifest.authors.join(', ')} · {manifest.year} · for {manifest.audience}</p>
        </div>
        <GingerMotif variant="hero" className="w-48 sm:w-64 mx-auto md:mx-0" />
      </section>

      <section className="mt-8 bx-card p-5" aria-labelledby="abstract-h" data-note-anchor="page:/">
        <h2 id="abstract-h" className="text-xl">In plain language</h2>
        <p className="bx-prose mt-2">{manifest.plain_abstract}</p>
        <p className="mt-2 text-xs bx-muted">Summary written by the builder of the review. The review's own abstract, and the review in full, are on <Link className="underline" to="/read">Read</Link>.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/read" className="bx-btn-primary">Start reading →</Link>
          <Link to="/recipes" className="bx-btn">Historical recipes</Link>
          <Link to="/methods" className="bx-btn">How it was made</Link>
        </div>
        <p className="mt-3 text-xs bx-muted">Reading time about {manifest.reading_minutes} minutes ({provenance.review.words.toLocaleString('en-GB')} words, {c.sections} numbered sections, {c.references} references). Current as of {AS_OF}. <Link className="underline" to="/methods#verification">How far each source was read →</Link></p>
      </section>

      <section className="mt-8" aria-labelledby="strands-h" data-note-anchor="page:/">
        <h2 id="strands-h" className="text-2xl bx-arc">Three records at once</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {STRANDS.map((s) => {
            const part = parts.find((p) => s.part.test(p.title));
            const secs = part ? sectionsIndex.filter((x) => x.in_part === part.id) : [];
            if (!part) return null;
            return (
              <li key={s.key} className="bx-card p-4 relative overflow-hidden">
                <span className="absolute left-0 top-0 h-full w-1.5" style={{ background: GROUP_COLOURS[s.key] }} aria-hidden="true" />
                <Link to={`/read#${part.id}`} className="font-display font-semibold underline text-[color:var(--bx-heading)]">{part.title}</Link>
                <ul className="mt-2 text-sm grid gap-0.5 bx-targets">{secs.map((x) => <li key={x.id}><Link className="hover:underline" to={`/read#${x.id}`}>{x.title}</Link></li>)}</ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm bx-targets">
          <Link className="underline" to={`/read#${parts.find((p) => /joining/i.test(p.title))?.id ?? ''}`}>Part V joins them</Link> — and the <Link className="underline" to="/recipes">{recipesIndex.length} historical recipes</Link> set the kitchen beside the chemistry.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="first-h" data-note-anchor="page:/">
        <h2 id="first-h" className="text-2xl bx-arc">Concepts to know first</h2>
        <p className="bx-prose mt-1">The ideas the review presumes, in the order it first needs them. All {conceptsIndex.length} are on <Link className="underline" to="/concepts">101s</Link>.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {conceptsIndex.map((u) => (
            <li key={u.id} className="bx-card p-3">
              <Link to={`/concepts/${u.id}`} className="font-semibold underline">{u.title}</Link>
              <p className="text-sm mt-1">{u.one_liner}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm bx-muted bx-targets">Also: <Link className="underline" to="/glossary">{provenance.terms.total} glossary terms</Link> · <Link className="underline" to="/figures">{c.figures} figures</Link> · <Link className="underline" to="/references">{c.references} references</Link> · <Link className="underline" to="/notes">your notes</Link>.</p>
    </div>
  );
}
