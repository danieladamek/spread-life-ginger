import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFigure } from '@/lib/data';
import { loadFigures, useAsync } from '@/lib/heavy';
import FigureBody from '@/components/figures/FigureBody';
import Markdown, { inlineComponents } from './Markdown';

/**
 * A figure embedded where the review's <!-- figure: id --> marker sits: the interactive figure, compact. The figure
 * body is drawn when it comes within about a screen of the viewport (the review carries seven inline figures, and
 * drawing them all on load held up the reader); the caption, label and link are there from the start.
 */
export default function ReaderFigure({ id }: { id: string }) {
  const meta = getFigure(id);
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const figs = useAsync(loadFigures);
  const f = figs?.find((x) => x.id === id);
  if (!meta) return <p><span className="bx-todo">figure {id} is not in figures.yaml</span></p>;
  return (
    <figure className="bx-card p-3 my-6 not-prose text-base font-body" aria-labelledby={`rf-${id}`} data-testid={`reader-figure-${id}`} data-note-anchor={`figure:${id}`}>
      <figcaption id={`rf-${id}`} className="text-sm">
        <span className="font-semibold">{meta.label}.</span> {meta.title}{' '}
        <span className="bx-muted">(synthesised by the builder from {meta.synthesis === 'data' ? 'values reported in' : ''} refs {meta.refs.map((n) => `[${n}]`).join(' ')})</span>
      </figcaption>
      <div ref={box} className="mt-2" style={{ minHeight: 200 }}>
        {f && near ? <FigureBody f={f} compact /> : <p className="bx-muted text-sm" role="status">{near ? 'Loading figure…' : 'The figure is drawn as you reach it.'}</p>}
      </div>
      {f && <div className="mt-2 text-xs bx-muted"><Markdown md={f.caption_md} components={inlineComponents} /></div>}
      <p className="mt-2 text-xs bx-targets"><Link className="underline font-semibold" to={`/figures/${id}`}>Open the figure page — how to read it, sources, downloads →</Link></p>
    </figure>
  );
}
