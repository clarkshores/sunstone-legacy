# artifact/ — the build artifact

`sunstone-v0.14.CANONICAL.html` **is the build** for v1.0. Not a compiled
output of `src/`, not a backup — the artifact itself. See
`docs/PLAN-30-DAY.md` revision 2, Improvement 1.

Builds 0.8 through 0.14 were written as patches against this compiled bundle
rather than against the TypeScript source, so seven rounds of work exist only
here. `src/` is at 0.7.0 and cannot reproduce this file.

## Provenance

Recovered 21 Sep 2026 by reading the live artifact at
`https://claude.ai/artifact/1dXVYs83AjdmVj8S4DZq8w`, and verified
byte-identical to the copy checksummed on 16 Sep:

    212705 bytes
    sha256 9d97eaa78dc5af183f5aa0cb66a07cf0ace5e06f5a8740d1c001a70343fdc15a
    build  0.14.0-artifact

Before this commit the file existed only at that URL and on Clark's machine.
It was not in the Drive mirror.

## The rule

> Nothing ranked below **0.14.0** may be published to the artifact URL.

Build rank = `major*1e6 + minor*1e3 + patch`. The id lives in the bundle as
`ea = "X.Y.Z-artifact"`; keep that shape, the gate greps for it.

Publishing an older build to that URL erases the newer one with no undo.

## Three protections

1. **Manifest** — `MANIFEST.json` pins the build and its sha256.
   `node tools/verify-manifest.mjs` fails if the file on disk stops matching.
2. **Pre-publish gate** — `node tools/verify-before-publish.mjs <candidate.html>`
   exits non-zero for anything below the floor. Run it before **any** publish.
3. **Runtime guard** — shipped inside 0.14.0. The game records the highest build
   id it has ever run in `localStorage.sunstone_build_seen_v1`; an older build
   raises a pulsing red title warning and emits a `build_regression` telemetry
   event, and never lowers the high-water mark.

All three run in CI on every push (`.github/workflows/verify.yml`), with
negative tests for every regression the gate exists to catch: an older build, a
bundle with no build id, an ambiguous build id, and an edit that never bumped
its id. CI also rebuilds the deploy output and checks it byte for byte against
the manifest.

The gate was reconciled on 21 Sep against the original 2026-09-16 handoff
script, recovered from Drive and kept verbatim at `docs/port/original/`. It
diverges in one place — an equal-ranked build whose bytes differ is **blocked**
rather than warned about. See that directory's README for the reasoning.

## Editing this file

Patch it, bump the build id past 0.14.0, run the gate, publish, then update
`MANIFEST.json` to pin the new build and hash. Do not hand-edit the id without
a real change behind it — the guard exists to make regressions loud.
