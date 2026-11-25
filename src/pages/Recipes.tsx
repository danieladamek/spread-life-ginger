import { Link } from 'react-router-dom';
import { loadRecipes, useAsync } from '@/lib/heavy';
import { longDate } from '@/lib/data';
import HealthNotice from '@/components/ui/HealthNotice';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * /recipes (KICKOFF §8.5): culinary and medicinal recipes from dated historical sources, each cited and set beside
 * the review's evidence. Nothing here is a modern adaptation: no servings, quantities, timings or method steps are
 * added, and a medicinal recipe is labelled as a historical document, not advice.
 */
export default function Recipes() {
  const file = useAsync(loadRecipes);
  const rs = file?.recipes ?? [];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Recipes from the historical record</h1>
      <p className="bx-prose mt-2">
        Recipes that name ginger, from dated historical sources, each with its source, its original wording where the source can be reproduced, a gloss,
        and what the review's evidence says about the ginger in it. They are documents of what people did, not instructions: nothing has been adapted,
        and no quantity, serving or step has been added.
      </p>
      <HealthNotice className="mt-4" />
      {file?.status && <p className="mt-3 text-xs bx-muted">Collection status{file.as_of ? ` (${longDate(file.as_of)})` : ''}: {file.status}</p>}
      {!file ? <p className="mt-6 bx-muted" role="status">Loading…</p> : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {rs.map((r) => (
            <li key={r.id} className="bx-card p-4 bx-noteable relative overflow-hidden" data-note-anchor={`recipe:${r.id}`} data-testid="recipe-card">
              <div className="bx-dome absolute -right-10 -bottom-16 h-28 w-40 bg-paper-2 dark:bg-night opacity-80" aria-hidden="true" />
              <div className="relative">
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="bx-status">{r.kind}</span>
                  {r.kind === 'medicinal' && <span className="bx-historical" data-testid="historical-label">historical document, not advice</span>}
                </p>
                <h2 className="mt-2 text-xl"><Link className="underline" to={`/recipes/${r.id}`}>{r.title}</Link></h2>
                <p className="mt-1 text-sm">{r.date} · {r.place}</p>
                <p className="mt-2 text-xs bx-muted">Ginger: {r.ginger_form.replace(/-/g, ', ')} · {r.heated ? 'heated' : 'not heated'}</p>
                <p className="mt-2 text-xs"><NoteThis anchor={{ type: 'recipe', id: r.id }} label={r.title} /></p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm bx-targets"><Link className="underline" to="/read#6-europe-to-the-americas">The review: Europe to the Americas →</Link> · <Link className="underline" to="/read#15-from-rhizome-to-kitchen">From rhizome to kitchen →</Link></p>
    </div>
  );
}
