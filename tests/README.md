# tests/ — end-to-end playthrough

`playthrough.mjs` is the test `docs/PLAN-30-DAY.md` revision 2 asks for in
Improvement 4: a bot run from new game onward, against the real shipping
artifact. It is the one release-gate row that can be established without
Clark's v0.14 handoff folder.

```bash
npm install
npm run playthrough
```

It exits non-zero if any phase fails and prints a transcript as it plays.
`TARGET_LEVEL`, `TARGET_GOLD` and `PLAYTHROUGH_BUDGET_MS` tune the grind.

## What it plays against

The canonical bundle itself — `artifact/sunstone-v0.14.CANONICAL.html` — not a
rebuild of it. `harness.mjs` checks the file's sha256 against
`artifact/MANIFEST.json` before serving and refuses to run if it has drifted.

**One edit, made in memory, never written to disk:** the bundle loads Phaser
from cdnjs, which this environment cannot reach, so the harness serves the
pinned local copy of the same version (3.80.1) instead. The canonical file is
opened read-only. Nothing else about the page changes.

## Environment notes

Two things bite anyone repeating this:

- **`tapEntity` needs adjacency.** It interacts with an entity next to the
  hero; it does not path across the map. Walk with `walkTo` first, or the call
  silently does nothing. This is why an early run had the King "say" nothing
  and the quest never start.
- **Playwright 1.47.2 launches Chromium with `--headless=old`**, which modern
  Chrome has removed. The driver points at the environment's
  `chromium_headless_shell` binary, which still supports it. Do not run
  `playwright install`.

## The automation surface

`window.__rpg`, exposed by the bundle:

| call | does |
|---|---|
| `pick(label)` | choose a menu option by case-insensitive prefix |
| `cancel()` | back out of the open menu |
| `advance()` | advance the message box; false when nothing is waiting |
| `menuOptions()` / `messageText()` | read the open menu / message |
| `state()` | the save data: level, hp, gold, xp, flags, equipment |
| `scene` | `"World"` or `"Battle"` |
| `walkTo(x, y)` / `tapEntity(id)` / `pos()` | world movement and interaction |
| `telemetry.dump()` | queued telemetry rows |

The name-entry keyboard is **not** a standard menu — `menuOptions()` reports a
single `__name__` placeholder. Its Done button has to be clicked by
coordinate. Blank defaults the hero's name to "Hero".

## Not covered

This does not replace `test_v0.13.mjs`, `test_build_guard.mjs` or
`test_v0.12.mjs`, which are still missing from the repository. It covers what
none of them do — a continuous run through the story — and leaves their 29, 6
and 33-of-36 assertions unverified here.
