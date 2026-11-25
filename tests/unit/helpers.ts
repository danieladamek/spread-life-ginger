import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

export const ROOT = path.resolve(__dirname, '..', '..');
/** The smallest valid topic-mode pack (with the recipes extension), written for these tests. */
export const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'topic-min');

/** Copy the fixture pack to a temp dir, apply `mutate`, run the content build on it; return exit code and errors. */
export function buildFixture(mutate: (dir: string) => void = () => {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bx-pack-'));
  const pack = path.join(tmp, 'pack');
  fs.cpSync(FIXTURE, pack, { recursive: true });
  mutate(pack);
  const out = path.join(tmp, 'out');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(ROOT, 'scripts', 'build-content.ts'), '--pack', pack, '--out', out, '--quiet'], { encoding: 'utf8' });
  const beFile = path.join(out, 'src', 'data', 'build-errors.json');
  const be = fs.existsSync(beFile) ? JSON.parse(fs.readFileSync(beFile, 'utf8')) as { errors: string[]; warnings: string[] } : { errors: [r.stderr], warnings: [] };
  const report = path.join(pack, 'BUILD-ERRORS.md');
  return { code: r.status, errors: be.errors, warnings: be.warnings, report: fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : null, out, pack, stderr: r.stderr };
}

export const edit = (file: string, fn: (s: string) => string) => fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
/** Load a YAML file of the pack, change it, write it back (the shape negative_tests.py uses). */
export function editYaml<T = unknown>(dir: string, file: string, fn: (d: T) => void) {
  const p = path.join(dir, file);
  const d = yaml.load(fs.readFileSync(p, 'utf8')) as T;
  fn(d);
  fs.writeFileSync(p, yaml.dump(d, { lineWidth: -1 }));
}
export const readJson = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
