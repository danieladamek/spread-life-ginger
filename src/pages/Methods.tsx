import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AS_OF, figuresIndex, LEVEL_COUNTS, LEVEL_LABEL, LEVEL_NOTE, LEVEL_ORDER, manifest, provenance, sectionLabel, TIER_LABEL, TIER_ORDER } from '@/lib/data';
import { loadBuildErrors, loadScope, loadSynthesis, loadTodo, useAsync } from '@/lib/heavy';
import Todo from '@/components/ui/Todo';

const H = ({ id, children }: { id: string; children: ReactNode }) => <h2 id={id} className="text-2xl mt-12 scroll-mt-24 bx-arc">{children}</h2>;
const Counts = ({ o }: { o: Record<string, number> }) => <span>{Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ')}</span>;
type Obj = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const humanKey = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Any scope value, rendered as written (lists as lists, records as definition lists). */
function Value({ v }: { v: unknown }) {
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x !== 'object' || x === null)) return <ul className="list-disc pl-5">{v.map((x, i) => <li key={i}>{str(x)}</li>)}</ul>;
    return <ul className="grid gap-1.5">{v.map((x, i) => <li key={i} className="bx-card px-3 py-2"><Value v={x} /></li>)}</ul>;
  }
  if (v && typeof v === 'object') {
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {Object.entries(v as Obj).map(([k, x]) => <div key={k} className="contents"><dt className="font-semibold">{humanKey(k)}</dt><dd className="min-w-0"><Value v={x} /></dd></div>)}
      </dl>
    );
  }
  return <span>{str(v)}</span>;
}

/** The keys this page renders in their own panels; anything else in scope.yaml is still published, under "The rest of the scope record". */
const HANDLED = new Set(['topic', 'question', 'purpose', 'boundary', 'level', 'time_window', 'stance', 'depth', 'anchors', 'excluded', 'assumed', 'assumptions', 'interview', 'presweep', 'search_strategy', 'corpus_profile', 'outline_approved', 'history_sources_rule', 'pack_0_2_passes']);

/**
 * Methods & provenance (APP-SPEC §2 /methods, §6.1, KICKOFF §8.3). In topic mode this route carries the app's honesty:
 * how far the sources were read, the scope in and out, the interview as asked and answered, every query with its hit
 * count, the corpus profile, the citation-coverage counts, every synthesis passage, every TODO and build error.
 */
export default function Methods() {
  const loc = useLocation();
  const scope = useAsync(loadScope) as Obj | null | undefined;
  const be = useAsync(loadBuildErrors);
  const todo = useAsync(loadTodo);
  const syn = useAsync(loadSynthesis);
  const [strand, setStrand] = useState('all');
  useEffect(() => { if (loc.hash && scope !== undefined && be && syn) requestAnimationFrame(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView()); }, [loc.hash, scope, be, syn]);
  const pv = provenance;
  const ss = (scope?.search_strategy ?? {}) as Obj;
  const queries = (ss.queries ?? []) as Obj[];
  const strands = useMemo(() => [...new Set(queries.map((q) => String(q.strand ?? '—')))], [queries]);
  const shownQ = queries.filter((q) => strand === 'all' || String(q.strand ?? '—') === strand);
  const boundary = (scope?.boundary ?? {}) as { in?: string[]; out?: string[]; rationale?: string };
  const cp = (scope?.corpus_profile ?? {}) as Obj;
  const unverifiedCited = pv.references.unverified_but_cited as number[];
  const levels = pv.references.by_verified_level as Record<string, number>;
  const rest = scope ? Object.entries(scope).filter(([k]) => !HANDLED.has(k)) : [];
  const nav: [string, string][] = [['verification', 'How the sources were read'], ['todo', 'Known gaps'], ['scope', 'Scope'], ['interview', 'Interview'], ['search', 'Search strategy'], ['passes', 'Pack 0.2 passes'], ['corpus', 'Corpus profile'], ['coverage', 'Citation coverage'], ['synthesis', 'Synthesis passages'], ['figures', 'Figures'], ['health', 'Health profile'], ['counts', 'Provenance counts'], ['errors', 'Build errors'], ['terms', 'Term linking']];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" data-note-anchor="page:/methods">
      <h1 className="text-3xl sm:text-4xl">Methods &amp; provenance</h1>
      <p className="mt-3 text-lg font-display" data-testid="not-systematic">This is a scope-bounded commissioned review, not a systematic review.</p>
      <p className="bx-prose mt-2">It was written by {manifest.authors.join(', ')} from a literature sweep that closed on {AS_OF}, and is {manifest.venue.toLowerCase()}. This page publishes what was asked, what was searched, what was kept and left out, how far each source was read, and every place the review draws its own conclusion.</p>
      <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-1.5 text-sm">
        {nav.map(([id, l]) => <a key={id} className="bx-btn !py-0.5" href={`#${id}`}>{l}</a>)}
      </nav>

      <H id="verification">How the sources were read</H>
      <div className="mt-2 grid gap-3" data-testid="verification">
        <p className="bx-card p-4 text-base leading-7 border-l-4 border-l-[color:var(--bx-accent)]" data-testid="verification-sentence">
          {manifest.verification_level ?? <Todo>the pack states no verification level</Todo>}
        </p>
        <p className="bx-prose">
          Where only an abstract or a record page was read, a finding that appears only in the paper's full text — its methods, its tables, its caveats —
          may be missing or simplified here. Each reference card says how far its source was read, and what exactly was read.
        </p>
        <table className="text-sm w-full max-w-2xl" data-testid="level-table">
          <caption className="sr-only">References by how far they were read</caption>
          <thead><tr><th scope="col" className="text-left border-b border-[color:var(--bx-line)] py-1 pr-3">How far it was read</th><th scope="col" className="text-left border-b border-[color:var(--bx-line)] py-1 pr-3">Meaning</th><th scope="col" className="text-right border-b border-[color:var(--bx-line)] py-1">References</th></tr></thead>
          <tbody>
            {[...LEVEL_ORDER.filter((k) => levels[k] !== undefined), ...Object.keys(levels).filter((k) => !(LEVEL_ORDER as readonly string[]).includes(k))].map((k) => (
              <tr key={k} data-level={k}>
                <td className="py-1 pr-3 border-b border-[color:var(--bx-line)] font-semibold">{LEVEL_LABEL[k] ?? k}</td>
                <td className="py-1 pr-3 border-b border-[color:var(--bx-line)] bx-muted">{LEVEL_NOTE[k] ?? '—'}</td>
                <td className="py-1 text-right tabular-nums border-b border-[color:var(--bx-line)]" data-testid={`level-count-${k}`}>{LEVEL_COUNTS[k]}</td>
              </tr>
            ))}
            <tr><td className="py-1 pr-3 font-semibold">Total</td><td /><td className="py-1 text-right tabular-nums font-semibold">{pv.references.total}</td></tr>
          </tbody>
        </table>
        <p className="text-sm"><Link className="underline" to="/references?level=full-text">The references read in full →</Link></p>
        {unverifiedCited.length > 0
          ? <p><Todo>cited but verified: false — {unverifiedCited.map((n) => `[${n}]`).join(' ')}</Todo></p>
          : <p className="text-sm">Every cited reference is marked verified in the pack (DOI or record resolved and the abstract or record read); none rests on an unverified entry.</p>}
      </div>

      <H id="todo">Known gaps — todo.yaml in full</H>
      <p className="bx-prose mt-1">What the builder could not resolve, as the pack records it. Each is a <Todo>TODO(author)</Todo> for the review's author, not something this app fills in.</p>
      {!todo ? <p className="bx-muted" role="status">Loading…</p> : (
        <>
          <ul className="mt-3 grid gap-2" data-testid="todo-list">{todo.pack.map((t, i) => <li key={i} className="bx-card px-3 py-2 text-sm" data-testid="todo-item"><Todo>TODO(author) · {t.where}</Todo> <span className="ml-1">{t.what}</span></li>)}</ul>
          {todo.markers.length > 0 && (
            <>
              <h3 className="text-lg mt-5">TODO(author) markers placed by the build</h3>
              <ul className="mt-2 grid gap-2" data-testid="todo-markers">{todo.markers.map((t, i) => <li key={i} className="text-sm"><Todo>TODO(author) · {t.where}</Todo> <span className="ml-1">{t.what}</span></li>)}</ul>
            </>
          )}
        </>
      )}

      <H id="scope">Scope — what is in, what is out</H>
      {scope === undefined ? <p className="bx-muted" role="status">Loading…</p> : !scope ? <p><Todo>scope.yaml did not validate — see build errors</Todo></p> : (
        <div className="mt-2 grid gap-4 text-sm" data-testid="scope">
          <p><span className="font-semibold">Topic, in Daniel's words: </span>“{str(scope.topic)}”</p>
          <p><span className="font-semibold">The question: </span>{str(scope.question)}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bx-card p-3"><h3 className="text-lg">In</h3><ul className="list-disc pl-5 mt-1">{(boundary.in ?? []).map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="bx-card p-3"><h3 className="text-lg">Out</h3><ul className="list-disc pl-5 mt-1">{(boundary.out ?? []).map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          {boundary.rationale && <p><span className="font-semibold">Why: </span>{boundary.rationale}</p>}
          {Array.isArray(scope.excluded) && <div><h3 className="text-lg">Adjacent literatures left out, and why</h3><ul className="mt-1 grid gap-1">{(scope.excluded as Obj[]).map((x, i) => <li key={i}><span className="font-semibold">{str(x.what)}</span> — {str(x.why)}</li>)}</ul></div>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {(['purpose', 'level', 'stance', 'depth', 'outline_approved'] as const).map((k) => scope[k] !== undefined && <div key={k} className="contents"><dt className="font-semibold">{humanKey(k)}</dt><dd>{str(scope[k])}</dd></div>)}
            {scope.time_window !== undefined && <><dt className="font-semibold">Time window</dt><dd><Value v={scope.time_window} /></dd></>}
            <dt className="font-semibold">Defaults assumed</dt><dd>{scope.assumed ? 'yes — the interview went unanswered' : 'no — the interview was answered'}</dd>
          </dl>
          {Array.isArray(scope.assumptions) && <div><h3 className="text-lg">Assumptions taken without asking</h3><Value v={scope.assumptions} /></div>}
          {scope.history_sources_rule !== undefined && <p><span className="font-semibold">Rule for historical sources: </span>{str(scope.history_sources_rule)}</p>}
          {Array.isArray(scope.anchors) && <div><h3 className="text-lg">Anchors — what Daniel already trusts</h3><ul className="mt-1 grid gap-1">{(scope.anchors as Obj[]).map((a, i) => <li key={i}>{str(a.citation)} <span className="bx-muted">— {str(a.why)}</span></li>)}</ul></div>}
        </div>
      )}

      <H id="interview">The interview, as asked and answered</H>
      {scope && Array.isArray(scope.interview) && (
        <ol className="mt-2 grid gap-2 text-sm list-decimal pl-5" data-testid="interview">
          {(scope.interview as Obj[]).map((x, i) => <li key={i}><span className="font-semibold">{str(x.q)}</span><br /><span>“{str(x.answer)}”</span>{x.asked ? <span className="bx-muted"> · {str(x.asked)}</span> : null}</li>)}
        </ol>
      )}

      <H id="search">Search strategy — every query</H>
      {scope && (
        <div className="mt-2 grid gap-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="font-semibold">Run on</dt><dd>{str(ss.run_on)}</dd>
            {ss.status !== undefined && <><dt className="font-semibold">Status</dt><dd>{str(ss.status)}</dd></>}
            <dt className="font-semibold">Sources</dt><dd><Value v={ss.sources} /></dd>
          </dl>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <label htmlFor="q-strand" className="bx-muted">Strand</label>
            <select id="q-strand" className="bx-input !w-auto" value={strand} onChange={(e) => setStrand(e.target.value)}><option value="all">every strand ({queries.length})</option>{strands.map((s) => <option key={s} value={s}>{s} ({queries.filter((q) => String(q.strand ?? '—') === s).length})</option>)}</select>
            <span className="bx-muted" role="status">{shownQ.length} queries shown · {queries.filter((q) => q.hits === 0).length} found nothing</span>
          </div>
          <div className="overflow-x-auto bx-tablewrap" tabIndex={0} role="region" aria-label="Every query (scrolls sideways)">
            <table className="w-full text-xs border-collapse" data-testid="query-table">
              <caption className="sr-only">Every query run, with source and hit count</caption>
              <thead><tr>{['id', 'strand', 'window', 'source', 'query', 'hits', 'kept'].map((h) => <th key={h} scope="col" className="text-left border-b-2 border-[color:var(--bx-line)] px-1.5 py-1 bg-paper-2/60 dark:bg-night-2/60">{h}</th>)}</tr></thead>
              <tbody>{shownQ.map((q, i) => (
                <tr key={i} className="align-top">
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)] font-mono">{str(q.id)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)]">{str(q.strand)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)]">{str(q.window)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)]">{str(q.source)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)] font-mono break-all">{str(q.q)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)] text-right tabular-nums">{str(q.hits)}</td>
                  <td className="px-1.5 py-1 border-b border-[color:var(--bx-line)] text-right tabular-nums">{str(q.kept)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {ss.kept_note !== undefined && <p className="bx-muted">{str(ss.kept_note)}</p>}
          {(['snowball', 'inclusion', 'exclusion', 'known_gaps'] as const).map((k) => ss[k] !== undefined && <div key={k}><h3 className="text-lg">{humanKey(k)}</h3><Value v={ss[k]} /></div>)}
          {Object.entries(ss).filter(([k]) => !['run_on', 'status', 'sources', 'queries', 'kept_note', 'snowball', 'inclusion', 'exclusion', 'known_gaps'].includes(k)).map(([k, v]) => <div key={k}><h3 className="text-lg">{humanKey(k)}</h3><Value v={v} /></div>)}
          {Array.isArray(scope.presweep) && <div><h3 className="text-lg">The orienting pre-sweep (T1)</h3><Value v={scope.presweep} /></div>}
        </div>
      )}

      <H id="passes">The pack 0.2 passes</H>
      <p className="bx-prose mt-1">The further reading passes made for pack {String((manifest as { pack_version?: string }).pack_version ?? '0.2')}, as scope.yaml records them.</p>
      {scope && Array.isArray(scope.pack_0_2_passes) ? (
        <ul className="mt-2 grid gap-2 text-sm" data-testid="passes">
          {(scope.pack_0_2_passes as Obj[]).map((x, i) => (
            <li key={i} className="bx-card px-3 py-2"><span className="font-semibold">{humanKey(str(x.pass))}: </span>{str(x.method)}{Object.entries(x).filter(([k]) => k !== 'pass' && k !== 'method').map(([k, v]) => <span key={k} className="block mt-1 bx-muted">{humanKey(k)}: {str(v)}</span>)}</li>
          ))}
        </ul>
      ) : scope !== undefined && <p><Todo>scope.yaml records no pack_0_2_passes</Todo></p>}

      <H id="corpus">Corpus profile</H>
      <div className="mt-2 grid gap-4 md:grid-cols-2 text-sm">
        <div className="bx-card p-3" data-testid="corpus-actual">
          <h3 className="text-lg">The corpus the review cites</h3>
          <p className="mt-1 text-xs bx-muted">Computed from references.yaml at build time.</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="font-semibold">References</dt><dd>{pv.references.total}</dd>
            <dt className="font-semibold">By tier</dt><dd>{TIER_ORDER.map((t) => `${TIER_LABEL[t]} ${(pv.references.by_tier as Record<string, number>)[t] ?? 0}`).join(' · ')}</dd>
            <dt className="font-semibold">Years</dt><dd>{(pv.references.year_range as number[]).join('–')}</dd>
            <dt className="font-semibold">By role</dt><dd><Counts o={pv.references.by_role as Record<string, number>} /></dd>
            <dt className="font-semibold">Anchors</dt><dd>{(pv.references.anchors as number[]).map((n) => <Link key={n} className="underline mr-1" to={`/references#ref-${n}`}>[{n}]</Link>)}</dd>
          </dl>
        </div>
        {scope && (
          <div className="bx-card p-3" data-testid="corpus-scope">
            <h3 className="text-lg">As recorded in scope.yaml</h3>
            {cp.status !== undefined && <p className="mt-1 text-xs"><Todo>{str(cp.status)}</Todo></p>}
            <div className="mt-2"><Value v={Object.fromEntries(Object.entries(cp).filter(([k]) => k !== 'status'))} /></div>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm bx-muted">The right panel is the pack's own statement of the cited corpus; the left panel is computed from references.yaml when the app is built. Both are shown so any difference is visible.</p>

      <H id="coverage">Citation coverage</H>
      <div className="mt-2 text-sm grid gap-2" data-testid="coverage">
        <p>Every block of 25 or more words in the review must carry a citation, unless it is marked <code className="font-mono">framing</code> — a transition or section opener that states no fact. An uncited block fails the build; it is never repaired by adding a citation.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 max-w-md">
          <dt className="font-semibold">Blocks</dt><dd className="tabular-nums">{pv.blocks.total}</dd>
          <dt className="font-semibold">Cited</dt><dd className="tabular-nums">{pv.blocks.cited}</dd>
          <dt className="font-semibold">Framing</dt><dd className="tabular-nums" data-testid="framing-count">{pv.blocks.framing}</dd>
          <dt className="font-semibold">Synthesis</dt><dd className="tabular-nums" data-testid="synthesis-count">{pv.blocks.synthesis}</dd>
          <dt className="font-semibold">Uncited ≥ 25 words</dt><dd className="tabular-nums" data-testid="uncited-count">{pv.blocks.uncited}</dd>
        </dl>
        {pv.blocks.framing > 0.25 * pv.blocks.total && <p className="bx-muted">{pv.blocks.framing} of {pv.blocks.total} blocks ({Math.round((100 * pv.blocks.framing) / pv.blocks.total)}%) are marked framing — above the validator's 25% warning line. Framing must carry no claims of fact; read them with that in mind.</p>}
        {be && be.uncited.length > 0 && <ul className="grid gap-1">{be.uncited.map((u, i) => <li key={i}><Todo>uncited block · {u.section} · {u.words} words</Todo> {u.excerpt}…</li>)}</ul>}
        {be && be.uncited_outside.length > 0 && (
          <div data-testid="uncited-outside">
            <h3 className="text-lg mt-2">Uncited builder prose outside the review</h3>
            <p className="bx-muted">The hard gate covers the review. The same test, run over the 101s and the recipe notes, finds these blocks of 25+ words with no citation. They are shown as written, not repaired.</p>
            <ul className="mt-1 grid gap-1">{be.uncited_outside.map((u, i) => <li key={i}><Todo>{u.where} · {u.words} words</Todo> “{u.excerpt}…”</li>)}</ul>
          </div>
        )}
      </div>

      <H id="synthesis">Every synthesis passage</H>
      <p className="bx-prose mt-1">Sentences where the review draws a conclusion that the cited works do not individually state. In the reader each sits in a block with a quiet left rule and the word <span className="uppercase tracking-wider text-[11px] font-semibold">synthesis</span>.</p>
      {!syn ? <p className="bx-muted" role="status">Loading…</p> : (
        <ol className="mt-3 grid gap-2 text-sm" data-testid="synthesis-list">
          {syn.map((y) => (
            <li key={y.id} className="bx-card px-3 py-2">
              <Link className="underline font-semibold" to={`/read#${y.id}`} data-testid="synthesis-link">{sectionLabel(y.section)}</Link>
              <span className="ml-2">{y.excerpt}</span>
            </li>
          ))}
        </ol>
      )}

      <H id="figures">Figures and what they are made of</H>
      <ul className="mt-2 grid gap-2 text-sm">
        {figuresIndex.map((f) => <li key={f.id}><Link className="underline font-semibold" to={`/figures/${f.id}`}>{f.label}: {f.title}</Link> — {f.kind}, synthesised from {f.synthesis === 'data' ? 'values reported in' : 'the sources'} {f.refs.map((n) => <Link key={n} className="underline mr-1" to={`/references#ref-${n}`}>[{n}]</Link>)}</li>)}
      </ul>
      <p className="mt-2 text-sm bx-muted">Figures by kind: <Counts o={pv.figures.by_kind as Record<string, number>} />; by synthesis: <Counts o={pv.figures.by_synthesis as Record<string, number>} />. No published figure image is reproduced.</p>

      <H id="health">Health safety profile</H>
      <div className="bx-prose mt-2 grid gap-2">
        <p>The pack runs under the <code className="font-mono">{String(manifest.safety_profile)}</code> safety profile. The app gives no doses and no health advice. A dose appears only inside the review's text, as the test article of the study being described; it is never restyled as a recommendation — no call-outs, badges or dose controls. A quiet notice on <Link className="underline" to="/read">Read</Link> and <Link className="underline" to="/recipes">Recipes</Link> says this is a literature review for education, not medical advice, and section 10 (safety) is linked from every health section. Medicinal recipes carry the label “historical document, not advice”.</p>
      </div>

      <H id="counts">Provenance counts</H>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]" data-testid="provenance-counts">
        <dt className="font-semibold">Review</dt><dd>{pv.review.sections} sections · {pv.review.words.toLocaleString('en-GB')} words · {pv.review.figure_markers} figure slots · sha256 <code className="font-mono text-xs">{pv.review.sha256.slice(0, 16)}…</code></dd>
        <dt className="font-semibold">Terms</dt><dd>{pv.terms.total} total · {pv.terms.linked} linked ({pv.terms.linked_pct_of_occurring}% of those occurring) · {pv.terms.unmatched} unmatched · linked in 101s {pv.terms.linked_in_concepts}</dd>
        <dt className="font-semibold">References</dt><dd>{pv.references.total} · with summary {pv.references.with_summary} · verified {pv.references.verified} · unverified-but-cited {unverifiedCited.length} · cited in the review {pv.references.cited_in_review} · cited anywhere {pv.references.cited_anywhere}</dd>
        <dt className="font-semibold">101s</dt><dd>{pv.concepts.total} · self-checks {pv.concepts.self_checks ? 'on' : 'off (manifest)'} · reachable from a term or figure {pv.concepts.reachable_from_term_or_figure}</dd>
        <dt className="font-semibold">Recipes</dt><dd>{pv.recipes.total} · <Counts o={pv.recipes.by_kind as Record<string, number>} /></dd>
        <dt className="font-semibold">TODO</dt><dd>{pv.todo} pack items · {pv.todo_markers} TODO(author) markers</dd>
        <dt className="font-semibold">As of</dt><dd>{AS_OF}</dd>
        <dt className="font-semibold">Machine-readable</dt><dd><a className="underline" href={`${import.meta.env.BASE_URL}provenance.json`}>provenance.json</a></dd>
      </dl>

      <H id="errors">Build errors and warnings</H>
      {!be ? <p className="bx-muted" role="status">Loading…</p> : (
        <div className="mt-2 text-sm grid gap-2" data-testid="build-errors">
          {be.errors.length === 0 ? <p>The content build passed with <strong>0 errors</strong>.</p> : <ul className="grid gap-1">{be.errors.map((e, i) => <li key={i}><Todo>error</Todo> {e}</li>)}</ul>}
          {be.warnings.length > 0 && <><h3 className="text-lg">Warnings ({be.warnings.length})</h3><ul className="grid gap-1">{be.warnings.map((w, i) => <li key={i}><Todo>warning</Todo> {w}</li>)}</ul></>}
        </div>
      )}

      <H id="terms">Term linking</H>
      <div className="bx-prose mt-2 grid gap-2">
        <p>Glossary terms and their variants are matched in the review whole-word and case-insensitively (a variant written all in capitals, like TRPV1, matches only in capitals), longest match first, skipping headings, maths, code and links. The first occurrence in each section is linked.</p>
        <p>{pv.terms.unmatched === 0 ? 'Every glossary term is linked somewhere in the review.' : <>Not linked in the review: {(pv.terms.unmatched_ids as string[]).map((t) => <Link key={t} className="underline mr-2" to={`/glossary#${t}`}>{t}</Link>)}</>}</p>
        <p>Synthesis markers are parsed as the pack's validator reads them: a block carrying a marker counts as that kind of block; in the reader, the sentence the marker closes is the one underlined.</p>
      </div>

      {rest.length > 0 && (
        <>
          <H id="scope-rest">The rest of the scope record</H>
          <div className="mt-2 text-sm"><Value v={Object.fromEntries(rest)} /></div>
        </>
      )}
      <p className="mt-10 text-sm bx-muted">Builder: {manifest.builder.name} · {manifest.builder.version} · {manifest.builder.date}. Content build: scripts/build-content.ts.</p>
    </div>
  );
}
