import { Link, useParams } from 'react-router-dom';
import { getConcept, getFigure, sectionTitle } from '@/lib/data';
import { loadFigures, useAsync } from '@/lib/heavy';
import FigureBody from '@/components/figures/FigureBody';
import Markdown, { inlineComponents } from '@/components/reader/Markdown';
import { CitationList } from '@/components/reader/RefLinks';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * One figure (APP-SPEC §4, §6 rule 3): interactive, with its provenance — synthesised from data across cited works, or
 * a conceptual diagram — the references it was made from, the caption, how to read it and its ⓘ notes.
 */
export default function Figure() {
  const { id = '' } = useParams();
  const meta = getFigure(id);
  const figs = useAsync(loadFigures);
  const f = figs?.find((x) => x.id === id);
  if (!meta) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl">Figure not found</h1><p className="mt-2"><Link className="underline" to="/figures">All figures →</Link></p></div>;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8" data-note-anchor={`figure:${id}`}>
      <p className="text-sm"><Link className="underline" to="/figures">← All figures</Link></p>
      <p className="mt-3 text-xs bx-muted">{meta.label} · {meta.kind}</p>
      <h1 className="text-3xl sm:text-4xl mt-1">{meta.title}</h1>
      <section className="bx-card p-3 mt-4 text-sm" aria-label="Provenance">
        <p data-testid="figure-provenance"><span className="font-semibold">Provenance:</span> {meta.synthesis === 'data' ? 'synthesised by the builder from values reported in the cited works — rebuilt from data, not a reproduced image; not a meta-analysis.' : 'a conceptual diagram drawn by the builder from the cited works.'}</p>
        {f && <div className="mt-1 bx-muted"><Markdown md={f.source_md} components={inlineComponents} /></div>}
        <div className="mt-2"><span className="font-semibold">Made from: </span><CitationList ns={meta.refs} /></div>
      </section>
      <div className="mt-4 bx-card p-4" style={{ minHeight: 360 }}>
        {f ? <FigureBody f={f} /> : <p className="bx-muted" role="status">Loading figure…</p>}
      </div>
      {f && (
        <>
          <section className="mt-6" aria-labelledby="cap-h"><h2 id="cap-h" className="text-xl">Caption</h2><Markdown md={f.caption_md} className="bx-prose mt-1 bx-note" /></section>
          <section className="mt-6" aria-labelledby="htr-h"><h2 id="htr-h" className="text-xl">How to read this figure</h2><Markdown md={f.how_md} className="bx-prose mt-1 bx-note" /></section>
          <section className="mt-6" aria-labelledby="cn-h"><h2 id="cn-h" className="text-xl">Concepts in this figure</h2>
            <p className="mt-1 flex flex-wrap gap-2">{f.concepts.map((c) => <Link key={c} className="bx-btn" to={`/concepts/${c}`}>{getConcept(c)?.title ?? c}</Link>)}</p></section>
          <section className="mt-6" aria-labelledby="wd-h"><h2 id="wd-h" className="text-xl">Where it is discussed</h2>
            <p className="mt-1 flex flex-wrap gap-2">{f.discussed_in.map((s) => <Link key={s} className="bx-btn" to={`/read#${s}`}>{sectionTitle(s)}</Link>)}</p></section>
          <p className="mt-6 no-print"><NoteThis anchor={{ type: 'figure', id }} label={meta.label} variant="button" /></p>
        </>
      )}
    </div>
  );
}
