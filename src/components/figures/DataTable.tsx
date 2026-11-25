import { useMemo, useState } from 'react';
import type { Figure } from '@/types';
import { downloadCsv } from './download';
import { Link } from 'react-router-dom';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * Sortable, filterable table (APP-SPEC §4 `kind: table`), from thyroid-molecular-markers' DataTable. Cells are the
 * pack's own values, rendered plainly. Every column sorts (numeric-aware text order); the filter matches any cell.
 * The `ref` column every synthesised figure carries (CONTENT-PACK, figures under mode: topic) links to its
 * reference, so every row is traceable. The CSV is the pack's own data file.
 */
export default function DataTable({ figure, inline = false }: { figure: Figure; inline?: boolean }) {
  const cols = figure.fields.map((f) => ({ field: f, label: f === 'ref' ? 'Source ref.' : f.replace(/_/g, ' ') }));
  const [sort, setSort] = useState<{ field: string; dir: 'asc' | 'desc' } | null>(null);
  const [q, setQ] = useState('');
  // rows keep their index in the paper's order: a row anchor (`row:<figure>:<i>`) survives sorting and filtering
  const shown = useMemo(() => {
    let r = figure.rows.map((row, i) => ({ ...row, __i: i } as Record<string, string | number | null> & { __i: number }));
    if (q.trim()) { const needle = q.toLowerCase(); r = r.filter((row) => Object.entries(row).some(([k, v]) => k !== '__i' && String(v ?? '').toLowerCase().includes(needle))); }
    if (sort) r = [...r].sort((a, b) => { const cmp = String(a[sort.field] ?? '').localeCompare(String(b[sort.field] ?? ''), 'en', { numeric: true }); return sort.dir === 'asc' ? cmp : -cmp; });
    return r;
  }, [figure.rows, q, sort]);
  const fid = `${figure.id}${inline ? '-inline' : ''}`;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 no-print">
        <label className="sr-only" htmlFor={`filter-${fid}`}>Filter rows of {figure.label}</label>
        <input id={`filter-${fid}`} className="bx-input max-w-xs" placeholder="Filter rows…" value={q} onChange={(e) => setQ(e.target.value)} data-testid={`table-filter-${figure.id}`} />
        <span className="text-xs bx-muted" role="status">{shown.length} of {figure.rows.length} rows</span>
        {sort && <button type="button" className="bx-btn !py-0.5 text-xs" onClick={() => setSort(null)}>Original order</button>}
        {!inline && <button type="button" className="bx-btn ml-auto" onClick={() => downloadCsv(figure.rows, cols.map((c) => c.field), `${figure.id}.csv`)}>CSV</button>}
      </div>
      <div className="mt-2 overflow-x-auto bx-tablewrap" tabIndex={0} role="region" aria-label={`${figure.label} (scrolls sideways)`}>
        <table className="w-full text-sm border-collapse" data-testid={`table-${figure.id}`}>
          <caption className="sr-only">{figure.label}: {figure.title}</caption>
          <thead>
            <tr>
              {cols.map((c) => {
                const active = sort?.field === c.field;
                return (
                  <th key={c.field} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} className="border-b-2 border-[color:var(--bx-line)] px-2 py-1.5 text-left align-bottom font-semibold bg-paper-2/60 dark:bg-night-2/60">
                    <button type="button" className="underline decoration-dotted underline-offset-2 text-left" onClick={() => setSort((s) => (s?.field === c.field ? (s.dir === 'asc' ? { field: c.field, dir: 'desc' } : null) : { field: c.field, dir: 'asc' }))} aria-label={`${c.label} — sort`}>
                      {c.label} <span aria-hidden="true">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.__i} className="bx-noteable odd:bg-paper-card/60 dark:odd:bg-night-2/40 align-top" data-note-anchor={`row:${figure.id}:${r.__i}`} data-testid={`row-${figure.id}-${r.__i}`}>
                {cols.map((c, j) => j === 0
                  ? <th key={c.field} scope="row" className="border-b border-[color:var(--bx-line)] px-2 py-1.5 text-left font-semibold">{String(r[c.field] ?? '')} <NoteThis anchor={{ type: 'row', id: `${figure.id}:${r.__i}` }} label={`${figure.label}, row ${r.__i + 1}`} /></th>
                  : <td key={c.field} className="border-b border-[color:var(--bx-line)] px-2 py-1.5 tabular-nums">{c.field === 'ref' && r[c.field] != null ? String(r[c.field]).split(/[,;]\s*/).map((n) => <Link key={n} className="underline mr-1" to={`/references#ref-${n}`} aria-label={`Reference ${n}`}>[{n}]</Link>) : r[c.field] == null ? <span className="bx-muted" aria-label="no value">—</span> : String(r[c.field])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
