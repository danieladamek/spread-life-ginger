import { expect, test, type Page } from '@playwright/test';

/**
 * Notes from anywhere (APP-SPEC v0.8 §3.1, K12.1): quote capture on every route, inside popovers and fold-outs, by
 * mouse, keyboard and touch; Note this and Note this page; coming back reopens and highlights the passage.
 */
type Stored = { id: string; anchor: { type: string; id: string; heading?: string }; quote?: string; route?: string; prefix?: string; suffix?: string; within?: { kind: string; opener: string; host?: string }; body: string };
const KEY = 'bx-notes:spread-life-ginger';
const notes = (page: Page) => page.evaluate((k) => (JSON.parse(localStorage.getItem(k) ?? '{"notes":[]}') as { notes: Stored[] }).notes, KEY);

/** Select ~n characters of plain text (not inside a button or link) in the first element matching `selector`. */
async function selectIn(page: Page, selector: string, n = 22): Promise<string> {
  await page.locator(selector).first().waitFor();
  await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
  return page.evaluate(([sel, len]) => {
    const root = document.querySelector(sel as string)!;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode() as Text | null; t; t = w.nextNode() as Text | null) {
      if (t.parentElement?.closest('button, a, .sr-only, [aria-hidden="true"]')) continue;
      const m = /\S/.exec(t.data);
      if (!m || t.data.trim().length < (len as number)) continue;
      const r = document.createRange();
      r.setStart(t, m.index); r.setEnd(t, m.index + (len as number));
      const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
      return r.toString();
    }
    throw new Error(`no plain text in ${sel}`);
  }, [selector, n] as const);
}

async function addFromSelection(page: Page) {
  const btn = page.getByTestId('add-note');
  await expect(btn).toBeVisible();
  await btn.click();
}

const ROUTES: [string, string, string, string?][] = [
  // route, selector to select in, expected anchor kind, expected anchor id
  ['/', '#abstract-h ~ p.bx-prose', 'page', '/'],
  ['/read', 'section[id="2-the-plant-in-brief"] [data-block] p', 'section', '2-the-plant-in-brief'],
  ['/read', '[data-testid="synthesis-block"] .bx-syn', 'synthesis'],
  ['/concepts', '[data-testid="concept-card"] p', 'concept'],
  ['/concepts/the-ginger-plant', '#what-h + div p', 'concept', 'the-ginger-plant'],
  ['/glossary', '#gingerol dd p', 'term', 'gingerol'],
  ['/figures', 'main p.bx-prose', 'page', '/figures'],
  ['/figures/fig-drying', '[data-testid="row-fig-drying-1"] th', 'row', 'fig-drying:1'],
  ['/recipes', '[data-testid="recipe-card"] p.mt-1', 'recipe'],
  ['/recipes/gyngener', '[data-testid="original-text"]', 'recipe', 'gyngener'],
  ['/references', '#ref-1 [data-testid="ref-card-1"] p.bx-prose', 'ref', '1'],
  ['/notes', 'main p.bx-prose', 'page', '/notes'],
  ['/methods', '[data-testid="verification"] p', 'page', '/methods'],
  ['/about', 'main .bx-prose p', 'page', '/about'],
];

for (const [route, selector, kind, id] of ROUTES) {
  test(`capture on ${route} (${kind}): a selected phrase becomes a note with its quote, anchor and route`, async ({ page }) => {
    await page.goto(route);
    const quote = await selectIn(page, selector, route.startsWith('/figures/') ? 12 : 22);
    await addFromSelection(page);
    const focused = page.locator('[data-testid="note"]:has([data-testid="note-body"]:focus)');
    await expect(focused).toHaveCount(1);
    await expect(focused.getByTestId('note-quote')).toHaveText(quote.replace(/\s+/g, ' ').trim());
    const n = (await notes(page)).find((x) => x.quote === quote.replace(/\s+/g, ' ').trim())!;
    expect(n.anchor.type).toBe(kind);
    if (id) expect(n.anchor.id).toBe(id);
    expect(n.route!.split('?')[0]).toBe(route);
    expect(typeof n.prefix === 'string' || typeof n.suffix === 'string').toBe(true);
  });
}

test('inside a term popover: the popover stays open, the note hangs on the term, and coming back reopens and highlights it', async ({ page }) => {
  await page.goto('/read#abstract');
  const trigger = page.locator('section#abstract button.bx-term').first();
  const termId = (await trigger.getAttribute('data-note-opener'))!.slice(5);
  await trigger.click();
  const pop = page.locator('[data-note-within="popover"]');
  await expect(pop).toBeVisible();
  const quote = await selectIn(page, '[data-note-within="popover"] p.leading-6', 12);
  await addFromSelection(page);
  await expect(pop).toBeVisible();
  const n = (await notes(page)).find((x) => x.quote === quote.trim())!;
  expect(n.anchor).toEqual({ type: 'term', id: termId });
  expect(n.within).toMatchObject({ kind: 'popover', opener: `term:${termId}` });
  // come back from /notes
  await page.goto('/notes');
  await page.getByTestId('note').filter({ hasText: quote.trim() }).getByTestId('note-link').click();
  await expect(page).toHaveURL(/\/read/);
  await expect(page.locator(`[data-note-within="popover"][data-note-opener="term:${termId}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (CSS as unknown as { highlights: Map<string, unknown> }).highlights.has('bx-note'))).toBe(true);
  expect(await page.evaluate(() => [...((CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get('bx-note') ?? [])].map((r) => r.toString()).join(''))).toBe(quote.trim());
});

test('inside a citation fold-out: the fold-out stays open and the note hangs on the reference; coming back reopens it', async ({ page }) => {
  await page.goto('/read#2-the-plant-in-brief');
  await page.locator('section[id="2-the-plant-in-brief"]').getByTestId('cite-10').first().click();
  const fo = page.getByTestId('citation-foldout');
  await expect(fo).toBeVisible();
  const quote = await selectIn(page, '[data-testid="citation-foldout"] p.text-sm.leading-6', 20);
  await addFromSelection(page);
  await expect(fo).toBeVisible();
  const n = (await notes(page)).find((x) => x.quote === quote.trim())!;
  expect(n.anchor).toEqual({ type: 'ref', id: '10' });
  expect(n.within).toMatchObject({ kind: 'foldout', opener: 'cite:10' });
  expect(n.within!.host).toBe('section:2-the-plant-in-brief');
  await page.goto('/notes');
  await page.getByTestId('note').filter({ hasText: quote.trim() }).getByTestId('note-link').click();
  await expect(page.getByTestId('citation-foldout')).toBeVisible();
  await expect.poll(() => page.evaluate(() => [...((CSS as unknown as { highlights: Map<string, Set<Range>> }).highlights.get('bx-note') ?? [])].map((r) => r.toString()).join(''))).toBe(quote.trim());
});

test('by keyboard: `n` adds the note while a selection is active', async ({ page }) => {
  await page.goto('/glossary');
  const quote = await selectIn(page, '#shogaol dd p');
  await expect(page.getByTestId('add-note')).toBeVisible();
  await page.keyboard.press('n');
  await expect(page.getByTestId('notepad-drawer')).toBeVisible();
  expect((await notes(page)).some((x) => x.quote === quote.trim() && x.anchor.type === 'term' && x.anchor.id === 'shogaol')).toBe(true);
});

test('the Add note control is reachable by Tab', async ({ page }) => {
  await page.goto('/about');
  await selectIn(page, 'main .bx-prose p');
  await expect(page.getByTestId('add-note')).toBeVisible();
  await page.getByTestId('add-note').focus();
  await expect(page.getByTestId('add-note')).toBeFocused();
  expect(await page.getByTestId('add-note').evaluate((b) => (b as HTMLButtonElement).tabIndex)).toBe(0);
});

test.describe('touch at 375 px', () => {
  test.use({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
  test('a touch selection raises Add note below the selection; a tap stores the note', async ({ page }) => {
    await page.goto('/references');
    const quote = await selectIn(page, '#ref-1 [data-testid="ref-card-1"] p.bx-prose', 18);
    const btn = page.getByTestId('add-note');
    await expect(btn).toBeVisible();
    // below the selection, so it does not fight the native selection menu (polled: the page scrolls smoothly)
    await expect.poll(() => page.evaluate(() => {
      const sel = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      const b = document.querySelector('[data-testid="add-note"]')!.getBoundingClientRect();
      return b.top >= sel.bottom && b.right <= 375 && b.left >= 0;
    })).toBe(true);
    await btn.tap();
    expect((await notes(page)).some((x) => x.quote === quote.trim() && x.anchor.type === 'ref')).toBe(true);
  });
});

test('Note this on a figure row and on a recipe card', async ({ page }) => {
  await page.goto('/figures/fig-drying');
  const row = page.getByTestId('row-fig-drying-1');
  await row.hover();
  await row.getByTestId('note-this').click();
  expect((await notes(page)).some((x) => x.anchor.type === 'row' && x.anchor.id === 'fig-drying:1' && x.route === '/figures/fig-drying')).toBe(true);
  await page.keyboard.press('Escape');
  await page.goto('/recipes');
  const card = page.getByTestId('recipe-card').first();
  await card.hover();
  await card.getByTestId('note-this').click();
  expect((await notes(page)).some((x) => x.anchor.type === 'recipe' && x.route === '/recipes')).toBe(true);
});

test('Note this page stores a page anchor', async ({ page }) => {
  await page.goto('/methods');
  await page.getByTestId('note-this-page').click();
  const n = (await notes(page)).find((x) => x.anchor.type === 'page')!;
  expect(n.anchor.id).toBe('/methods');
  expect(n.route).toBe('/methods');
  await expect(page.getByTestId('notepad-drawer').getByTestId('note').first()).toContainText('page Methods');
});

test('a quote captured on a non-reader page: typing a full sentence into the new note keeps focus', async ({ page }) => {
  const SENTENCE = 'The trials gave dried ginger in capsules, which is not what a fresh-rhizome tea contains.';
  await page.goto('/glossary');
  await selectIn(page, '#trpv1 dd p');
  await addFromSelection(page);
  const body = page.getByTestId('notepad-drawer').locator('[data-testid="note-body"]:focus');
  await expect(body).toHaveCount(1);
  await page.keyboard.type(SENTENCE, { delay: 10 });
  await expect(body).toHaveValue(SENTENCE);
  await expect(page.getByTestId('notepad-drawer').getByTestId('note-body').first()).toBeFocused();
});

test('"This page" and "All" views in the panel', async ({ page }) => {
  await page.goto('/glossary');
  await selectIn(page, '#gingerol dd p');
  await addFromSelection(page);
  await page.keyboard.press('Escape');
  await page.goto('/about');
  await page.getByTestId('notepad-toggle').click();
  const drawer = page.getByTestId('notepad-drawer');
  await expect(drawer.getByTestId('view-page')).toHaveAttribute('aria-pressed', 'true');
  await expect(drawer.getByTestId('note')).toHaveCount(0);
  await drawer.getByTestId('view-all').click();
  await expect(drawer.getByTestId('note')).toHaveCount(1);
});

test('a passage that no longer resolves is shown as such and the note is kept', async ({ page }) => {
  await page.goto('/about');
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ version: 2, notes: [{ id: 'n-gone', anchor: { type: 'page', id: '/about' }, quote: 'a sentence this page never had', body: 'kept', route: '/about', created: '2026-11-07T00:00:00.000Z', updated: '2026-11-07T00:00:00.000Z' }] })), KEY);
  await page.goto('/notes');
  await page.getByTestId('note-link').click();
  await expect(page).toHaveURL(/\/about$/);
  await page.getByTestId('notepad-toggle').click();
  await expect(page.getByTestId('notepad-drawer').getByTestId('note-lost')).toContainText('passage not found after rebuild');
  expect((await notes(page)).map((x) => x.id)).toEqual(['n-gone']);
});

test('/notes filters by surface and by anchor kind', async ({ page }) => {
  await page.goto('/glossary');
  await selectIn(page, '#gingerol dd p');
  await addFromSelection(page);
  await page.goto('/methods');
  await page.getByTestId('note-this-page').click();
  await page.goto('/notes');
  await expect(page.getByTestId('note')).toHaveCount(2);
  await page.getByTestId('filter-surface').selectOption('glossary');
  await expect(page.getByTestId('note')).toHaveCount(1);
  await page.getByTestId('filter-surface').selectOption('');
  await page.getByTestId('filter-anchor-kind').selectOption('page');
  await expect(page.getByTestId('note')).toHaveCount(1);
  await expect(page.getByTestId('note')).toContainText('page Methods');
});
