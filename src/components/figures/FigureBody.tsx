import { lazy, Suspense } from 'react';
import type { Figure } from '@/types';
import DataTable from './DataTable';
import ExplainChips from './ExplainChips';
import Todo from '@/components/ui/Todo';
import Pathway from './Pathway';
import { assetUrl } from '@/lib/data';
const Chart = lazy(() => import('./Chart'));

/** One component per figure kind (APP-SPEC §4). This pack has charts, tables and a pathway; ⓘs come from explain[]. */
export default function FigureBody({ f, compact = false }: { f: Figure; compact?: boolean }) {
  return (
    <div className="grid gap-3">
      <ExplainChips items={f.explain} figure={f.id} />
      {f.kind === 'chart' && f.chart && (
        <>
          <Suspense fallback={<div style={{ height: compact ? 260 : 340 }} className="bx-muted text-sm" role="status">Drawing the chart…</div>}><Chart f={f} compact={compact} /></Suspense>
          {!compact && <details className="text-sm"><summary className="cursor-pointer bx-muted">The values as a table</summary><div className="mt-2"><DataTable figure={f} /></div></details>}
        </>
      )}
      {f.kind === 'table' && <DataTable figure={f} inline={compact} />}
      {f.kind === 'image' && f.image && (
        <div className="relative">
          <img src={assetUrl(`figures/${f.image.split('/').pop()}`)} alt={f.title} className="w-full rounded-lg" />
          {(f.hotspots ?? []).map((h, i) => <span key={i} className="absolute border-2 border-[color:var(--bx-accent)] rounded" style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }} title={h.text} />)}
        </div>
      )}
      {f.kind === 'pathway' && <Pathway f={f} compact={compact} />}
      {f.kind === 'network' && <Todo>figure kind network: no such figure in this pack</Todo>}
    </div>
  );
}
