import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { NOTES_DIR, OFFLINE_HOST } from '../../playwright.config';

// Isolation: a fresh browser would restore from the shared autosave file other parallel tests write to; serve it empty
// (localhost only, so the other-host test still sees no endpoint). The autosave PUT is untouched and tested below.
test.beforeEach(async ({ page }) => {
  await page.route(/localhost:\d+\/__local\/notes/, (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, state: null } }) : r.continue()));
});

const BROWSER_ONLY = 'Saved in this browser only — export to keep a copy.';

test('notepad: write → reload → persists → export downloads a section-ordered .md → import reads it back', async ({ page }) => {
  await page.goto('/read#8-nausea-and-vomiting');
  await page.getByTestId('notepad-toggle').click();
  await page.getByTestId('new-note').first().click();
  await page.getByTestId('note-body').first().fill('Severity or incidence?');
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByTestId('notepad-toggle').click();
  await expect(page.getByTestId('note-body').first()).toHaveValue('Severity or incidence?');
  // two section notes, added out of reading order: the export puts them back in it
  await page.goto('/notes');
  for (const [sec, body] of [['8-nausea-and-vomiting', 'On nausea.'], ['abstract', 'On the abstract.']]) {
    await page.getByTestId('anchor-type').selectOption('section');
    await page.getByTestId('anchor-id').selectOption(sec);
    await page.getByTestId('add-anchored-note').click();
    await expect(page.locator('[data-testid="note-body"]:focus')).toHaveCount(1);   // the new note takes focus
    await page.keyboard.type(body);
  }
  await page.waitForTimeout(300);
  const dl = page.waitForEvent('download');
  await page.getByTestId('export-notes').first().click();
  const file = (await (await dl).path())!;
  const md = fs.readFileSync(file, 'utf8');
  expect(md).toContain('# Notes — ');
  expect(md.indexOf('## Abstract')).toBeGreaterThan(0);
  expect(md.indexOf('## Abstract')).toBeLessThan(md.indexOf('## §8 Nausea and vomiting'));
  expect(md.indexOf('On the abstract.')).toBeLessThan(md.indexOf('On nausea.'));
  expect(md).toContain('Severity or incidence?');
  expect(md.indexOf('## §8 Nausea and vomiting')).toBeLessThan(md.indexOf('Severity or incidence?'));   // unanchored notes come last
  expect(md).toContain('<!-- bx-note ');
  // import into a fresh browser state reads it back
  // a fresh browser: no localStorage, and (since the app restores from the shared autosave file, which other tests
  // write to in parallel) no file state either
  await page.route('**/__local/notes', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, state: null } }) : r.continue()));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('note')).toHaveCount(0);
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByTestId('note')).toHaveCount(3);
  expect(await page.getByTestId('note-body').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value))).toEqual(expect.arrayContaining(['Severity or incidence?', 'On nausea.', 'On the abstract.']));
});

test('/notes anchors a note to a synthesis passage and to a recipe; they survive a reload', async ({ page }) => {
  await page.goto('/notes');
  await page.getByTestId('anchor-type').selectOption('synthesis');
  await page.getByTestId('anchor-id').selectOption({ index: 1 });
  await page.getByTestId('add-anchored-note').click();
  await page.getByTestId('note-body').first().fill('Is this inference fair?');
  await page.getByTestId('anchor-type').selectOption('recipe');
  await page.getByTestId('anchor-id').selectOption('gyngener');
  await page.getByTestId('add-anchored-note').click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole('link', { name: /synthesis passage in/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /recipe: Gyngener/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recipes', exact: true })).toBeVisible();
});

test('under npm run preview a note lands in notes/notepad.md', async ({ page }) => {
  const marker = `autosave-${Date.now()}`;
  await page.goto('/notes');
  await expect(page.getByTestId('save-status')).toContainText(/notes\/notepad\.md|Saved in this browser\./);
  await page.getByTestId('anchor-type').selectOption('free');
  await page.getByTestId('add-anchored-note').click();
  await page.getByTestId('note-body').first().fill(marker);
  const file = path.resolve(NOTES_DIR, 'notepad.md');
  await expect.poll(() => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''), { timeout: 10_000 }).toContain(marker);
  await expect(page.getByTestId('save-status')).toContainText('notes/notepad.md');
});

test('served without the endpoint (any other host), the panel and /notes say "Saved in this browser only"', async ({ page, baseURL }) => {
  const off = baseURL!.replace('localhost', OFFLINE_HOST);
  await page.goto(`${off}/notes`);
  await expect(page.getByTestId('save-status')).toHaveText(BROWSER_ONLY);
  await page.goto(`${off}/glossary`);
  await page.getByTestId('notepad-toggle').click();
  await expect(page.getByTestId('notepad-drawer').getByTestId('save-status')).toHaveText(BROWSER_ONLY);
});

test('the notepad works as a drawer on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/read');
  await page.getByRole('button', { name: 'Open notepad' }).click();
  await expect(page.getByTestId('notepad-drawer')).toBeVisible();
  await page.getByTestId('new-note').click();
  await page.getByTestId('note-body').first().fill('mobile note');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('notepad-drawer')).toBeHidden();
});

test('selecting review text offers Add note, anchored to the section it sits in', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/read#2-the-plant-in-brief');
  const p = page.locator('section[id="2-the-plant-in-brief"] [data-block] p').nth(1);
  await p.scrollIntoViewIfNeeded();
  const box = (await p.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + 8, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('add-note')).toContainText('this section');
});
