import { expect, test, type Page } from '@playwright/test';

/**
 * Regression: typing in the notepad drawer kept one character, then focus jumped to "Close ×" (the drawer's open
 * effect re-ran on every render because callers pass an inline onClose). The other notepad tests use fill(), which
 * sets the value in one step and cannot see this; these type key by key, the way a reader does.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/__local/notes', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { ok: true, state: null } }) : r.continue()));
});

const SENTENCE = 'The trials gave dried ginger in capsules, which is not what a fresh-rhizome tea contains.';

async function typeIntoNewNote(page: Page) {
  const drawer = page.getByTestId('notepad-drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByTestId('new-note').click();
  const body = drawer.getByTestId('note-body').first();
  await expect(body).toBeFocused();
  await page.keyboard.type(SENTENCE, { delay: 15 });
  await expect(body).toHaveValue(SENTENCE);
  await expect(body).toBeFocused();
  await expect(drawer.getByRole('button', { name: 'Close Notepad' }).last()).not.toBeFocused();
}

test('notepad drawer on a non-/read page keeps focus while typing a full sentence', async ({ page }) => {
  await page.goto('/glossary');
  await page.getByTestId('notepad-toggle').click();
  await typeIntoNewNote(page);
});

test('notepad drawer on /read at 375 px keeps focus while typing a full sentence', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/read');
  await page.getByRole('button', { name: 'Open notepad' }).click();
  await typeIntoNewNote(page);
});

test('the drawer still moves focus to Close on open and back to the opener on close', async ({ page }) => {
  await page.goto('/glossary');
  const toggle = page.getByTestId('notepad-toggle');
  await toggle.click();
  await expect(page.getByTestId('notepad-drawer').getByRole('button', { name: 'Close Notepad' }).last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('notepad-drawer')).toBeHidden();
  await expect(toggle).toBeFocused();
});
