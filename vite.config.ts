/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { localEndpoints } from './scripts/local-endpoints';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

/**
 * SPA deep links need a 404.html that is a copy of index.html (the Bioactive Explorer fallback). This app is
 * delivered locally (delivery: local); the fallback is kept because it makes promotion to Pages a one-liner.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(fileURLToPath(new URL('./dist', import.meta.url)));
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
    },
  };
}

// BASE_PATH support is kept (KICKOFF §6a); the local build uses base "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // localEndpoints(): dev/preview-server middleware only (the notepad's file autosave) — never part of dist/,
  // and it answers loopback requests only.
  plugins: [react(), spaFallback(), localEndpoints(fileURLToPath(new URL('.', import.meta.url)))],
  // The e2e suite reaches the preview under a non-localhost name to prove the notepad says "this browser only" there.
  preview: { allowedHosts: process.env.BX_TEST_HOST ? [process.env.BX_TEST_HOST] : [] },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'remark-gfm'],
          katex: ['katex', 'rehype-katex', 'remark-math'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
