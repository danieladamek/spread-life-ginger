import { getConcept, getFigure, getRecipe } from '@/lib/data';

/**
 * The route table, for `page` anchors (APP-SPEC §3.1: anything without a closer anchor falls back to the page).
 * One entry per <Route> in src/App.tsx; `label` names a concrete path, or returns null if the path is not served.
 */
export const ROUTES: { pattern: RegExp; label: (m: RegExpExecArray) => string | null }[] = [
  { pattern: /^\/$/, label: () => 'Home' },
  { pattern: /^\/read$/, label: () => 'Read' },
  { pattern: /^\/concepts$/, label: () => '101s' },
  { pattern: /^\/concepts\/([^/]+)$/, label: (m) => (getConcept(m[1]) ? `101: ${getConcept(m[1])!.title}` : null) },
  { pattern: /^\/glossary$/, label: () => 'Glossary' },
  { pattern: /^\/figures$/, label: () => 'Figures' },
  { pattern: /^\/figures\/([^/]+)$/, label: (m) => (getFigure(m[1]) ? getFigure(m[1])!.label : null) },
  { pattern: /^\/recipes$/, label: () => 'Recipes' },
  { pattern: /^\/recipes\/([^/]+)$/, label: (m) => (getRecipe(m[1]) ? `Recipe: ${getRecipe(m[1])!.title}` : null) },
  { pattern: /^\/references$/, label: () => 'References' },
  { pattern: /^\/notes$/, label: () => 'Notes' },
  { pattern: /^\/methods$/, label: () => 'Methods' },
  { pattern: /^\/about$/, label: () => 'About' },
];
export const ROUTES_FOR_NOTES = ['/', '/read', '/concepts', '/glossary', '/figures', '/recipes', '/references', '/methods', '/about'];

export function pageLabel(path: string): string | null {
  const p = path.split(/[?#]/)[0] || '/';
  for (const r of ROUTES) { const m = r.pattern.exec(p); if (m) return r.label(m); }
  return null;
}
