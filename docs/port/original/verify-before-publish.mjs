#!/usr/bin/env node
// Sunstone Legacy — pre-publish gate.
//
//   node verify-before-publish.mjs <candidate.html>
//
// Exits non-zero if the candidate build would REGRESS the live artifact.
// Run this before anything is published to the live artifact URL.
//
// Expects SUNSTONE_MANIFEST.json beside it (rename to MANIFEST.json, or edit
// the path below).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = ['MANIFEST.json', 'SUNSTONE_MANIFEST.json']
  .map((f) => path.join(here, f))
  .find((p) => fs.existsSync(p));
if (!manifestPath) {
  console.error('no MANIFEST.json / SUNSTONE_MANIFEST.json found beside this script');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const rank = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || ''));
  return m ? +m[1] * 1e6 + +m[2] * 1e3 + +m[3] : 0;
};
const readBuild = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const m = /ea\s*=\s*"([\d.]+)-artifact"/.exec(src);
  if (!m) throw new Error(`${file}: no build id found (expected ea = "X.Y.Z-artifact")`);
  return m[1];
};

const candidate = process.argv[2];
if (!candidate) {
  console.error('usage: node verify-before-publish.mjs <candidate.html>');
  process.exit(2);
}

const candidateBuild = readBuild(candidate);
const floor = manifest.canonical_build.replace('-artifact', '');

console.log(`candidate : ${candidate}`);
console.log(`build     : ${candidateBuild}`);
console.log(`floor     : ${floor} (${manifest.canonical_file})`);

if (rank(candidateBuild) < rank(floor)) {
  console.error(`
+==============================================================+
|  BLOCKED - this build is OLDER than what is already live.    |
+==============================================================+

  Publishing ${candidateBuild} over ${floor} would destroy the work in
  builds ${floor} down to ${candidateBuild}.

  ${manifest.canonical_file} is the source of truth. Port its changes
  forward into the repo FIRST, bump the repo past ${floor}, then re-run
  this check.

  Live artifact: ${manifest.live_artifact_url}
`);
  process.exit(1);
}

if (rank(candidateBuild) === rank(floor)) {
  console.log('\nEQUAL to the current floor - allowed only if this is a republish of the same build.');
  console.log('If you changed anything, bump the build id first.\n');
} else {
  console.log(`\nOK - ${candidateBuild} moves forward from ${floor}. Safe to publish.`);
  console.log('After publishing, update the manifest (canonical_build, canonical_file, canonical_sha256).\n');
}
process.exit(0);
