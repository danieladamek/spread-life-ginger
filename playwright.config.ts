import { defineConfig, devices } from '@playwright/test';

// KICKOFF §5: Playwright serves dist/ on :4173. BX_PORT overrides it when 4173 is taken by another app's preview.
const PORT = Number(process.env.BX_PORT ?? 4173);
/** A non-localhost name for the same preview: the notepad's file endpoint refuses it, as any online host would. */
export const OFFLINE_HOST = 'bx-offline.test';
export const NOTES_DIR = 'test-results/notes-autosave';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { args: [`--host-resolver-rules=MAP ${OFFLINE_HOST} localhost`] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // BX_NOTES_DIR keeps the notepad file autosave away from the reader's real notes/notepad.md.
    command: `BX_NOTES_DIR=${NOTES_DIR} BX_TEST_HOST=${OFFLINE_HOST} npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
