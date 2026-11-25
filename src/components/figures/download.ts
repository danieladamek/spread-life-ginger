/** Download helpers: a Blob, text, CSV, and a PNG of an on-page SVG chart. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export const downloadText = (text: string, filename: string, type = 'text/plain;charset=utf-8') => downloadBlob(new Blob([text], { type }), filename);

export function toCsv(rows: Record<string, unknown>[], fields: string[]): string {
  const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [fields.join(','), ...rows.map((r) => fields.map((f) => esc(r[f])).join(','))].join('\n') + '\n';
}
export function downloadCsv(rows: Record<string, unknown>[], fields: string[], filename: string) {
  downloadBlob(new Blob([toCsv(rows, fields)], { type: 'text/csv;charset=utf-8' }), filename);
}

/**
 * PNG of the chart's SVG, at 2× on the page's own background. Computed fills and strokes are inlined so the CSS
 * variables the chart uses survive outside the page.
 */
export async function downloadSvgAsPng(svg: SVGSVGElement, filename: string, background: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = svg.querySelectorAll('*');
  const dst = clone.querySelectorAll('*');
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const d = dst[i] as SVGElement;
    for (const k of ['fill', 'stroke', 'font-size', 'font-family', 'font-weight', 'opacity', 'stroke-width']) d.style.setProperty(k, cs.getPropertyValue(k));
  });
  const { width, height } = svg.getBoundingClientRect();
  clone.setAttribute('width', String(width)); clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg render')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * 2); canvas.height = Math.ceil(height * 2);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(2, 2); ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);
  canvas.toBlob((b) => { if (b) downloadBlob(b, filename); }, 'image/png');
}
