#!/usr/bin/env node
// Pre-publish gate. Reads the build id out of a candidate bundle and refuses
// anything that would regress the live artifact.
//
//   node tools/verify-before-publish.mjs <candidate.html>
//
// Exit 0 = safe to publish. 1 = BLOCKED. 2 = bad invocation.
//
// Builds 0.8-0.14 were written as patches against the compiled bundle, not the
// TypeScript source. Publishing an older build to the artifact URL erases them
// with no undo. That is what this gate exists to prevent.
//
// Reconciled against the original gate script written 2026-09-16, recovered
// from Drive and kept at docs/port/original/verify-before-publish.mjs.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'artifact/MANIFEST.json'), 'utf8'));

// The build id lives in the bundle as `ea = "X.Y.Z-artifact"`. Anchor on that
// assignment rather than on any string of that shape: the bundle is minified
// and a bare `"X.Y.Z-artifact"` literal could appear elsewhere, which would
// have this gate rank the wrong value. Fall back to a bare literal only when
// the anchored form is absent, and say so.
const ANCHORED = /\bea\s*=\s*"(\d+)\.(\d+)\.(\d+)-artifact"/;
const BARE = /"(\d+)\.(\d+)\.(\d+)-artifact"/g;

const rank = (major, minor, patch) => major * 1e6 + minor * 1e3 + patch;

function die(code, msg) {
  console.error(code === 1 ? `BLOCKED: ${msg}` : `ERROR: ${msg}`);
  process.exit(code);
}

const candidate = process.argv[2];
if (!candidate) die(2, 'usage: node tools/verify-before-publish.mjs <candidate.html>');

let html;
try {
  html = readFileSync(candidate, 'utf8');
} catch (err) {
  die(2, `cannot read ${candidate}: ${err.message}`);
}

let parts = html.match(ANCHORED);
if (!parts) {
  const bare = [...new Set(html.match(BARE) ?? [])];
  if (bare.length !== 1) {
    die(
      1,
      `no \`ea = "X.Y.Z-artifact"\` build id in ${candidate}` +
        (bare.length > 1 ? `, and ${bare.length} ambiguous candidates: ${bare.join(', ')}` : '') +
        '. A bundle whose build cannot be identified cannot be ranked, so it cannot be cleared.',
    );
  }
  parts = bare[0].match(/"(\d+)\.(\d+)\.(\d+)-artifact"/);
  console.warn(`warning: no anchored \`ea =\` build id; fell back to the sole literal ${bare[0]}`);
}

const [, major, minor, patch] = parts.map(Number);
const candidateRank = rank(major, minor, patch);
const floor = manifest.floor.rank;
const sha = createHash('sha256').update(readFileSync(candidate)).digest('hex');

console.log(`candidate : ${candidate}`);
console.log(`build     : ${major}.${minor}.${patch}-artifact (rank ${candidateRank})`);
console.log(`floor     : ${manifest.floor.build} (rank ${floor})`);
console.log(`sha256    : ${sha}`);

if (candidateRank < floor) {
  die(
    1,
    `build ${major}.${minor}.${patch} ranks ${candidateRank}, below the floor ${floor}. ` +
      `Publishing it over ${manifest.floor.build} would destroy every build in between. ` +
      `Port its changes forward and bump past the floor first. Live: ${manifest.artifactUrl}`,
  );
}

if (candidateRank === floor) {
  // Same build id as the floor. Byte-identical means a republish of the same
  // build, which is safe. Different bytes means an edit that never bumped its
  // id: publishing it would overwrite the live artifact while the manifest
  // still attests the old hash, which is the exact silent regression this gate
  // exists to catch.
  //
  // The original script only warned here. Blocking is a deliberate divergence.
  if (sha !== manifest.canonical.sha256) {
    die(
      1,
      `build ${major}.${minor}.${patch} equals the floor but the bytes differ from the ` +
        `canonical build (expected ${manifest.canonical.sha256}). This is an edit that never ` +
        'bumped its build id. Bump the build id, then re-run.',
    );
  }
  console.log('\nOK: byte-identical to the canonical build. Safe to republish as-is.');
  process.exit(0);
}

console.log(
  `\nOK: ${major}.${minor}.${patch} moves forward from ${manifest.floor.build}. Safe to publish.\n` +
    'After publishing, update artifact/MANIFEST.json (canonical build, bytes, sha256) and the floor.',
);
