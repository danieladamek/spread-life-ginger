import { Fragment, lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import sectionsJson from '@/data/sections.json';
import type { Section } from '@/types';
import { AS_OF, HEALTH_SECTIONS, manifest, recipesIndex, SAFETY_SECTION, SLUG } from '@/lib/data';
import { loadRecipes, useAsync } from '@/lib/heavy';
import { useNotepad } from '@/lib/notepad-context';
import { ReviewBlock } from '@/components/reader/Markdown';
import SectionRail from '@/components/reader/SectionRail';
import ReaderFigure from '@/components/reader/ReaderFigure';
import Drawer from '@/components/ui/Drawer';
import ReviewBadges from '@/components/ui/ReviewBadges';
import HealthNotice from '@/components/ui/HealthNotice';
const NotepadPanel = lazy(() => import('@/components/notepad/NotepadPanel'));

const sections = sectionsJson as unknown as Section[];
const BANNER_KEY = `bx-banner-dismissed:${SLUG}`;

function useMedia(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, [q]);
  return m;
}

/** The commissioned-review banner (APP-SPEC §2 /read, DESIGN-SYSTEM §3.1): dismissible per slug; never hides as_of. */
function Banner() {
  const [gone, setGone] = useState(() => { try { return localStorage.getItem(BANNER_KEY) === '1'; } catch { return false; } });
  if (gone) return null;
  return (
    <div className="bx-banner no-print" role="note" data-testid="review-banner">
      <div className="flex items-start gap-3">
        <p className="flex-1">
          Written by {manifest.authors[0].replace(/\s*\(.*$/, '')} from {manifest.counts.references} sources, current as of {AS_OF}. Every claim is cited; passages
          marked <span className="font-semibold uppercase tracking-wider text-[11px]">synthesis</span> draw conclusions the cited works do not individually state.
          Most sources were read from their abstracts; each reference says how far it was read — <Link className="underline" to="/methods#verification">see Methods</Link>.
        </p>
        <button type="button" className="bx-btn !py-0.5 !px-2 text-xs shrink-0" onClick={() => { setGone(true); try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ } }} aria-label="Dismiss this banner">Dismiss</button>
      </div>
    </div>
  );
}

/** One block of the review. Synthesis blocks get the quiet left rule and label; framing blocks render as written. */
function Block({ s, c }: { s: Section; c: Extract<Section['chunks'][number], { kind: 'md' }> }) {
  if (c.marker === 'synthesis') {
    return (
      <div className="bx-synthesis" data-block={`${s.id}:${c.index}`} data-note-anchor={`synthesis:${c.id ?? `${s.id}-${c.index}`}`} data-testid="synthesis-block">
        <span className="bx-synthesis-label" aria-hidden="true">synthesis</span>
        <span className="sr-only">Synthesis passage: </span>
        <ReviewBlock md={c.md} />
      </div>
    );
  }
  return <div data-block={`${s.id}:${c.index}`} data-note-anchor={`section:${s.id}`} data-marker={c.marker ?? undefined}><ReviewBlock md={c.md} /></div>;
}

export default function Read() {
  const loc = useLocation();
  const notepad = useNotepad();
  const recipes = useAsync(loadRecipes);
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const dock = useMedia('(min-width: 1280px)');

  // deep links: #section-id, #syn-… (a synthesis passage, from /methods), ?section=id
  useEffect(() => {
    const section = new URLSearchParams(loc.search).get('section');
    const target = section ?? loc.hash.slice(1);
    if (!target) return;
    const go = () => { const el = document.getElementById(decodeURIComponent(target)); if (el) { el.scrollIntoView({ block: target.startsWith('syn-') ? 'center' : 'start' }); return el; } return null; };
    // Inline figures are drawn as they near the viewport, so the page grows while it settles. Keep the target in
    // place each time it does, for a few seconds or until the reader scrolls on their own.
    let done = false;
    const stop = () => { done = true; ro.disconnect(); ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => window.removeEventListener(t, stop)); };
    const ro = new ResizeObserver(() => { if (!done) go(); });
    requestAnimationFrame(() => {
      const el = go();
      if (el && target.startsWith('syn-')) { el.classList.add('bx-flash'); setTimeout(() => el.classList.remove('bx-flash'), 1800); }
      const article = document.querySelector('article.bx-reader');
      if (article) ro.observe(article);
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => window.addEventListener(t, stop, { passive: true }));
    });
    const t = setTimeout(stop, 3000);
    return () => { clearTimeout(t); stop(); };
  }, [loc.search, loc.hash]);

  // active section + progress
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    els.forEach((e) => io.observe(e));
    const onScroll = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setProgress(max > 0 ? Math.min(1, h.scrollTop / max) : 0); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  const recipesFor = (sid: string) => (recipes?.recipes ?? []).filter((r) => r.links.sections.includes(sid));
  const activeSection = active && sections.find((s) => s.id === active && !s.part) ? active : null;
  const docked = notepad.open && dock;

  return (
    <div className="relative">
      <div className="bx-progress fixed left-0 top-0 z-50 h-0.5 bg-[color:var(--bx-accent)]" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <div className={`mx-auto max-w-[1560px] px-4 py-8 xl:grid xl:gap-8 ${docked ? 'xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[230px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[230px_minmax(0,1fr)]'}`}>
        <aside className={`hidden ${docked ? '2xl:block' : 'xl:block'}`}><div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"><SectionRail active={active} variant="rail" /></div></aside>
        <div className="min-w-0">
          <div className={`${docked ? '2xl:hidden' : 'xl:hidden'} mb-4`}><SectionRail active={active} variant="select" /></div>
          <article className="bx-reader mx-auto" aria-labelledby="read-title">
            <header className="font-body">
              <ReviewBadges />
              <h1 id="read-title" className="mt-3 text-3xl sm:text-4xl leading-tight">{manifest.title}</h1>
              <p className="mt-2 text-sm bx-muted">{manifest.authors.join(', ')} · {manifest.year} · about {manifest.reading_minutes} minutes</p>
              <HealthNotice className="mt-4 no-print" />
              <div className="mt-4"><Banner /></div>
            </header>
            {sections.map((s) => {
              if (s.part) {
                return (
                  <section key={s.id} id={s.id} data-section={s.id} className="scroll-mt-20 mt-14 font-body" aria-labelledby={`h-${s.id}`} data-note-anchor={`page:/read`}>
                    <div className="bx-arc-rule mb-3" aria-hidden="true" />
                    <h2 id={`h-${s.id}`} className="text-sm uppercase tracking-[0.18em] font-semibold">{s.title}</h2>
                  </section>
                );
              }
              const Tag = (s.depth <= 1 ? 'h2' : s.depth === 2 ? 'h2' : 'h3') as 'h2' | 'h3';
              const cls = s.depth <= 2 ? 'text-2xl sm:text-3xl mt-8' : 'text-xl sm:text-2xl mt-8';
              const rs = recipesFor(s.id);
              const isHealth = HEALTH_SECTIONS.has(s.id) && s.id !== SAFETY_SECTION;
              const wantsRecipes = s.number === '6' || s.number === '15';
              return (
                <Fragment key={s.id}>
                  <section id={s.id} data-section={s.id} data-note-anchor={`section:${s.id}`} className="scroll-mt-20" aria-labelledby={`h-${s.id}`}>
                    <Tag id={`h-${s.id}`} className={`${cls} scroll-mt-24 group bx-arc`}>
                      {s.title}{' '}
                      <a href={`#${s.id}`} className="bx-muted text-sm font-body no-underline opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Link to ${s.title}`}>#</a>
                    </Tag>
                    {isHealth && SAFETY_SECTION && (
                      <p className="font-body text-xs bx-muted no-print -mt-1 mb-2 bx-targets" data-testid="safety-link">
                        On harm, interactions and pregnancy: <Link className="underline" to={`#${SAFETY_SECTION}`}>section 10, Safety →</Link>
                      </p>
                    )}
                    {s.chunks.map((c, i) => c.kind === 'figure'
                      ? <ReaderFigure key={i} id={c.id} />
                      : <Block key={i} s={s} c={c} />)}
                    {(rs.length > 0 || wantsRecipes) && (
                      <aside className="font-body text-sm bx-card px-3 py-2 my-6 no-print bx-targets" aria-label="Recipes linked to this section" data-testid={`recipes-link-${s.id}`}>
                        <span className="font-semibold">From the recipes: </span>
                        {rs.map((r) => <Link key={r.id} className="underline mr-3" to={`/recipes/${r.id}`}>{r.title} <span className="bx-muted">({r.kind}, {r.date})</span></Link>)}
                        <Link className="underline" to="/recipes">All {recipesIndex.length} historical recipes →</Link>
                      </aside>
                    )}
                  </section>
                </Fragment>
              );
            })}
            <p className="mt-10 text-sm bx-muted no-print font-body bx-targets">
              End of the review, current as of {AS_OF}. <Link className="underline" to="/methods">How it was made, and every synthesis passage →</Link> · <Link className="underline" to="/recipes">Recipes →</Link> · <Link className="underline" to="/notes">Your notes →</Link>
            </p>
          </article>
        </div>
        {docked && (
          <aside className="bx-notepad-dock" aria-label="Notepad">
            <div className="sticky top-20 h-[calc(100vh-6rem)] bx-card p-3"><Suspense fallback={null}><NotepadPanel section={activeSection} onClose={() => notepad.setOpen(false)} /></Suspense></div>
          </aside>
        )}
      </div>
      {notepad.open && !dock && (
        <Drawer open onClose={() => notepad.setOpen(false)} label="Notepad" testId="notepad-drawer">
          <Suspense fallback={null}><NotepadPanel section={activeSection} /></Suspense>
        </Drawer>
      )}
      {!notepad.open && (
        <button type="button" className="bx-btn-primary fixed bottom-4 right-4 z-40 shadow-lg no-print" onClick={() => notepad.setOpen(true)} aria-label="Open notepad">✎ Notes</button>
      )}
    </div>
  );
}
