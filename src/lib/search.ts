import searchJson from '@/data/search.json';

export type HitKind = 'term' | 'concept' | 'figure' | 'section' | 'recipe';
export interface SearchHit { kind: HitKind; id: string; title: string; subtitle: string; to: string }
const INDEX = searchJson as (SearchHit & { hay: string })[];

/** ⌘K search over terms, 101s, figures, review sections and recipes (index built at content-build time). */
export function search(q: string, limit = 14): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  return INDEX.map((e) => {
    let score = 0;
    const title = e.title.toLowerCase();
    if (title === query || e.id.toLowerCase() === query) score += 100;
    else if (title.startsWith(query)) score += 60;
    else if (title.includes(query)) score += 40;
    for (const w of words) if (e.hay.includes(w)) score += 10;
    if (score && (e.kind === 'term' || e.kind === 'section')) score += 3;
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title))
    .slice(0, limit).map(({ e }) => ({ kind: e.kind, id: e.id, title: e.title, subtitle: e.subtitle, to: e.to }));
}
