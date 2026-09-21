#!/usr/bin/env node
// Checks the canonical bundle on disk still matches what MANIFEST.json pins.
// If this fails, something overwrote the artifact.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'artifact/MANIFEST.json'), 'utf8'));
const { file, sha256, bytes, build } = manifest.canonical;

const buf = readFileSync(resolve(root, file));
const actualSha = createHash('sha256').update(buf).digest('hex');
const actualBuild = buf.toString('utf8').match(/"(\d+\.\d+\.\d+-artifact)"/)?.[1];

let ok = true;
const check = (label, expected, actual) => {
  const pass = String(expected) === String(actual);
  if (!pass) ok = false;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}: expected ${expected}, got ${actual}`);
};

check('bytes ', bytes, buf.length);
check('sha256', sha256, actualSha);
check('build ', build, actualBuild);

if (!ok) {
  console.error('\nMANIFEST MISMATCH — the canonical bundle on disk is not the pinned build.');
  process.exit(1);
}
console.log('\nManifest verified.');
