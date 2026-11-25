/**
 * Local-only endpoint for `npm run dev` and `npm run preview` (APP-SPEC §3.1, KICKOFF §4c "Notepad persistence"),
 * ported from ptsd-inflammation-critique (its Neo4j .env endpoint dropped — this app has no graph lab):
 *
 *   GET/PUT /__local/notes      autosave of the notepad to notes/notepad.md (organised by section) and
 *                               notes/notepad.json (the machine state) in the app folder.
 *
 * This is Vite server middleware: it does not exist in dist/, so a built bundle served anywhere else has no such
 * endpoint and the app falls back to localStorage, saying so ("Saved in this browser only — export to keep a
 * copy."). Requests from anything but loopback, or addressed to any host name other than localhost / 127.0.0.1 /
 * [::1], are refused — the same bundle served under another name behaves as it would online.
 * BX_NOTES_DIR redirects the notes file (the e2e suite points it at test-results/ so tests never touch real notes).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function readBody(req: IncomingMessage, limit = 5_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function hostName(hostHeader: string | undefined): string {
  const h = (hostHeader ?? '').trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  return h.split(':')[0];
}

export function localEndpoints(root: string): Plugin {
  const notesDir = () => path.resolve(root, process.env.BX_NOTES_DIR ?? 'notes');
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = (req.url ?? '').split('?')[0];
    if (!url.startsWith('/__local/')) return next();
    const send = (code: number, body: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)); };
    if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return send(403, { error: 'loopback only' });
    if (!LOCAL_HOSTS.has(hostName(req.headers.host))) return send(403, { error: 'localhost only' });
    try {
      if (url === '/__local/notes') {
        const dir = notesDir();
        const jsonPath = path.join(dir, 'notepad.json');
        if (req.method === 'GET') {
          if (!fs.existsSync(jsonPath)) return send(200, { ok: true, state: null });
          return send(200, { ok: true, state: JSON.parse(fs.readFileSync(jsonPath, 'utf8')) });
        }
        if (req.method === 'PUT') {
          const body = JSON.parse(await readBody(req)) as { state: unknown; markdown: string };
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(jsonPath, JSON.stringify(body.state, null, 2) + '\n');
          fs.writeFileSync(path.join(dir, 'notepad.md'), String(body.markdown ?? ''));
          return send(200, { ok: true, file: path.relative(root, path.join(dir, 'notepad.md')) });
        }
        return send(405, { error: 'method' });
      }
      return send(404, { error: 'unknown' });
    } catch (e) {
      return send(500, { error: String((e as Error).message) });
    }
  };
  return {
    name: 'bx-local-endpoints',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}
