// Serves the canonical bundle to a headless browser for testing.
//
// The bundle loads Phaser from cdnjs. This environment has no route to cdnjs,
// and a playthrough that depends on a third-party CDN is fragile anyway, so the
// harness serves the pinned local copy of the same Phaser version instead.
//
// The ONLY edit to the bundle is that one script src. It is done in memory:
// artifact/sunstone-v0.14.CANONICAL.html is never written to. The harness
// asserts the file's sha256 before serving and reports exactly what it changed.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'artifact/MANIFEST.json'), 'utf8'));

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js';
const LOCAL = '/phaser.min.js';

export function loadBundle() {
  const file = resolve(root, manifest.canonical.file);
  const raw = readFileSync(file);
  const sha = createHash('sha256').update(raw).digest('hex');
  if (sha !== manifest.canonical.sha256) {
    throw new Error(`bundle is not the canonical build: ${sha} != ${manifest.canonical.sha256}`);
  }
  const html = raw.toString('utf8');
  if (!html.includes(CDN)) throw new Error('expected the Phaser CDN script tag; bundle shape changed');
  return { html: html.replaceAll(CDN, LOCAL), sha, bytes: raw.length };
}

export async function serve() {
  const { html, sha, bytes } = loadBundle();
  const phaser = readFileSync(resolve(root, 'node_modules/phaser/dist/phaser.min.js'));

  const server = createServer((req, res) => {
    if (req.url.startsWith(LOCAL)) {
      res.writeHead(200, { 'content-type': 'application/javascript' }).end(phaser);
    } else {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    }
  });

  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}/`;
  return { url, sha, bytes, close: () => new Promise((ok) => server.close(ok)) };
}
