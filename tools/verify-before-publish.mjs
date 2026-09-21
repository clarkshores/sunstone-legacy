#!/usr/bin/env node
// Pre-publish gate. Reads the build id out of a candidate bundle and refuses
// anything ranked below the floor in artifact/MANIFEST.json.
//
//   node tools/verify-before-publish.mjs <candidate.html>
//
// Exit 0 = safe to publish. Non-zero = BLOCKED, do not publish.
//
// Builds 0.8-0.14 were written as patches against the compiled bundle, not the
// TypeScript source. Publishing an older build to the artifact URL erases them
// with no undo. That is what this gate exists to prevent.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'artifact/MANIFEST.json'), 'utf8'));

const BUILD_RE = /"(\d+)\.(\d+)\.(\d+)-artifact"/;

const rank = (major, minor, patch) => major * 1e6 + minor * 1e3 + patch;

function fail(msg) {
  console.error(`BLOCKED: ${msg}`);
  process.exit(1);
}

const candidate = process.argv[2];
if (!candidate) fail('no candidate file given. Usage: verify-before-publish.mjs <candidate.html>');

let html;
try {
  html = readFileSync(candidate, 'utf8');
} catch (err) {
  fail(`cannot read ${candidate}: ${err.message}`);
}

const match = html.match(BUILD_RE);
if (!match) {
  fail(
    `no build id found in ${candidate}. The id must appear as "X.Y.Z-artifact". ` +
      'A bundle without one cannot be ranked, so it cannot be cleared for publish.',
  );
}

const [, major, minor, patch] = match.map(Number);
const candidateRank = rank(major, minor, patch);
const floor = manifest.floor.rank;
const sha = createHash('sha256').update(readFileSync(candidate)).digest('hex');

console.log(`candidate : ${candidate}`);
console.log(`build     : ${major}.${minor}.${patch}-artifact (rank ${candidateRank})`);
console.log(`floor     : ${manifest.floor.build} (rank ${floor})`);
console.log(`sha256    : ${sha}`);

if (candidateRank < floor) {
  fail(
    `build ${major}.${minor}.${patch} ranks ${candidateRank}, below the floor ${floor}. ` +
      'Publishing it would erase builds that exist only in the artifact.',
  );
}

if (sha === manifest.canonical.sha256) {
  console.log('\nOK: byte-identical to the canonical build. Safe to publish.');
} else {
  console.log(
    `\nOK: rank ${candidateRank} >= floor ${floor}. Safe to publish.\n` +
      'Note: this is NOT the canonical build. It supersedes it — update ' +
      'artifact/MANIFEST.json to pin the new build and hash once published.',
  );
}
