import { Link, useParams } from 'react-router-dom';
import type { Concept as ConceptT } from '@/types';
import { getConcept, getFigure, sectionTitle } from '@/lib/data';
import ReaderFigure from '@/components/reader/ReaderFigure';
import Todo from '@/components/ui/Todo';
import { loadConcepts, loadTerms, useAsync } from '@/lib/heavy';
import Markdown from '@/components/reader/Markdown';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * One 101 (APP-SPEC §2 /concepts/:id): what it is, why the review needs it, how the review uses it, its figure (where
 * the pack names one), further reading. manifest.concept_self_checks is false, so the page ends after the further
 * reading — no questions, no heading for them, no empty state. Where the pack supplies no diagram, an amber
 * TODO(author) says so; the build draws none of its own (KICKOFF §1).
 */
export default function Concept() {
  const { id = '' } = useParams();
  const all = useAsync(loadConcepts);
  const terms = useAsync(loadTerms);
  const meta = getConcept(id);
  if (!meta) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl">101 not found</h1><p className="mt-2"><Link className="underline" to="/concepts">All 101s →</Link></p></div>;
  const c: ConceptT | undefined = all?.find((x) => x.id === id);
  const others = c?.sections.filter((s) => s.key !== 'what' && s.key !== 'uses') ?? [];
  const sec = (key: string) => c?.sections.find((s) => s.key === key);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 bx-101" data-note-anchor={`concept:${id}`}>
      <p className="text-sm"><Link className="underline" to="/concepts">← All 101s</Link></p>
      <h1 className="text-3xl sm:text-4xl mt-2">{meta.title}</h1>
      <p className="mt-2 text-lg font-display">{meta.one_liner}</p>
      {!c ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <>
          <div className="bx-banner mt-5"><span className="font-semibold">Why the review needs it: </span><Markdown md={c.why_here_md} className="inline [&>p]:inline" /></div>
          {sec('what') && <section aria-labelledby="what-h"><h2 id="what-h" className="bx-noteable">What it is <NoteThis anchor={{ type: 'concept', id, heading: 'what-h' }} label="What it is" /></h2><Markdown md={sec('what')!.md} math={sec('what')!.hasMath} /></section>}
          {others.map((s) => <section key={s.key} aria-labelledby={`h-${s.key}`}><h2 id={`h-${s.key}`} className="bx-noteable">{s.heading} <NoteThis anchor={{ type: 'concept', id, heading: `h-${s.key}` }} label={s.heading} /></h2><Markdown md={s.md} math={s.hasMath} /></section>)}
          {sec('uses') && <section aria-labelledby="uses-h"><h2 id="uses-h" className="bx-noteable">{sec('uses')!.heading} <NoteThis anchor={{ type: 'concept', id, heading: 'uses-h' }} label={sec('uses')!.heading} /></h2><Markdown md={sec('uses')!.md} math={sec('uses')!.hasMath} /></section>}
          <section aria-labelledby="pic-h"><h2 id="pic-h">The key idea in one picture</h2>
            {c.figures.length > 0
              ? c.figures.map((f) => <ReaderFigure key={f} id={f} />)
              : <p><Todo>TODO(author): no diagram supplied in the content pack for this 101</Todo></p>}
          </section>
          {c.why_sections.length > 0 && <p className="text-sm bx-targets">Read it in the review: {c.why_sections.map((s) => <Link key={s} className="underline mr-2" to={`/read#${s}`}>{sectionTitle(s)}</Link>)}</p>}
          <section aria-labelledby="links-h"><h2 id="links-h">Connections</h2>
            {c.prerequisites.length > 0 && <p className="text-sm">Before this: {c.prerequisites.map((p) => <Link key={p} className="underline mr-2" to={`/concepts/${p}`}>{getConcept(p)?.title ?? p}</Link>)}</p>}
            {c.terms.length > 0 && <p className="text-sm mt-1">Terms: {c.terms.map((t) => <Link key={t} className="underline mr-2" to={`/glossary#${t}`}>{terms?.get(t)?.term ?? t}</Link>)}</p>}
            {c.from_figures.length > 0 && <p className="text-sm mt-1">Figures: {c.from_figures.map((f) => <Link key={f} className="underline mr-2" to={`/figures/${f}`}>{getFigure(f)?.label ?? f}</Link>)}</p>}
            {c.cites.length > 0 && <p className="text-sm mt-1">References cited here: {c.cites.map((n) => <Link key={n} className="underline mr-1" to={`/references#ref-${n}`}>[{n}]</Link>)}</p>}
          </section>
          <section aria-labelledby="fr-h"><h2 id="fr-h">Further reading</h2>
            <ul>{c.further_reading.map((r) => <li key={r.url}><a className="underline" href={r.url} target="_blank" rel="noreferrer">{r.title}</a>{r.kind && <span className="bx-muted text-xs"> · {r.kind}</span>}</li>)}</ul>
          </section>
          <p className="mt-8 no-print"><NoteThis anchor={{ type: 'concept', id }} label="this 101" variant="button" /></p>
        </>
      )}
    </div>
  );
}
