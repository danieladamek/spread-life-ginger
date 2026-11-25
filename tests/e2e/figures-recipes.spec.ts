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
  await expect(tip).toContainText('ref [59]');
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
  for (const [id, refs] of [['fig-gastric', [59, 60]], ['fig-cmax', [7]], ['fig-drying', [3, 4]]] as const) {
    await page.goto(`/figures/${id}`);
    await expect(page.getByTestId('figure-provenance')).toContainText('synthesised by the builder');
    for (const n of refs) await expect(page.getByTestId(`ref-toggle-${n}`)).toBeVisible();
  }
});

test('the table figure sorts and filters, and its rows link their reference', async ({ page }) => {
  await page.goto('/figures/fig-drying');
  await expect(page.getByTestId('row-fig-drying-0')).toBeVisible();
  await page.getByTestId('table-filter-fig-drying').fill('hot-air');
  await expect(page.getByTestId('table-fig-drying').locator('tbody tr')).toHaveCount(1);
  await expect(page.getByTestId('row-fig-drying-1').getByRole('link', { name: 'Reference 4' })).toHaveAttribute('href', '/references#ref-4');
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
  await expect(page.getByTestId('recipe-card').filter({ hasText: 'medicinal' }).getByTestId('historical-label')).toBeVisible();
  await expect(page.getByTestId('recipe-card').filter({ hasText: 'Gyngener' }).getByTestId('historical-label')).toHaveCount(0);
});

test('a recipe shows its source card, original text, gloss, ingredients, form, science note with working citations and section links', async ({ page }) => {
  await page.goto('/recipes/gyngener');
  await expect(page.getByTestId('ref-card-25')).toBeVisible();
  await expect(page.getByTestId('original-text')).toContainText('Take payndemayn');
  await expect(page.getByTestId('original-text')).toHaveAttribute('lang', 'enm');
  await expect(page.getByTestId('ingredients')).toContainText('powdered ginger');
  await expect(page.getByTestId('ginger-form')).toHaveText('dried, powdered');
  await expect(page.getByTestId('heated')).toHaveText('no');
  await page.getByTestId('science-note').getByTestId('cite-3').click();
  await expect(page.getByTestId('citation-foldout')).toContainText('[3]');
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

test('/references groups by tier in order, sorts by year within, shows why it mattered and marks anchors', async ({ page }) => {
  await page.goto('/references');
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
  await expect(page.getByTestId('verification')).toContainText('No full text was read for any source in this review.');
  await expect(page.getByTestId('level-table').locator('tbody tr')).toHaveCount(6);
  await expect(page.getByTestId('todo-list').locator('li')).toHaveCount(14);
  await expect(page.getByTestId('scope')).toContainText('Out');
  await expect(page.getByTestId('interview').locator('li')).toHaveCount(12);
  await expect(page.getByTestId('query-table').locator('tbody tr')).toHaveCount(75);
  await expect(page.getByTestId('uncited-count')).toHaveText('0');
  await expect(page.getByTestId('synthesis-count')).toHaveText('14');
});
