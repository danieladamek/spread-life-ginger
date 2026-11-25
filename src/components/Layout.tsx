import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import { useNotepad } from '@/lib/notepad-context';
import { AS_OF, manifest } from '@/lib/data';
import GingerMotif from '@/components/ui/GingerMotif';
import Drawer from '@/components/ui/Drawer';
import NoteCapture from '@/components/notepad/NoteCapture';
import NoteReturn from '@/components/notepad/NoteReturn';
import { nearestHeading } from '@/lib/note-dom';
const SearchModal = lazy(() => import('./SearchModal'));
const NotepadPanel = lazy(() => import('./notepad/NotepadPanel'));

export const NAV = [
  { to: '/read', label: 'Read' },
  { to: '/concepts', label: '101s' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/figures', label: 'Figures' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/references', label: 'References' },
  { to: '/methods', label: 'Methods' },
  { to: '/about', label: 'About' },
];

/** Your notes: reached from the Notepad button and listed in the menu after the primary links (K45 order). */
export const NOTES_LINK = { to: '/notes', label: 'Your notes' };

const GAP_BRAND_NAV = 24; // px of clear space kept between the wordmark and the first link

/**
 * Whether the full navigation fits on one line beside the wordmark and the action buttons (K44). Measured, not a
 * fixed breakpoint: a hidden copy of the nav gives its natural width, and the row is re-measured on resize and
 * when fonts load. When it does not fit, the links collapse into the Menu button, so the wordmark and the links
 * can never overlap at any width or text size.
 */
function useNavFits() {
  const row = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      if (!row.current || !brand.current || !actions.current || !probe.current) return;
      const cs = getComputedStyle(row.current);
      const inner = row.current.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      // the Menu button is not part of the row when the links are shown, so it does not count against them
      const menu = actions.current.querySelector<HTMLElement>('[data-testid="menu-button"]');
      const acts = actions.current.scrollWidth - (menu ? menu.offsetWidth + 4 : 0);
      const need = brand.current.scrollWidth + GAP_BRAND_NAV + probe.current.scrollWidth + 12 + acts;
      setFits(need <= inner);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);
  return { row, brand, actions, probe, fits };
}

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const notepad = useNotepad();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  const { row, brand, actions, probe, fits } = useNavFits();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => { if (fits) setOpen(false); }, [fits]);
  useEffect(() => {
    const main = document.getElementById('main');
    if (main && loc.key !== 'default' && !loc.hash && !loc.search) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  }, [loc.pathname, loc.key, loc.hash, loc.search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onRead = loc.pathname === '/read';
  /** "Note this page" (APP-SPEC §3.1): a page anchor at the heading nearest the top of the view. */
  const notePage = () => {
    const hs = [...document.querySelectorAll<HTMLElement>('#main h1[id], #main h2[id], #main h3[id]')];
    const top = hs.filter((h) => h.getBoundingClientRect().top < 160).pop();
    const heading = top?.id ?? (hs[0] ? nearestHeading(hs[0]) : undefined);
    notepad.addNote({ type: 'page', id: loc.pathname, ...(heading ? { heading } : {}) });
    notepad.setOpen(true);
  };
  const onNotes = loc.pathname === '/notes';

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[80] rounded bg-brand-deep px-3 py-2 text-paper">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[color:var(--bx-line)] bg-paper/90 dark:bg-night/90 backdrop-blur">
        <div ref={row} className="relative mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-4 py-2.5" data-nav-fits={fits ? 'yes' : 'no'}>
          <Link ref={brand} to="/" className="flex items-center gap-2 font-display text-lg sm:text-xl font-semibold tracking-tight leading-tight min-w-0 sm:shrink-0 sm:whitespace-nowrap text-[color:var(--bx-heading)]" aria-label={`${manifest.short_title} — home`} data-testid="wordmark">
            <GingerMotif className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            <span className="bx-wordmark">{manifest.short_title}</span>
          </Link>
          {/* hidden probe: the nav at its natural width, for useNavFits */}
          <div aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden">
            <div ref={probe} className="flex w-max items-center gap-0.5 text-sm whitespace-nowrap">
              {NAV.map((n) => <span key={n.to} className="px-2 py-1.5 font-semibold">{n.label}</span>)}
            </div>
          </div>
          {fits && (
            <nav aria-label="Primary" className="flex items-center gap-0.5 text-sm whitespace-nowrap" style={{ marginLeft: GAP_BRAND_NAV }} data-testid="primary-nav">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2 py-1.5 hover:bg-paper-2 dark:hover:bg-night-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>
              ))}
            </nav>
          )}
          <div ref={actions} className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" className="bx-btn !px-2 sm:!px-2.5" onClick={() => setSearchOpen(true)} aria-label="Search (Command K)" title="Search ⌘K"><span aria-hidden="true">⌕</span><span className="hidden 2xl:inline">Search</span><kbd className="bx-kbd hidden 2xl:inline" aria-hidden="true">⌘K</kbd></button>
            <button type="button" onClick={toggle} className="bx-btn !px-2 sm:!px-2.5" aria-pressed={theme === 'dark'} aria-label={`${theme === 'dark' ? 'Dark' : 'Light'} theme — switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle light/dark theme" data-testid="theme-toggle">
              <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span><span className="hidden 2xl:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <button type="button" className="bx-btn !px-2 sm:!px-2.5" onClick={notePage} aria-label="Note this page" title="Note this page" data-testid="note-this-page" data-note-capture=""><span aria-hidden="true">✎+</span><span className="hidden 2xl:inline">Note this page</span></button>
            {!onNotes && <button type="button" className={`bx-btn !px-2 sm:!px-2.5 ${notepad.open ? 'bx-btn-on' : ''}`} onClick={notepad.toggle} aria-pressed={notepad.open} aria-label="Notepad — toggle" title="Notepad" data-testid="notepad-toggle"><span aria-hidden="true">✎</span><span className="hidden 2xl:inline">Notepad</span></button>}
            {!fits && <button type="button" className="bx-btn !px-2" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)} data-testid="menu-button"><span aria-hidden="true">☰</span><span className="hidden sm:inline">Menu</span></button>}
          </div>
        </div>
        {open && !fits && (
          <nav id="mobile-nav" aria-label="Primary" className="border-t border-[color:var(--bx-line)] px-4 py-2 grid grid-cols-2 sm:grid-cols-4 gap-1 text-sm" data-testid="menu-nav">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2.5 py-2 hover:bg-paper-2 dark:hover:bg-night-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>)}
            <NavLink to={NOTES_LINK.to} className={({ isActive }) => `rounded-md px-2.5 py-2 col-span-2 sm:col-span-4 border-t border-[color:var(--bx-line)] mt-1 pt-2.5 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>✎ {NOTES_LINK.label}</NavLink>
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none min-h-screen">{children}</main>
      <NoteCapture />
      <NoteReturn />
      {searchOpen && <Suspense fallback={null}><SearchModal open onClose={() => setSearchOpen(false)} /></Suspense>}
      {!onRead && !onNotes && (
        <Drawer open={notepad.open} onClose={() => notepad.setOpen(false)} label="Notepad" testId="notepad-drawer">
          <Suspense fallback={<p className="bx-muted">Loading…</p>}><NotepadPanel /></Suspense>
        </Drawer>
      )}
      <footer className="border-t border-[color:var(--bx-line)] mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm bx-muted flex flex-wrap gap-x-6 gap-y-2">
          <span>
            {manifest.short_title} — a commissioned review of ginger, current as of {AS_OF}. {manifest.venue}; for education, not medical advice.
            Every claim is cited and every synthesis is marked. See <Link className="underline" to="/methods">Methods</Link>, <Link className="underline" to="/about">About</Link> and <Link className="underline" to="/notes">your notes</Link>.
          </span>
        </div>
      </footer>
    </div>
  );
}
