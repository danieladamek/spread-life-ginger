import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Figure, PathwayEdge, PathwayNode } from '@/types';
import { loadTerms, useAsync } from '@/lib/heavy';
import Markdown, { inlineComponents } from '@/components/reader/Markdown';
import Cite, { Paragraph } from '@/components/reader/Cite';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * `kind: pathway` (APP-SPEC §4): the pack's nodes on their col/row grid and its edges, drawn by how well each step is
 * known — `shown` solid, `proposed` dashed, `chemical` dotted — with a key. The line pattern carries the meaning, so
 * it reads without colour. Every node is a button that opens its `detail` and `refs`; the steps are also listed as
 * text below the drawing, each with its citations. Nothing is drawn that the data file does not contain.
 */
const NODE_W = 156;
const NODE_H = 58;
const GAP_X = 112;
const GAP_Y = 46;
const PAD = 16;

export const EDGE_STYLE: Record<PathwayEdge['kind'], { dash?: string; cap: 'butt' | 'round'; width: number; label: string; note: string }> = {
  shown: { cap: 'butt', width: 2.25, label: 'Shown', note: 'demonstrated with ginger material or ginger enzymes' },
  proposed: { dash: '8 6', cap: 'butt', width: 2, label: 'Proposed', note: 'inferred from labelling or gene data; enzymes not yet shown' },
  chemical: { dash: '0.5 6', cap: 'round', width: 3, label: 'Chemical', note: 'not enzymatic: happens on heating or drying' },
};

function wrap(text: string, max = 17): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function EdgeKey() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Key to the arrows" data-testid="pathway-key">
      {(Object.keys(EDGE_STYLE) as PathwayEdge['kind'][]).map((k) => {
        const s = EDGE_STYLE[k];
        return (
          <li key={k} className="flex items-center gap-2" data-edge-kind={k}>
            <svg width="46" height="10" aria-hidden="true"><line x1="2" y1="5" x2="44" y2="5" stroke="currentColor" strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap={s.cap} /></svg>
            <span><span className="font-semibold">{s.label}</span> — {s.note}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Pathway({ f, compact = false }: { f: Figure; compact?: boolean }) {
  const g = f.graph;
  const terms = useAsync(loadTerms);
  const [sel, setSel] = useState<string | null>(null);
  if (!g) return <p className="bx-todo">pathway data missing</p>;
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const cols = Math.max(...g.nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...g.nodes.map((n) => n.row)) + 1;
  const W = PAD * 2 + cols * NODE_W + (cols - 1) * GAP_X;
  const H = PAD * 2 + rows * NODE_H + (rows - 1) * GAP_Y;
  const pos = (n: PathwayNode) => ({ x: PAD + n.col * (NODE_W + GAP_X), y: PAD + n.row * (NODE_H + GAP_Y) });
  // the row most nodes sit on: the main line of the pathway
  const rowCounts = g.nodes.reduce<Record<number, number>>((m, n) => { m[n.row] = (m[n.row] ?? 0) + 1; return m; }, {});
  const mainRow = Number(Object.entries(rowCounts).sort((x, y) => y[1] - x[1])[0][0]);
  const selected = sel ? byId.get(sel) ?? null : null;
  const onKey = (id: string) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel((s) => (s === id ? null : id)); } };
  const markerId = `arrow-${f.id}`;

  return (
    <div className="grid gap-3" data-testid={`pathway-${f.id}`}>
      <EdgeKey />
      <div className="overflow-x-auto bx-tablewrap" tabIndex={-1}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block" style={{ minWidth: compact ? 640 : 760, width: '100%' }} role="group" aria-label={`${f.label}: ${f.title}. Each box is a button that opens its evidence.`} data-testid="pathway-svg">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--bx-ink)" />
            </marker>
          </defs>
          {g.edges.map((e, i) => {
            const a = byId.get(e.from); const b = byId.get(e.to);
            if (!a || !b) return null;
            const pa = pos(a); const pb = pos(b);
            const x1 = pa.x + NODE_W; const y1 = pa.y + NODE_H / 2;
            const x2 = pb.x - 3; const y2 = pb.y + NODE_H / 2;
            const s = EDGE_STYLE[e.kind];
            const lines = e.label ? wrap(e.label, 14) : [];
            // An edge on the main row runs straight, labelled above its middle. An edge that leaves the main row turns
            // just after its source; one that joins it turns just before its target. So the gap's middle stays clear
            // for the straight edge's label, and each bent edge is labelled on its own off-row stretch.
            let d: string; let lx: number; let ly: number;
            if (y1 === y2) { d = `M${x1},${y1} H${x2}`; lx = (x1 + x2) / 2; ly = y1 - 8 - (lines.length - 1) * 12; }
            else {
              const leaving = a.row === mainRow;
              const tx = leaving ? x1 + 18 : x2 - 18;
              const r = Math.min(10, Math.abs(y2 - y1) / 2);
              const sy = Math.sign(y2 - y1);
              d = `M${x1},${y1} H${tx - r} Q${tx},${y1} ${tx},${y1 + sy * r} V${y2 - sy * r} Q${tx},${y2} ${tx + r},${y2} H${x2}`;
              const offY = leaving ? y2 : y1;
              lx = leaving ? (tx + x2) / 2 : (x1 + tx) / 2;
              ly = offY - 8 - (lines.length - 1) * 12;
            }
            return (
              <g key={i} data-testid={`pathway-edge-${e.from}-${e.to}`} data-edge-kind={e.kind}>
                <title>{`${a.label} → ${b.label}: ${s.label.toLowerCase()} step${e.label ? ` (${e.label})` : ''}`}</title>
                <path d={d} fill="none" stroke="var(--bx-ink)" strokeOpacity={0.85} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap={s.cap} markerEnd={`url(#${markerId})`} />
                {lines.length > 0 && (
                  <text x={lx} y={ly} textAnchor="middle" fontSize="11" fill="var(--bx-muted)" style={{ paintOrder: 'stroke', stroke: 'var(--bx-bg)', strokeWidth: 4 }}>
                    {lines.map((l, k) => <tspan key={k} x={lx} dy={k === 0 ? 0 : 12}>{l}</tspan>)}
                  </text>
                )}
              </g>
            );
          })}
          {g.nodes.map((n) => {
            const p = pos(n);
            const on = sel === n.id;
            const lines = wrap(n.label, 20);
            return (
              <g key={n.id} role="button" tabIndex={0} aria-pressed={on} aria-label={`${n.label} — open its evidence`} data-testid={`pathway-node-${n.id}`} data-node-kind={n.kind}
                onClick={() => setSel((s) => (s === n.id ? null : n.id))} onKeyDown={onKey(n.id)} className="cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-[color:var(--bx-accent)]">
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={10}
                  fill={n.kind === 'product' ? 'rgb(var(--c-butter) / 0.28)' : n.kind === 'side' ? 'var(--bx-bg-2)' : 'var(--bx-card)'}
                  stroke={on ? 'var(--bx-accent)' : 'var(--bx-line)'} strokeWidth={on ? 3 : 1.5} />
                <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 - (lines.length - 1) * 7.5 + 4.5} textAnchor="middle" fontSize="13" fontWeight={n.kind === 'product' ? 700 : 500} fill="var(--bx-ink)">
                  {lines.map((l, k) => <tspan key={k} x={p.x + NODE_W / 2} dy={k === 0 ? 0 : 15}>{l}</tspan>)}
                </text>
                <text x={p.x + NODE_W - 8} y={p.y + 14} textAnchor="end" fontSize="11" fill="var(--bx-muted)" aria-hidden="true">ⓘ</text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected && (
        <div className="bx-foldout" role="region" aria-live="polite" aria-label={`Evidence for ${selected.label}`} data-testid="pathway-detail" data-note-anchor={`figure:${f.id}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{selected.label} <span className="font-normal text-xs bx-muted">({selected.kind})</span></p>
            <button type="button" className="bx-btn !py-0.5 !px-2 text-xs" onClick={() => setSel(null)} aria-label={`Close ${selected.label}`}>Close</button>
          </div>
          {selected.detail_md && <div className="mt-1"><Markdown md={selected.detail_md} components={inlineComponents} /></div>}
          {selected.refs.length > 0 && <div className="mt-2 text-sm"><Paragraph><span className="font-semibold">Evidence: </span><Cite ns={selected.refs} label={`[${selected.refs.join(', ')}]`} /></Paragraph></div>}
          {selected.term && <p className="mt-1 text-xs"><Link className="underline" to={`/glossary#${selected.term}`}>Glossary: {terms?.get(selected.term)?.term ?? selected.term} →</Link></p>}
        </div>
      )}

      {!compact && (
        <section aria-labelledby={`steps-${f.id}`} className="text-sm">
          <h2 id={`steps-${f.id}`} className="text-lg">The steps, in words</h2>
          <ol className="mt-1 grid gap-1.5 list-decimal pl-5" data-testid="pathway-steps">
            {g.edges.map((e, i) => (
              <li key={i} className="bx-noteable" data-edge-kind={e.kind}>
                <Paragraph inline>
                  {byId.get(e.from)?.label} → {byId.get(e.to)?.label}
                  {e.label ? <>: {e.label}</> : null} — <span className="font-semibold">{EDGE_STYLE[e.kind].label.toLowerCase()}</span>
                  {e.refs.length > 0 && <> <Cite ns={e.refs} label={`[${e.refs.join(', ')}]`} /></>}
                </Paragraph>
              </li>
            ))}
          </ol>
          {g.note && <p className="mt-2 text-xs bx-muted">From the data file: {g.note}</p>}
          <p className="mt-2 no-print"><NoteThis anchor={{ type: 'figure', id: f.id }} label={f.label} /></p>
        </section>
      )}
    </div>
  );
}
