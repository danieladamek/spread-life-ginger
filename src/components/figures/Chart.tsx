import { useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { Figure } from '@/types';
import { downloadCsv, downloadSvgAsPng } from './download';

/**
 * `kind: chart` (APP-SPEC §4): rebuilt from the pack's data as an interactive Recharts chart — hover/focus
 * tooltips with exact values, units and the source reference of every bar; legend entries toggle their series;
 * a log/linear switch where the pack asks for one; PNG and CSV download. Colour never carries meaning alone: series
 * differ by fill pattern as well as hue, and every bar is labelled with its value. Missing values are gaps.
 */
const SERIES_FILL = ['rgb(var(--c-blue-deep))', 'rgb(var(--c-olive))', 'rgb(var(--c-butter))', 'rgb(var(--c-foliage))'];

type Row = Record<string, string | number | null>;

function Tip({ active, payload, label, unit, yLabel, refOf }: TooltipProps<number, string> & { unit: string; yLabel: string; refOf: (series: string | null, x: string) => string | null }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bx-card px-3 py-2 text-xs font-body bg-paper dark:bg-night shadow-md" data-testid="chart-tooltip">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => {
        const series = p.dataKey === '__y' ? null : String(p.dataKey);
        const ref = refOf(series, String(label));
        return <p key={String(p.dataKey)}>{series ? `${series}: ` : `${yLabel}: `}<span className="font-semibold tabular-nums">{p.value ?? '—'}</span>{unit ? ` ${unit}` : ''}{ref && <span className="bx-muted"> · ref [{ref}]</span>}</p>;
      })}
    </div>
  );
}

export default function Chart({ f, compact = false }: { f: Figure; compact?: boolean }) {
  const c = f.chart!;
  const wrap = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [log, setLog] = useState(!!c.log);
  const unit = c.y.unit ?? (/\(([^)]+)\)\s*$/.exec(c.y.label)?.[1] ?? '');
  // pivot long rows (x, series, y) into one row per x with a column per series
  const { data, series } = useMemo(() => {
    if (!c.series) return { data: f.rows.map((r) => ({ __x: r[c.x.field], __y: r[c.y.field], __ref: r.ref })) as Row[], series: [] as string[] };
    const order: string[] = [];
    const byX = new Map<string, Row>();
    for (const r of f.rows) {
      const x = String(r[c.x.field]); const s = String(r[c.series]);
      if (!order.includes(s)) order.push(s);
      if (!byX.has(x)) byX.set(x, { __x: x });
      byX.get(x)![s] = r[c.y.field];
      byX.get(x)![`__ref:${s}`] = r.ref;
    }
    return { data: [...byX.values()], series: order };
  }, [f.rows, c]);
  const refOf = (s: string | null, x: string) => { const row = data.find((d) => String(d.__x) === x); const v = row ? row[s ? `__ref:${s}` : '__ref'] : null; return v == null ? null : String(v); };
  const toggle = (s: string) => setHidden((h) => { const n = new Set(h); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  const height = compact ? 260 : 340;
  const pid = `${f.id}${compact ? '-c' : ''}`;
  const png = () => { const svg = wrap.current?.querySelector('svg.recharts-surface') as SVGSVGElement | null; if (svg) void downloadSvgAsPng(svg, `${f.id}.png`, getComputedStyle(document.body).backgroundColor); };
  const fields = f.fields;
  return (
    <div className="bx-chart" data-testid={`chart-${f.id}`}>
      <div className="flex flex-wrap items-center gap-1.5 no-print text-xs">
        {series.length > 0 && <span className="bx-muted mr-1" id={`legend-${pid}`}>Show:</span>}
        {series.map((s, i) => (
          <button key={s} type="button" className={`bx-btn !py-0.5 ${hidden.has(s) ? 'opacity-60 line-through' : ''}`} aria-pressed={!hidden.has(s)} onClick={() => toggle(s)} data-testid={`legend-${s}`}>
            <svg width="14" height="10" aria-hidden="true"><rect width="14" height="10" fill={i === 1 ? `url(#hatch-${pid})` : SERIES_FILL[i % SERIES_FILL.length]} stroke={SERIES_FILL[i % SERIES_FILL.length]} /></svg>{s}
          </button>
        ))}
        {c.log !== undefined && <button type="button" className="bx-btn !py-0.5" aria-pressed={log} onClick={() => setLog((l) => !l)}>{log ? 'Log scale' : 'Linear scale'}</button>}
        {!compact && <span className="ml-auto flex gap-1.5"><button type="button" className="bx-btn !py-0.5" onClick={png} data-testid="download-png">PNG</button><button type="button" className="bx-btn !py-0.5" onClick={() => downloadCsv(f.rows, fields, `${f.id}.csv`)} data-testid="download-csv">CSV</button></span>}
      </div>
      <div ref={wrap} className="mt-2" style={{ height }} role="img" aria-label={`${f.label}: ${f.title}. Bar chart of ${c.y.label} by ${c.x.label}${series.length ? `, for ${series.join(' and ')}` : ''}. Every value is listed in the data table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 12, bottom: 28, left: 8 }} barCategoryGap="22%">
            <defs>
              <pattern id={`hatch-${pid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill={SERIES_FILL[1]} opacity="0.35" />
                <line x1="0" y1="0" x2="0" y2="6" stroke={SERIES_FILL[1]} strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="__x" interval={0} tick={{ fontSize: 12 }} label={{ value: c.x.label, position: 'insideBottom', offset: -18 }} />
            <YAxis scale={log ? 'log' : 'auto'} domain={log ? ['auto', 'auto'] : [0, 'auto']} allowDataOverflow={false} tick={{ fontSize: 12 }} label={{ value: c.y.label, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, offset: 4 }} width={68} />
            <Tooltip cursor={{ fill: 'rgb(var(--c-paper-2) / 0.6)' }} content={<Tip unit={unit} yLabel={c.y.label} refOf={refOf} />} />
            {series.length > 0 && <Legend wrapperStyle={{ display: 'none' }} />}
            {series.length === 0
              ? <Bar dataKey="__y" name={c.y.label} fill={SERIES_FILL[0]} isAnimationActive={false}><LabelList dataKey="__y" position="top" style={{ fontSize: 12, fill: 'var(--bx-ink)' }} /></Bar>
              : series.map((s, i) => hidden.has(s) ? null : (
                <Bar key={s} dataKey={s} name={s} fill={i === 1 ? `url(#hatch-${pid})` : SERIES_FILL[i % SERIES_FILL.length]} stroke={SERIES_FILL[i % SERIES_FILL.length]} isAnimationActive={false}>
                  <LabelList dataKey={s} position="top" style={{ fontSize: 12, fill: 'var(--bx-ink)' }} />
                </Bar>
              ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
