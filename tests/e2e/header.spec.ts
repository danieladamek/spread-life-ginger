import { expect, test, type Page } from '@playwright/test';

/**
 * K44 (folded into K45): the header wordmark is "Spread Life: Ginger" with no "Explorer", and it never overlaps the
 * navigation. Where all the links fit beside it they show, with clear space between; below that width they
 * collapse into the Menu button. Screenshots at 360, 768, 1024 and 1440 px are attached to the report.
 */
const ORDER = ['Read', '101s', 'Glossary', 'Figures', 'Recipes', 'References', 'Methods', 'About'];
type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function visibleLinks(page: Page) {
  const navs = page.getByRole('navigation', { name: 'Primary', exact: true });
  return navs.getByRole('link');
}

for (const width of [360, 768, 1024, 1440]) {
  test(`header at ${width} px: wordmark alone, no overlap with any link, links in order`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const mark = page.getByTestId('wordmark');
    await expect(mark).toHaveText('Spread Life: Ginger');
    await expect(page.locator('header')).not.toContainText('Explorer');

    const fits = await page.locator('[data-nav-fits]').getAttribute('data-nav-fits');
    if (fits === 'no') {
      await expect(page.getByTestId('primary-nav')).toHaveCount(0);
      await page.getByTestId('menu-button').click();
      await expect(page.getByTestId('menu-nav')).toBeVisible();
    } else {
      await expect(page.getByTestId('menu-button')).toHaveCount(0);
    }
    const links = await visibleLinks(page);
    expect((await links.allInnerTexts()).slice(0, ORDER.length).map((t) => t.trim())).toEqual(ORDER);

    const mb = (await mark.boundingBox())!;
    for (const l of await links.all()) {
      const lb = (await l.boundingBox())!;
      expect(intersects(mb, lb), `wordmark overlaps "${await l.innerText()}" at ${width} px`).toBe(false);
    }
    if (fits === 'yes') {
      const first = (await links.first().boundingBox())!;
      expect(first.x - (mb.x + mb.width), 'clear space between the wordmark and Read').toBeGreaterThanOrEqual(16);
      // nor do the links run into the action buttons
      const last = (await links.last().boundingBox())!;
      const search = (await page.getByRole('button', { name: 'Search (Command K)' }).boundingBox())!;
      expect(last.x + last.width).toBeLessThan(search.x);
    }
    if (fits === 'no') await page.getByTestId('menu-button').click();
    const shot = await page.screenshot({ path: test.info().outputPath(`header-${width}.png`), clip: { x: 0, y: 0, width, height: 140 } });
    await info.attach(`header-${width}`, { body: shot, contentType: 'image/png' });
  });
}

test('the links show at 1440 px and fold into a menu at 768 and 360 px; at 1024 px it depends on the fonts', async ({ page }) => {
  // Whether all eight links fit at 1024 px depends on the installed fonts (they fit with macOS's system fonts, and
  // fold into Menu on CI's Linux fonts). Both outcomes are clean; the overlap checks above run at 1024 either way.
  for (const [w, fits] of [[1440, 'yes'], [768, 'no'], [360, 'no']] as const) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('/methods');
    await expect(page.locator('[data-nav-fits]')).toHaveAttribute('data-nav-fits', fits);
  }
});

test('resizing re-measures: the links collapse when the window narrows and return when it widens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await expect(page.getByTestId('primary-nav')).toBeVisible();
  await page.setViewportSize({ width: 800, height: 800 });
  await expect(page.getByTestId('menu-button')).toBeVisible();
  await page.setViewportSize({ width: 1300, height: 800 });
  await expect(page.getByTestId('primary-nav')).toBeVisible();
});

test('your notes stay one click away: the Notepad button, and the menu', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/');
  await page.getByTestId('menu-button').click();
  await page.getByTestId('menu-nav').getByRole('link', { name: /Your notes/ }).click();
  await expect(page).toHaveURL(/\/notes$/);
});
