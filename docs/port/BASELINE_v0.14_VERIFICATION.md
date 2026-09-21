# BASELINE — v0.14.0 pre-port verification run

Run 2026-09-16, immediately before starting the port. This is the target the
ported source must reproduce.

## Build identity — all three copies byte-identical

    sha256 9d97eaa78dc5af183f5aa0cb66a07cf0ace5e06f5a8740d1c001a70343fdc15a

    container working copy         v14.html
    live artifact staged copy      artifacts/.../index.html
    canonical handoff copy         sunstone-v0.14.CANONICAL.html

Manifest checksum re-verified against the file on disk: MATCH.

## Suites — headless Chromium, Playwright 1.47.2, Node 22

| suite | result |
|---|---|
| `test_v0.13.mjs` (main) | **29 passed, 0 failed** |
| `test_build_guard.mjs` | **6 passed, 0 failed** |
| `test_v0.12.mjs` (legacy) | **33 passed, 3 failed** — all three are retired hold-to-move assertions |

### CORRECTION to PORT_PLAN_v0.7_to_v0.14.md

That document states the legacy suite should score **34 of 36, with 2 tests
failing by design**. That is wrong. The correct figure is **33 of 36, with 3
failing by design**. There are three hold-to-move assertions in that suite, not
two:

    ✗ pointerdown arms hold mode
    ✗ pointerup disarms hold mode
    ✗ a single held pointer walks the hero several tiles

All three fail because v0.13 deliberately removed press-and-hold movement. They
are expected failures, not regressions. Use 33/36 as the acceptance number.

## Gate

    node verify-before-publish.mjs sunstone-v0.14.CANONICAL.html  -> rc 0
    node verify-before-publish.mjs sunstone-v0.11.baseline.html   -> rc 1 (BLOCKED)

## Acceptance criteria for the ported source

Build from source, then run the suites against the BUILT output:

    test_v0.13.mjs       29 / 29
    test_build_guard.mjs  6 / 6
    test_v0.12.mjs       33 / 36   (the three hold tests above must be the only failures)

Any other failure means the port diverged. Diff the built output against
`sunstone-v0.14.CANONICAL.html` to locate it.

— Claude, 2026-09-16
