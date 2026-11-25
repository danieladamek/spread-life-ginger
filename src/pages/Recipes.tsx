import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { recipesIndex, type RecipeMeta } from '@/lib/data';
import HealthNotice from '@/components/ui/HealthNotice';
import NoteThis from '@/components/notepad/NoteThis';

const KINDS = [['all', 'Every kind'], ['culinary', 'Culinary'], ['medicinal', 'Medicinal']] as const;

/**
 * /recipes (KICKOFF §8.5, K45): culinary and medicinal recipes from dated historical sources, each cited and set
 * beside the review's evidence. Filters for kind and tradition, sorted by date (oldest first by default); the
 * filters live in the URL (?kind=…&tradition=…&order=…) so a view can be shared. Nothing here is a modern
 * adaptation: no servings, quantities, timings or method steps are added, and every medicinal recipe is labelled as
 * a historical document, not advice.
 */
export default function Recipes() {
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? 'all';
  const tradition = params.get('tradition') ?? 'all';
  const order = params.get('order') === 'newest' ? 'newest' : 'oldest';
  const set = (k: string, v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v === 'all' || (k === 'order' && v === 'oldest')) n.delete(k); else n.set(k, v); return n; }, { replace: true });
  const traditions = useMemo(() => [...new Set(recipesIndex.map((r) => r.tradition))].sort((a, b) => a.localeCompare(b)), []);
  const shown = useMemo(() => {
    const xs = recipesIndex.filter((r) => (kind === 'all' || r.kind === kind) && (tradition === 'all' || r.tradition === tradition));
    const dir = order === 'newest' ? -1 : 1;
    return [...xs].sort((a, b) => dir * (a.date_sort - b.date_sort) || a.title.localeCompare(b.title));
  }, [kind, tradition, order]);
  const n = (k: string) => recipesIndex.filter((r) => r.kind === k).length;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Recipes from the historical record</h1>
      <p className="bx-prose mt-2">
        {recipesIndex.length} recipes that name ginger ({n('culinary')} culinary, {n('medicinal')} medicinal), from dated historical sources. Each has its
        source, its original wording where the source is in the public domain and was captured, a gloss or paraphrase, and what the review's evidence
        says about the ginger in it. They are documents of what people did, not instructions: nothing has been adapted, and no quantity, serving or step
        has been added.
      </p>
      <HealthNotice className="mt-4" />
      <div className="mt-5 grid gap-2 no-print" role="search" aria-label="Filter recipes">
        <div role="group" aria-label="Kind" className="flex flex-wrap gap-1">
          {KINDS.map(([k, l]) => <button key={k} type="button" className={`bx-btn !py-1 ${kind === k ? 'bx-btn-on' : ''}`} aria-pressed={kind === k} onClick={() => set('kind', k)} data-testid={`kind-${k}`}>{l}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="rc-tradition" className="bx-muted">Tradition</label>
          <select id="rc-tradition" className="bx-input !w-auto" value={tradition} onChange={(e) => set('tradition', e.target.value)} data-testid="tradition">
            <option value="all">every tradition</option>
            {traditions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label htmlFor="rc-order" className="bx-muted">Date</label>
          <select id="rc-order" className="bx-input !w-auto" value={order} onChange={(e) => set('order', e.target.value)} data-testid="order">
            <option value="oldest">oldest first</option>
            <option value="newest">newest first</option>
          </select>
          <span className="bx-muted" role="status" data-testid="recipe-count">{shown.length} of {recipesIndex.length} shown</span>
        </div>
        <p className="text-xs bx-muted">Sources dated only by era (classical, Roman, medieval) sort before the dated ones, in that order. The date shown is the source's own.</p>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="recipe-list">
        {shown.map((r) => <Card key={r.id} r={r} />)}
      </ul>
      <p className="mt-8 text-sm bx-targets"><Link className="underline" to="/read#6-europe-to-the-americas">The review: Europe to the Americas →</Link> · <Link className="underline" to="/read#15-from-rhizome-to-kitchen">From rhizome to kitchen →</Link></p>
    </div>
  );
}

function Card({ r }: { r: RecipeMeta }) {
  return (
    <li className="bx-card p-4 bx-noteable relative overflow-hidden" data-note-anchor={`recipe:${r.id}`} data-testid="recipe-card" data-kind={r.kind}>
      <div className="bx-dome absolute -right-10 -bottom-16 h-28 w-40 bg-paper-2 dark:bg-night opacity-80" aria-hidden="true" />
      <div className="relative">
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="bx-status">{r.kind}</span>
          {r.kind === 'medicinal' && <span className="bx-historical" data-testid="historical-label">historical document, not advice</span>}
        </p>
        <h2 className="mt-2 text-xl"><Link className="underline" to={`/recipes/${r.id}`}>{r.title}</Link></h2>
        <p className="mt-1 text-sm">{r.date} · {r.place}</p>
        <p className="mt-1 text-xs bx-muted">{r.tradition} · {r.has_original ? `original text in ${r.original_language}` : 'paraphrase'}</p>
        <p className="mt-2 text-xs"><NoteThis anchor={{ type: 'recipe', id: r.id }} label={r.title} /></p>
      </div>
    </li>
  );
}
