import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
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
  { to: '/notes', label: 'Notes' },
  { to: '/methods', label: 'Methods' },
  { to: '/about', label: 'About' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const notepad = useNotepad();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
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
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-4 py-2.5">
          <Link to="/" className="flex items-center gap-1.5 font-display text-base sm:text-xl font-semibold tracking-tight min-w-0 leading-tight sm:whitespace-nowrap text-[color:var(--bx-heading)]" aria-label={`${manifest.short_title} Explorer — home`}>
            <GingerMotif className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" />
            <span><span className="bx-wordmark">{manifest.short_title}</span> <span className="bx-muted font-normal italic">Explorer</span></span>
          </Link>
          <nav aria-label="Primary" className="ml-auto hidden xl:flex items-center gap-0.5 text-sm">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2 py-1.5 hover:bg-paper-2 dark:hover:bg-night-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto xl:ml-1 flex shrink-0 items-center gap-1">
            <button type="button" className="bx-btn !px-2 sm:!px-2.5" onClick={() => setSearchOpen(true)} aria-label="Search (Command K)" title="Search ⌘K"><span aria-hidden="true">⌕</span><span className="hidden sm:inline">Search</span><kbd className="bx-kbd hidden md:inline" aria-hidden="true">⌘K</kbd></button>
            <button type="button" onClick={toggle} className="bx-btn !px-2 sm:!px-2.5" aria-pressed={theme === 'dark'} aria-label={`${theme === 'dark' ? 'Dark' : 'Light'} theme — switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle light/dark theme" data-testid="theme-toggle">
              <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span><span className="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <button type="button" className="bx-btn !px-2 sm:!px-2.5" onClick={notePage} aria-label="Note this page" title="Note this page" data-testid="note-this-page" data-note-capture=""><span aria-hidden="true">✎+</span><span className="hidden lg:inline">Note this page</span></button>
            {!onNotes && <button type="button" className={`bx-btn !px-2 sm:!px-2.5 ${notepad.open ? 'bx-btn-on' : ''}`} onClick={notepad.toggle} aria-pressed={notepad.open} aria-label="Notepad — toggle" title="Notepad" data-testid="notepad-toggle"><span aria-hidden="true">✎</span><span className="hidden sm:inline">Notepad</span></button>}
            <button type="button" className="bx-btn !px-2 xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)}><span aria-hidden="true">☰</span><span className="hidden sm:inline">Menu</span></button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Primary mobile" className="xl:hidden border-t border-[color:var(--bx-line)] px-4 py-2 grid grid-cols-2 sm:grid-cols-5 gap-1 text-sm">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2.5 py-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>)}
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
            {manifest.short_title} Explorer — a commissioned review of ginger, current as of {AS_OF}. {manifest.venue}; for education, not medical advice.
            Every claim is cited and every synthesis is marked. See <Link className="underline" to="/methods">Methods</Link> and <Link className="underline" to="/about">About</Link>.
          </span>
        </div>
      </footer>
    </div>
  );
}
