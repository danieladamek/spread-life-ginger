import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const read = <T,>(p: string) => JSON.parse(fs.readFileSync(new URL(`../../src/data/${p}`, import.meta.url), 'utf8')) as T;
const manifest = read<{ title: string }>('manifest.json');
const concepts = read<{ id: string; title: string }[]>('concepts-index.json');
const figures = read<{ id: string; title: string }[]>('figures-index.json');
const recipes = read<{ id: string; title: string }[]>('recipes-index.json');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ROUTES: [string, RegExp][] = [
  ['/', /^Spread Life: Ginger$/],
  ['/read', new RegExp(`^${esc(manifest.title)}$`)],
  ['/concepts', /101s/],
  ...concepts.map((c) => [`/concepts/${c.id}`, new RegExp(`^${esc(c.title)}$`)] as [string, RegExp]),
  ['/glossary', /Glossary/],
  ['/figures', /Figures/],
  ...figures.map((f) => [`/figures/${f.id}`, new RegExp(`^${esc(f.title)}$`)] as [string, RegExp]),
  ['/recipes', /Recipes from the historical record/],
  ...recipes.map((r) => [`/recipes/${r.id}`, new RegExp(`^${esc(r.title)}$`)] as [string, RegExp]),
  ['/references', /References/],
  ['/notes', /Notes/],
  ['/methods', /Methods/],
  ['/about', /About/],
  ['/no-such-page', /Page not found/],
];

for (const [path, h1] of ROUTES) {
  test(`${path} returns 200 and renders its h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toHaveText(h1);
  });
}

test('every route is linked from the header nav, Recipes included', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  for (const l of ['Read', '101s', 'Glossary', 'Figures', 'Recipes', 'References', 'Methods', 'About']) await expect(nav.getByRole('link', { name: l, exact: true })).toBeVisible();
});

test('/, /read and /about carry the not-peer-reviewed badge and the as_of date; no self-checks anywhere', async ({ page }) => {
  for (const p of ['/', '/read', '/about']) {
    await page.goto(p);
    await expect(page.getByTestId('review-badge').first()).toHaveText('Commissioned review — not peer reviewed');
    await expect(page.getByTestId('as-of').first()).toHaveText('Current as of 24 November 2026');
  }
  for (const p of ['/', `/concepts/${concepts[0].id}`, '/about']) {
    await page.goto(p);
    await expect(page.locator('main')).not.toContainText(/self-check|quiz/i);
  }
});

test('nothing implies peer review', async ({ page }) => {
  for (const p of ['/', '/read', '/about', '/methods', '/references']) {
    await page.goto(p);
    // the scope record's inclusion rule ("primary data or peer-reviewed review", about the *sources*) is pack text published as written
    const text = (await page.locator('main').innerText()).replace(/not peer[- ]reviewed/gi, '').replace(/peer-reviewed review for plant/gi, '');
    expect(text, p).not.toMatch(/\bpeer[- ]reviewed\b/i);
  }
});

test('dark mode toggle persists across a reload', async ({ page }) => {
  await page.goto('/');
  const was = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByTestId('theme-toggle').click();
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!was);
});

test('375 px: no route scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const [path] of ROUTES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(376);
  }
});
