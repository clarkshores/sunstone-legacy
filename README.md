# Sunstone Legacy

Single-player, portrait, tap-to-move JRPG for iOS. Phaser 3 + TypeScript, wrapped with Capacitor.

## Run

```bash
npm install
npm run dev    # http://localhost:5173 — open in a phone-sized viewport
npm run build  # type-check + production bundle in dist/
npm test       # Playwright bot playthrough (needs a Chromium; see playwright.config.ts)
npx tsx scripts/validate-maps.ts   # map connectivity / entity placement checks
```

## iOS

```bash
cp .env.example .env   # add Supabase URL + anon key
npm run cap:add:ios    # once
npm run cap:sync       # after every change
npm run cap:open       # opens Xcode: set team, bundle id, run on device / archive
```

## Telemetry

Run `supabase/schema.sql` in the Supabase SQL editor. The game posts to `events` with the anon key (insert-only RLS). Analysis views: `sessions`, `death_hotspots`, `battle_balance`, `progress_funnel`. Without keys, events stay local: `window.__rpg.telemetry.dump()`.

## Layout

```
src/data       items, spells, monsters, encounter tables, maps (ASCII grids)
src/gfx        placeholder pixel art + texture generation
src/scenes     Boot, Title, World (tap-to-move), Battle
src/state      GameState, save/load, session clock
src/telemetry  event queue + Supabase uploader
src/ui         windows, menus, pack menu
docs           GDD, release plan, handoff, port plan
```

`window.__rpg` exposes the game to automation (used by the tests): `pick(label)`, `advance()`, `walkTo(x,y)`, `tapEntity(id)`, `state()`, `telemetry.dump()`.

## Repository status

This repository was empty until 21 Sep 2026. Builds v0.1–v0.14 were produced in
ephemeral sessions; the documentation set below is the surviving record and is
restored here from the Drive mirror. The application source has **not** yet been
pushed — see `docs/PLAN-30-DAY.md` § Improvement 1 for how the source of truth
is being redefined, and `docs/port/` for the state of the v0.7 → v0.14 gap.
