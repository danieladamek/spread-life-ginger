/**
 * Quote matching for the notepad (finding a captured quote again after a rebuild). Pure functions, no DOM.
 * The normalisation mirrors tools/validate_pack.py: emphasis markers, backticks and backslash escapes removed,
 * whitespace collapsed.
 */
export const NORM_DROP = /[*_`\\]/;

export function norm(t: string): string {
  return t.replace(/[*_`\\]/g, '').replace(/\s+/g, ' ').trim();
}

/** Normalise `text`, keeping a map from each normalised character back to its index in `text`. */
export function normWithMap(text: string): { s: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let pendingSpace = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (NORM_DROP.test(ch)) continue;
    if (/\s/.test(ch)) { if (out.length && pendingSpace === -1) pendingSpace = i; continue; }
    if (pendingSpace !== -1) { out.push(' '); map.push(pendingSpace); pendingSpace = -1; }
    out.push(ch); map.push(i);
  }
  return { s: out.join(''), map };
}
