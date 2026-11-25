import { expect, test } from '@playwright/test';

test('a chart tooltip shows the exact value, unit and source reference on hover', async ({ page }) => {
  await page.goto('/figures/fig-gastric');
  const chart = page.getByTestId('chart-fig-gastric');
  const bar = chart.locator('.recharts-bar-rectangle path').first();
  await bar.waitFor();
  await bar.hover();
  const tip = page.getByTestId('chart-tooltip');
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('13.1 min');
  await expect(tip).toContainText('ref [120]');
});

test('legend entries toggle their series', async ({ page }) => {
  await page.goto('/figures/fig-gastric');
  const chart = page.getByTestId('chart-fig-gastric');
  await chart.locator('.recharts-bar-rectangle').first().waitFor();
  const before = await chart.locator('.recharts-bar-rectangle').count();
  await page.getByTestId('legend-Placebo').click();
  await expect(page.getByTestId('legend-Placebo')).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => chart.locator('.recharts-bar-rectangle').count()).toBe(before / 2);
});

test('PNG and CSV download', async ({ page }) => {
  await page.goto('/figures/fig-cmax');
  await page.getByTestId('chart-fig-cmax').locator('.recharts-bar-rectangle').first().waitFor();
  const png = page.waitForEvent('download');
  await page.getByTestId('download-png').click();
  expect((await png).suggestedFilename()).toBe('fig-cmax.png');
  const csv = page.waitForEvent('download');
  await page.getByTestId('download-csv').click();
  expect((await csv).suggestedFilename()).toBe('fig-cmax.csv');
});

test('every figure page names what it was synthesised from', async ({ page }) => {
  for (const [id, refs] of [['fig-gastric', [120, 121]], ['fig-cmax', [8]], ['fig-drying', [17, 30, 33, 150, 151]], ['fig-timeline', [47, 159]], ['fig-evidence', [77, 112]]] as const) {
    await page.goto(`/figures/${id}`);
    await expect(page.getByTestId('figure-provenance')).toContainText('synthesised by the builder');
    for (const n of refs) await expect(page.getByTestId(`ref-toggle-${n}`)).toBeVisible();
  }
});

test('the table figure sorts and filters, and the reference number on each row is a working citation', async ({ page }) => {
  await page.goto('/figures/fig-drying');
  await expect(page.getByTestId('row-fig-drying-0')).toBeVisible();
  await page.getByTestId('table-filter-fig-drying').fill('hot-air');
  await expect(page.getByTestId('table-fig-drying').locator('tbody tr')).toHaveCount(1);
  await page.getByTestId('row-fig-drying-2').getByTestId('cite-151').click();
  await expect(page.getByTestId('row-fig-drying-2').getByTestId('citation-foldout')).toContainText('REFERENCE 151');
});

test('fig-timeline and fig-evidence are tables with their declared columns; fig-evidence has no verdict icons or traffic lights', async ({ page }) => {
  await page.goto('/figures/fig-timeline');
  const tl = page.getByTestId('table-fig-timeline');
  await expect(tl.locator('thead th')).toHaveText([/^When/, /^Source/, /^Place/, /^What it records/, /^Source/]);
  await tl.locator('tbody tr').first().locator('[data-testid^="cite-"]').first().click();
  await expect(tl.getByTestId('citation-foldout')).toBeVisible();
  await page.goto('/figures/fig-evidence');
  const ev = page.getByTestId('table-fig-evidence');
  await expect(ev.locator('thead th')).toHaveText([/Question/, /What the evidence shows/, /Where it stands/, /Source/]);
  await expect(ev).not.toContainText(/[✓✔✗✘❌✅🟢🟡🔴]|works|doesn't work/i);
  const bgs = await ev.locator('tbody td').evaluateAll((tds) => [...new Set(tds.map((td) => getComputedStyle(td).backgroundColor))]);
  for (const bg of bgs) expect(bg, 'no coloured verdict cells').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});

test('the pathway draws shown, proposed and chemical steps differently, with a key; a node opens its detail and references', async ({ page }) => {
  await page.goto('/figures/fig-pathway');
  await expect(page.getByTestId('pathway-key').locator('li')).toHaveCount(3);
  const dash = (from: string, to: string) => page.getByTestId(`pathway-edge-${from}-${to}`).locator('path').getAttribute('stroke-dasharray');
  expect(await dash('fer', 'dione')).toBeNull();            // shown: solid
  expect(await dash('dione', 'ging')).toBe('8 6');          // proposed: dashed
  expect(await dash('ging', 'shog')).toBe('0.5 6');         // chemical: dotted
  await page.getByTestId('pathway-node-dione').click();
  const d = page.getByTestId('pathway-detail');
  await expect(d).toContainText('ZoPKS2');
  await d.getByTestId('cite-2').click();
  await expect(d.getByTestId('citation-foldout')).toContainText('REFERENCE 2');
  await page.getByTestId('pathway-node-shog').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('pathway-detail')).toContainText('6-Shogaol');
  await expect(page.getByTestId('pathway-steps').locator('li')).toHaveCount(6);
});

test('an ⓘ popover explains a figure and links its term', async ({ page }) => {
  await page.goto('/figures/fig-cmax');
  await page.getByTestId('explain-0').click();
  const pop = page.getByTestId('explain-0-popover');
  await expect(pop).toContainText('conjugates');
  await expect(pop.getByRole('link', { name: /Glossary/ })).toBeVisible();
});

test('a medicinal recipe carries its "historical document, not advice" label', async ({ page }) => {
  await page.goto('/recipes/irish-materia-medica-zinciber');
  await expect(page.getByTestId('historical-label')).toHaveText('historical document, not advice');
  await expect(page.getByTestId('recipe-kind')).toHaveText('medicinal');
  await page.goto('/recipes');
  await expect(page.getByTestId('recipe-card')).toHaveCount(32);
  await page.getByTestId('kind-medicinal').click();
  await expect(page).toHaveURL(/kind=medicinal/);
  await expect(page.getByTestId('recipe-card')).toHaveCount(10);
  await expect(page.getByTestId('recipe-card').getByTestId('historical-label')).toHaveCount(10);
  await page.getByTestId('kind-culinary').click();
  await expect(page.getByTestId('recipe-card')).toHaveCount(22);
  await expect(page.getByTestId('recipe-card').getByTestId('historical-label')).toHaveCount(0);
});

test('/recipes filters by tradition and sorts by date', async ({ page }) => {
  await page.goto('/recipes');
  const years = async () => (await page.getByTestId('recipe-card').locator('p.mt-1.text-sm').allInnerTexts()).map((t) => t.match(/\b(1[0-9]{3})\b/)?.[1]).filter(Boolean).map(Number);
  const asc = await years(); expect(asc.length).toBeGreaterThan(20); expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.getByTestId('order').selectOption('newest');
  const desc = await years(); expect(desc).toEqual([...desc].sort((a, b) => b - a));
  await page.getByTestId('tradition').selectOption('Roman');
  await expect(page.getByTestId('recipe-card')).toHaveCount(2);
  await expect(page).toHaveURL(/tradition=Roman/);
});

test('the Apicius and Ménagier recipes show their Latin and French originals with the gloss; a recipe with no original shows a Paraphrase', async ({ page }) => {
  for (const [id, lang, tag] of [['apicius-spiced-salts', 'Latin', 'la'], ['ypocras', 'Middle French', 'frm']] as const) {
    await page.goto(`/recipes/${id}`);
    await expect(page.getByTestId('original-language')).toContainText(lang);
    await expect(page.getByTestId('original-text')).toHaveAttribute('lang', tag);
    await expect(page.getByTestId('gloss')).toBeVisible();
  }
  await page.goto('/recipes/ginger-tea-1898');
  await expect(page.getByTestId('original-text')).toHaveCount(0);
  await expect(page.getByTestId('paraphrase').getByRole('heading', { name: 'Paraphrase' })).toBeVisible();
  await expect(page.getByTestId('historical-label')).toBeVisible();
});

test('a recipe shows its source card, original text, gloss, ingredients, form, science note with working citations and section links', async ({ page }) => {
  await page.goto('/recipes/gyngener');
  await expect(page.getByTestId('ref-card-152')).toBeVisible();
  await expect(page.getByTestId('original-text')).toContainText('Take payndemayn');
  await expect(page.getByTestId('original-text')).toHaveAttribute('lang', 'enm');
  await expect(page.getByTestId('ingredients')).toContainText('powdered ginger');
  await expect(page.getByTestId('ginger-form')).toHaveText('dried, powdered');
  await expect(page.getByTestId('heated')).toHaveText('no');
  await page.getByTestId('science-note').getByTestId('cite-17').click();
  await expect(page.getByTestId('citation-foldout')).toContainText('[17]');
  const links = page.getByTestId('recipe-section-link');
  await expect(links).toHaveCount(3);
  await links.first().click();
  await expect(page).toHaveURL(/\/read#3-the-chemistry-in-brief$/);
  await expect(page.locator('[id="3-the-chemistry-in-brief"]')).toBeInViewport();
});

test('a recipe adds no servings, quantities, timings or steps', async ({ page }) => {
  for (const id of ['gyngener', 'irish-materia-medica-zinciber']) {
    await page.goto(`/recipes/${id}`);
    await expect(page.locator('main')).not.toContainText(/\bserves\b|servings|\bminutes\b|step 1|\bgrams?\b|\btsp\b|tablespoon/i);
  }
});

test('/references groups by tier in order, sorts by year within, filters by read level, shows why it mattered and marks anchors', async ({ page }) => {
  await page.goto('/references');
  await expect(page.getByTestId('ref-count')).toHaveText('162 of 162 shown');
  await page.getByTestId('ref-level').selectOption('full-text');
  await expect(page.getByTestId('ref-count')).toHaveText('23 of 162 shown');
  await expect(page.getByTestId('ref-item').getByTestId('verified-level').first()).toHaveText('read in full');
  await page.getByTestId('ref-level').selectOption('all');
  await expect(page.getByTestId('ref-count')).toHaveText('162 of 162 shown');
  await expect(page.getByTestId('ref-item')).toHaveCount(162);
  const groups = page.locator('[data-testid^="tier-group-"]');
  expect(await groups.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(['tier-group-seminal', 'tier-group-classic', 'tier-group-current', 'tier-group-background']);
  const years = async (t: string) => page.getByTestId(`tier-group-${t}`).getByTestId('ref-item').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-year'))));
  const sem = await years('seminal'); expect(sem).toEqual([...sem].sort((a, b) => a - b));
  const cur = await years('current'); expect(cur).toEqual([...cur].sort((a, b) => b - a));
  await expect(page.getByTestId('tier-group-seminal').getByText('Why it mattered:').first()).toBeVisible();
  await expect(page.locator('#ref-5').getByText('anchor', { exact: true })).toBeVisible();
  await page.getByTestId('tier-classic').click();
  await expect(page).toHaveURL(/tier=classic/);
  await expect(page.locator('[data-testid^="tier-group-"]')).toHaveCount(1);
});

test('/methods states the verification level, publishes the scope, every query and todo.yaml in full', async ({ page }) => {
  await page.goto('/methods');
  await expect(page.getByTestId('not-systematic')).toHaveText('This is a scope-bounded commissioned review, not a systematic review.');
  await expect(page.getByTestId('verification-sentence')).toContainText('Of 162 references, 23 were read in full');
  await expect(page.getByTestId('level-count-full-text')).toHaveText('23');
  await expect(page.getByTestId('level-count-abstract')).toHaveText('121');
  await expect(page.getByTestId('level-count-partial')).toHaveText('18');
  await expect(page.getByTestId('todo-list').getByTestId('todo-item')).toHaveCount(19);
  for (const t of await page.getByTestId('todo-item').allInnerTexts()) expect(t).toMatch(/^TODO\(author\)/);
  await expect(page.getByTestId('passes').locator('li')).toHaveCount(4);
  await expect(page.getByTestId('scope')).toContainText('Out');
  await expect(page.getByTestId('interview').locator('li')).toHaveCount(12);
  await expect(page.getByTestId('query-table').locator('tbody tr')).toHaveCount(75);
  await expect(page.getByTestId('uncited-count')).toHaveText('0');
  await expect(page.getByTestId('synthesis-count')).toHaveText('17');
});
