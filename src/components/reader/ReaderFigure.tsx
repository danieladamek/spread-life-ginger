import { Link } from 'react-router-dom';
import { getFigure } from '@/lib/data';
import { loadFigures, useAsync } from '@/lib/heavy';
import FigureBody from '@/components/figures/FigureBody';
import Markdown, { inlineComponents } from './Markdown';

/** A figure embedded where the review's <!-- figure: id --> marker sits: the interactive figure, compact. */
export default function ReaderFigure({ id }: { id: string }) {
  const meta = getFigure(id);
  const figs = useAsync(loadFigures);
  const f = figs?.find((x) => x.id === id);
  if (!meta) return <p><span className="bx-todo">figure {id} is not in figures.yaml</span></p>;
  return (
    <figure className="bx-card p-3 my-6 not-prose text-base font-body" aria-labelledby={`rf-${id}`} data-testid={`reader-figure-${id}`} data-note-anchor={`figure:${id}`}>
      <figcaption id={`rf-${id}`} className="text-sm">
        <span className="font-semibold">{meta.label}.</span> {meta.title}{' '}
        <span className="bx-muted">(synthesised by the builder from {meta.synthesis === 'data' ? 'values reported in' : ''} refs {meta.refs.map((n) => `[${n}]`).join(' ')})</span>
      </figcaption>
      <div className="mt-2" style={{ minHeight: 200 }}>
        {f ? <FigureBody f={f} compact /> : <p className="bx-muted text-sm" role="status">Loading figure…</p>}
      </div>
      {f && <div className="mt-2 text-xs bx-muted"><Markdown md={f.caption_md} components={inlineComponents} /></div>}
      <p className="mt-2 text-xs bx-targets"><Link className="underline font-semibold" to={`/figures/${id}`}>Open the figure page — how to read it, sources, downloads →</Link></p>
    </figure>
  );
}
