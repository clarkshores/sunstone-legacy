# docs/port/original/ — the 2026-09-16 handoff scripts, verbatim

Recovered from Drive on 21 Sep 2026, from the Zero/Claude exchange folder. These
are **reference copies, not the running gate.** Nothing in CI invokes them.

- `verify-before-publish.mjs` — the original pre-publish gate.
- `SUNSTONE_MANIFEST.json` — the original manifest.

The live gate is `tools/verify-before-publish.mjs`, reconciled against these.

## Where the live gate diverges, and why

| | original | live gate |
|---|---|---|
| Build-id regex | `/ea\s*=\s*"([\d.]+)-artifact"/` | same, anchored; falls back to a bare literal only when exactly one exists, and warns |
| Older build | blocked, rc 1 | same |
| Equal rank, identical bytes | allowed, rc 0 | same |
| **Equal rank, different bytes** | **allowed with a warning, rc 0** | **blocked, rc 1** |
| No build id | throws, rc 1 | blocked with a clear message, rc 1; names the ambiguous candidates if several |
| Bad invocation | rc 2 | same |

The one behavioural divergence is the equal-rank-different-bytes case. The
original prints "allowed only if this is a republish of the same build — if you
changed anything, bump the build id first" and exits 0, so the decision rests on
the operator reading the warning.

That case is an edit that never bumped its id. Publishing it overwrites the live
artifact while the manifest still attests the old hash — the manifest check then
passes against a file that is no longer what shipped, which is precisely the
silent regression these protections exist to catch. A guard that depends on
someone reading a success message is not a guard, so the live gate blocks it and
asks for a bump.

This was a deliberate choice, not an oversight in transcription. If Zero wants
the original's warn-and-continue behaviour, it is a two-line change.

## What was NOT recovered

The three Playwright suites — `test_v0.13.mjs`, `test_build_guard.mjs`,
`test_v0.12.mjs` — are not in Drive. A search of the whole Drive by filename and
by content found only these two files and the protocol document. The suites
exist solely in Clark's local handoff folder, and four of the eight
release-gate rows cannot be run until they land here.

The original manifest's `canonical_file_holder` field says the canonical bundle
was "not stored in Drive due to size" — which is why recovering it from the live
artifact URL was the only route.
