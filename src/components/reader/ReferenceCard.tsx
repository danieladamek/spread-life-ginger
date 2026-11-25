import { Link } from 'react-router-dom';
import type { Reference } from '@/types';
import { doiUrl, getConcept, getFigure, getRecipe, sectionLabel } from '@/lib/data';
import Todo from '@/components/ui/Todo';
import { AnchorChip, LevelChip, PrimaryChip, TierChip } from '@/components/ui/Chips';

const ROLE: Record<string, string> = {
  support: 'Supports a claim', method: 'Method source', contrast: 'Contrast / disagreement', 'prior-result': 'Prior result',
  'data-source': 'Data source', background: 'Background source', guideline: 'Guideline / regulatory', review: 'Review', consensus: 'Consensus statement',
};

/**
 * Summary card for fold-outs and /references. Summaries come only from the pack; a missing one shows amber, never a
 * blank and never an invented summary. Every card says how far the builder read the source (its `verified_level`,
 * and the pack's `read_note` saying exactly what was read), and an
 * unverified one says "not verified — summary from abstract/metadata only" (APP-SPEC §6.1 rule 7).
 */
export default function ReferenceCard({ r, compact = false }: { r: Reference; compact?: boolean }) {
  const href = r.doi ? doiUrl(r.doi) : r.url;
  return (
    <div data-testid={`ref-card-${r.n}`} data-note-anchor={`ref:${r.n}`} className="font-body">
      <p className="text-sm"><span className="font-semibold">[{r.n}]</span> {r.citation} {href && <a className="underline break-all" href={href} target="_blank" rel="noreferrer">{r.doi ? `doi:${r.doi}` : 'link'}</a>}</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <TierChip tier={r.tier} />
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{ROLE[r.role_here] ?? r.role_here}</span>
        {r.anchor && <AnchorChip />}
        {r.primary_source && <PrimaryChip />}
        <LevelChip level={r.verified_level} />
        {!r.verified && <Todo>not verified — summary from abstract/metadata only</Todo>}
      </p>
      {r.summary.trim()
        ? <p className={`mt-2 ${compact ? 'text-sm leading-6' : 'bx-prose'}`}>{r.summary}</p>
        : <p className="mt-2"><Todo>summary pending</Todo></p>}
      {r.why_it_mattered && <p className="mt-2 text-sm"><span className="font-semibold">Why it mattered: </span>{r.why_it_mattered}</p>}
      {r.read_note && <p className="mt-2 text-xs bx-muted" data-testid="read-note"><span className="font-semibold">What was read: </span>{r.read_note}</p>}
      {r.year_note && <p className="mt-1 text-xs bx-muted"><span className="font-semibold">Date: </span>{r.year_note}</p>}
      {!compact && (r.in_concepts.length > 0 || r.in_figures.length > 0 || r.in_recipes.length > 0) && (
        <dl className="mt-2 grid gap-1 text-xs bx-targets">
          {r.in_figures.length > 0 && <div><dt className="inline font-semibold">Figures </dt><dd className="inline">{r.in_figures.map((f) => <Link key={f} className="underline mr-2" to={`/figures/${f}`}>{getFigure(f)?.label ?? f}</Link>)}</dd></div>}
          {r.in_recipes.length > 0 && <div><dt className="inline font-semibold">Recipes </dt><dd className="inline">{r.in_recipes.map((x) => <Link key={x} className="underline mr-2" to={`/recipes/${x}`}>{getRecipe(x)?.title ?? x}</Link>)}</dd></div>}
          {r.in_concepts.length > 0 && <div><dt className="inline font-semibold">101s </dt><dd className="inline">{r.in_concepts.map((u) => <Link key={u} className="underline mr-2" to={`/concepts/${u}`}>{getConcept(u)?.title ?? u}</Link>)}</dd></div>}
        </dl>
      )}
      {!compact && r.cited_in_actual.length > 0 && <p className="mt-2 text-xs bx-muted bx-targets">Cited in the review: {r.cited_in_actual.map((s) => <Link key={s} className="underline mr-2" to={`/read#${s}`}>{sectionLabel(s)}</Link>)}</p>}
      {compact && <p className="mt-2 text-xs bx-targets"><Link className="underline font-semibold" to={`/references#ref-${r.n}`}>Open in the references →</Link></p>}
    </div>
  );
}
