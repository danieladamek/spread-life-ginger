/** @type {import('tailwindcss').Config} */
import fs from 'node:fs';

// Every brand colour is a CSS variable from src/styles/tokens.css (the one file to swap, KICKOFF §8.6).
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
// The review's own categories (manifest.palette.groups → cat.*): history · health · plant · kitchen.
let groups = {};
try { groups = JSON.parse(fs.readFileSync(new URL('./src/data/manifest.json', import.meta.url), 'utf8')).palette.groups; } catch { /* first run, before build:content */ }

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // BRAND-REFERENCE: a sturdy geometric sans for interface and headings, a readable serif for the review text.
        display: ['"Avenir Next"', 'Avenir', '"Century Gothic"', 'Futura', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', '"Book Antiqua"', 'Georgia', 'serif'],
        mono: ['"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: v('ink'), muted: v('ink-muted') },
        paper: { DEFAULT: v('paper'), 2: v('paper-2'), card: v('card') },
        night: { DEFAULT: v('night'), 2: v('night-2'), ink: v('night-ink'), muted: v('night-muted'), blue: v('night-blue'), olive: v('night-olive'), line: v('night-line') },
        brand: { blue: v('blue'), deep: v('blue-deep'), soft: v('blue-soft'), butter: v('butter'), olive: v('olive'), 'olive-deep': v('olive-deep'), foliage: v('foliage'), hairline: v('hairline'), line: v('line'), rhizome: v('rhizome') },
        cat: groups,
      },
    },
  },
  plugins: [],
};
