import { Link } from 'react-router-dom';
import { sectionsIndex, shortSectionTitle } from '@/lib/data';

/** Section navigation: sticky rail on ≥1280 px, a select box below. Parts are group headings. `active` = id in view. */
export default function SectionRail({ active, variant }: { active: string | null; variant: 'rail' | 'select' }) {
  if (variant === 'select') {
    return (
      <div className="no-print font-body">
        <label htmlFor="section-select" className="sr-only">Jump to section</label>
        <select id="section-select" className="bx-input" value={active ?? ''} onChange={(e) => { const id = e.target.value; if (id) { document.getElementById(id)?.scrollIntoView(); history.replaceState(null, '', `#${id}`); } }}>
          <option value="">Jump to section…</option>
          {sectionsIndex.map((s) => s.part
            ? <option key={s.id} value={s.id}>— {s.title} —</option>
            : <option key={s.id} value={s.id}>{s.number ? `${s.number}. ` : ''}{shortSectionTitle(s)}</option>)}
        </select>
      </div>
    );
  }
  return (
    <nav aria-label="Sections" className="bx-rail text-sm font-body">
      <ol className="grid gap-0.5">
        {sectionsIndex.map((s) => (
          <li key={s.id} className={s.part ? 'mt-3 first:mt-0' : ''}>
            <Link to={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}
              className={`flex gap-1 rounded px-2 py-0.5 leading-5 hover:bg-paper-2 dark:hover:bg-night-2 ${s.part ? 'text-[11px] uppercase tracking-wider font-semibold text-[color:var(--bx-heading)]' : active === s.id ? 'font-semibold bg-paper-2 dark:bg-night-2' : 'bx-muted'}`}>
              <span className="min-w-0 flex-1">{s.number && <span className="tabular-nums mr-1">{s.number}</span>}{shortSectionTitle(s)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
