import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { loadReferences, useAsync } from '@/lib/heavy';
import { LEVEL_LABEL, LEVEL_ORDER, manifest, TIER_LABEL, TIER_NOTE, TIER_ORDER } from '@/lib/data';
import ReferenceCard from '@/components/reader/ReferenceCard';
import type { Reference } from '@/types';
import NoteThis from '@/components/notepad/NoteThis';

const ROLES: [string, string][] = [['support', 'supports a claim'], ['review', 'review'], ['background', 'background'], ['guideline', 'guideline / regulatory']];

/**
 * References (APP-SPEC §2 /references, topic mode): grouped by tier — Seminal · Classic · Current · Background — with
 * each tier explained at the head of its group; sorted by year within the group (oldest first in Seminal and
 * Classic so the history reads forward, newest first in Current); filterable by tier, year, role and how far each was read;
 * why_it_mattered on seminal cards; Daniel's anchors marked. Every card says how far its source was read.
 * Filters live in the URL (?tier=…&role=…&level=…&from=…&to=…&q=…) so a view can be shared.
 */
export default function References() {
  const refs = useAsync(loadReferences);
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const tier = params.get('tier') ?? 'all';
  const role = params.get('role') ?? 'all';
  const q = params.get('q') ?? '';
  const from = Number(params.get('from') ?? 0) || 0;
  const to = Number(params.get('to') ?? 0) || 0;
  const anchorsOnly = params.get('anchors') === '1';
  const level = params.get('level') ?? 'all';
  const set = (k: string, v: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (v === null || v === '' || v === 'all') n.delete(k); else n.set(k, v); return n; }, { replace: true });
  useEffect(() => { if (refs && loc.hash) requestAnimationFrame(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView()); }, [refs, loc.hash]);
  const all = refs ?? [];
  const years = all.map((r) => r.year);
  const minY = years.length ? Math.min(...years) : 0;
  const maxY = years.length ? Math.max(...years) : 0;
  const shown = useMemo(() => all.filter((r) => (tier === 'all' || r.tier === tier) && (role === 'all' || r.role_here === role)
    && (!from || r.year >= from) && (!to || r.year <= to) && (!anchorsOnly || r.anchor) && (level === 'all' || r.verified_level === level)
    && (!q.trim() || `${r.n} ${r.citation} ${r.summary} ${r.year}`.toLowerCase().includes(q.toLowerCase()))), [all, tier, role, from, to, q, anchorsOnly, level]);
  const sortTier = (t: string, xs: Reference[]) => [...xs].sort((a, b) => (t === 'current' ? b.year - a.year : a.year - b.year) || a.n - b.n);
  const item = (r: Reference) => (
    <li key={r.n} id={`ref-${r.n}`} data-note-anchor={`ref:${r.n}`} className="bx-card bx-noteable p-4 scroll-mt-24 target:ring-2 target:ring-[color:var(--bx-accent)]" data-testid="ref-item" data-year={r.year}>
      <ReferenceCard r={r} />
      <p className="mt-2 text-xs no-print"><NoteThis anchor={{ type: 'ref', id: String(r.n) }} label={`reference [${r.n}]`} /></p>
    </li>
  );
  const levels = all.reduce<Record<string, number>>((m, r) => { const k = r.verified_level ?? 'unstated'; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">References</h1>
      <p className="bx-prose mt-2">
        The {all.length} sources the review rests on, in the review's own numbering, grouped by tier. {all.filter((r) => r.anchor).length} are anchors — works Daniel named in the scoping interview.
        {manifest.verification_level ?? ''}{' '}
        <span data-testid="ref-levels">({LEVEL_ORDER.filter((k) => levels[k]).map((k) => `${levels[k]} ${LEVEL_LABEL[k]}`).join(' · ')})</span>.
        Summaries are the builder's, from what was read. <Link className="underline" to="/methods#verification">How the sources were read →</Link>
      </p>
      <div className="mt-4 grid gap-2 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ref-q">Search references</label>
          <input id="ref-q" className="bx-input max-w-xs" placeholder="Search citation, summary, year…" value={q} onChange={(e) => set('q', e.target.value)} />
          <span className="text-sm bx-muted" role="status" data-testid="ref-count">{refs ? `${shown.length} of ${all.length} shown` : 'Loading…'}</span>
        </div>
        <div role="group" aria-label="Tier" className="flex flex-wrap gap-1">
          {(['all', ...TIER_ORDER] as string[]).map((k) => <button key={k} type="button" className={`bx-btn !py-1 ${tier === k ? 'bx-btn-on' : ''}`} aria-pressed={tier === k} onClick={() => set('tier', k)} data-testid={`tier-${k}`}>{k === 'all' ? 'Every tier' : TIER_LABEL[k]}</button>)}
          <button type="button" className={`bx-btn !py-1 ${anchorsOnly ? 'bx-btn-on' : ''}`} aria-pressed={anchorsOnly} onClick={() => set('anchors', anchorsOnly ? null : '1')}>Anchors only</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="ref-role" className="bx-muted">Role</label>
          <select id="ref-role" className="bx-input !w-auto" value={role} onChange={(e) => set('role', e.target.value)}><option value="all">any</option>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <label htmlFor="ref-level" className="bx-muted">Read</label>
          <select id="ref-level" className="bx-input !w-auto" value={level} onChange={(e) => set('level', e.target.value)} data-testid="ref-level"><option value="all">any level</option>{LEVEL_ORDER.map((k) => <option key={k} value={k}>{LEVEL_LABEL[k]}</option>)}</select>
          <label htmlFor="ref-from" className="bx-muted">Years</label>
          <input id="ref-from" type="number" className="bx-input !w-24" placeholder={String(minY)} value={from || ''} min={minY} max={maxY} onChange={(e) => set('from', e.target.value)} aria-label="From year" />
          <span aria-hidden="true">–</span>
          <input id="ref-to" type="number" className="bx-input !w-24" placeholder={String(maxY)} value={to || ''} min={minY} max={maxY} onChange={(e) => set('to', e.target.value)} aria-label="To year" />
        </div>
      </div>
      {TIER_ORDER.map((t) => {
        const xs = sortTier(t, shown.filter((r) => r.tier === t));
        if (!xs.length) return null;
        return (
          <section key={t} className="mt-10" aria-labelledby={`tier-h-${t}`} data-testid={`tier-group-${t}`}>
            <h2 id={`tier-h-${t}`} className="text-2xl bx-arc">{TIER_LABEL[t]} <span className="bx-muted text-base font-body">({xs.length})</span></h2>
            <p className="bx-prose mt-1">{TIER_NOTE[t]}</p>
            <ol className="mt-3 grid gap-3">{xs.map(item)}</ol>
          </section>
        );
      })}
    </div>
  );
}
