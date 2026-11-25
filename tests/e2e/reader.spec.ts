import { expect, test } from '@playwright/test';

test('term popover opens by keyboard and closes with Esc, focus returning', async ({ page }) => {
  await page.goto('/read#abstract');
  const term = page.locator('section#abstract button.bx-term').first();
  await term.focus();
  await page.keyboard.press('Enter');
  const pop = page.getByRole('dialog').filter({ hasText: 'Full entry' });
  await expect(pop).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(term).toBeFocused();
});

test('a citation opens a fold-out under its paragraph, with the summary and the level it was read at', async ({ page }) => {
  await page.goto('/read#2-the-plant-in-brief');
  await page.locator('section[id="2-the-plant-in-brief"]').getByTestId('cite-14').first().click();
  const fo = page.getByTestId('citation-foldout');
  await expect(fo).toBeVisible();
  await expect(fo).toContainText('[14]');
  await expect(fo.getByTestId('verified-level')).toHaveAttribute('data-level', /^(full-text|abstract|partial)$/);
  await expect(fo.getByTestId('verified-level')).toHaveText(/^read (in full|from the abstract|in part)$/);
});

test('the commissioned-review banner is dismissible, stays dismissed, and the as_of chip stays', async ({ page }) => {
  await page.goto('/read');
  const banner = page.getByTestId('review-banner');
  await expect(banner).toContainText('from 162 sources, current as of 24 November 2026');
  await banner.getByRole('button', { name: 'Dismiss this banner' }).click();
  await page.reload();
  await expect(page.getByTestId('review-banner')).toHaveCount(0);
  await expect(page.getByTestId('as-of')).toBeVisible();
});

test('every synthesis passage is visibly marked, and /methods links each one to its sentence', async ({ page }) => {
  await page.goto('/read');
  await expect(page.getByTestId('synthesis-block')).toHaveCount(17);
  await expect(page.locator('.bx-syn')).toHaveCount(17);
  await expect(page.getByTestId('synthesis-block').first().locator('.bx-synthesis-label')).toHaveText('synthesis');
  await page.goto('/methods#synthesis');
  await expect(page.getByTestId('synthesis-link')).toHaveCount(17);
  const link = page.getByTestId('synthesis-link').nth(5);
  const href = (await link.getAttribute('href'))!;
  await link.click();
  const id = href.split('#')[1];
  await expect(page.locator(`[id="${id}"]`)).toBeInViewport();
});

test('the health notice sits on /read and /recipes; every health section links section 10', async ({ page }) => {
  await page.goto('/read');
  await expect(page.getByTestId('health-notice')).toContainText('not medical advice');
  for (const s of ['8-nausea-and-vomiting', '9-pain-inflammation-and-metabolic-outcomes', '11-how-it-might-work-and-the-bioavailability-problem']) {
    await expect(page.locator(`section[id="${s}"]`).getByTestId('safety-link').getByRole('link')).toHaveAttribute('href', /#10-safety-interactions-and-pregnancy$/);
  }
  await page.goto('/recipes');
  await expect(page.getByTestId('health-notice')).toContainText('not medical advice');
});

test('sections 6 and 15 link to the recipes', async ({ page }) => {
  await page.goto('/read');
  for (const s of ['6-europe-to-the-americas', '15-from-rhizome-to-kitchen']) await expect(page.getByTestId(`recipes-link-${s}`).getByRole('link', { name: /historical recipes/ })).toHaveAttribute('href', '/recipes');
});

test('375 px: the reader and a figure work on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/read#11-how-it-might-work-and-the-bioavailability-problem');
  await expect(page.getByTestId('reader-figure-fig-cmax')).toBeVisible();
  await expect(page.getByLabel('Jump to section')).toBeVisible();
  await page.goto('/figures/fig-gastric');
  await expect(page.getByTestId('chart-fig-gastric')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
});
