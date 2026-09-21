# PORT PLAN — repo v0.7.0 → bundle v0.14.0

> **Correction (see `BASELINE_v0.14_VERIFICATION.md`):** the verification table
> at the bottom of this file says the legacy suite should score 34 of 36 with
> two tests failing by design. That is wrong. The correct acceptance number is
> **33 of 36 with three expected failures** — there are three retired
> hold-to-move assertions, not two. The original text is left unedited below;
> use 33/36.
>
> **Scheduling (21 Sep 2026):** this port is no longer on the critical path to
> v1.0. See `docs/PLAN-30-DAY.md` revision 2, Improvement 1.

Consolidated spec for the port. Seven rounds, grouped by subsystem rather than
by version, because that is how the source is organised. Claude executes this
against `src/` once it is uploaded here.

Bundle identifiers below are the minified names in the compiled artifact — they
are pointers for locating the equivalent source symbol, not names to introduce
into the TypeScript.

---

## A. Save / session / settings

- **Fog of war state.** `data.explored[mapId]` — one char per tile,
  `0` unknown / `1` glimpsed / `2` explored. Reveal radius 4 (dungeon) / 6
  (overworld), stamped every step on `overworld` and `north`.
  `markExplored(mapId, x, y, w, h)` and `fogAt(mapId, x, y, w, h)`.
- **Suspend save.** `suspend_v1` written on `visibilitychange` and `pagehide`.
  Title screen offers **Resume** when the suspend record is newer than the slot.
- **Settings:** `autoBattle` (persisted), `theme` (`classic` | `fable`),
  `textSpeed` (`slow` 28 / `normal` 14 / `fast` 5 / `instant` 0 ms per char).
- **Build-regression guard (v0.14).** `localStorage` key
  `sunstone_build_seen_v1` holds the highest build id ever run. Build rank =
  `major*1e6 + minor*1e3 + patch`. On a lower-ranked build: red pulsing title
  warning + `build_regression` telemetry event; the stored high-water mark is
  NOT lowered. Source must keep the build id in the same
  `X.Y.Z-artifact` shape the gate script greps for.

## B. Telemetry

- Sink config resolved at runtime, in priority order:
  `window.__RPG_TELEMETRY__`, then `?tele=&telekey=` query params, then
  `localStorage.telemetry_cfg_v1`. Posts batches to `/rest/v1/events` with
  `apikey` + `Bearer` headers.
- Settings → **Export play data** (clipboard fallback).
- Events added across these rounds: `encounter_gap`, `secret_found`,
  `boss_defeated`, `optimize_gear`, `drop`, `level_up`, `quest_started`,
  `chapter_complete`, `map_open`, `journal_open`, `warp`, `build_regression`.
- `ta` (Supabase URL) and `xt` (anon key) are still undefined in src.

## C. World / movement

- **Tap forgiveness.** `nearPortal` snaps a tap within 0.78 tile of a portal
  centre onto that portal; `nearestWalkable` routes a wall tap to the best
  neighbouring walkable tile instead of rejecting it.
- **Movement is single-click only.** v0.12 added press-and-hold steering;
  v0.13 removed it completely. Do NOT port hold-to-move — no `holdTick`, no
  pointerup/gameout handlers, no hold timer. `pointerdown → onTap` only.
- `onTap` ignores taps with screen `y < 72` (the HUD strip). This is why the
  north gateway had to move off row 0 in v0.10.
- **Encounter pacing.** `rollStepBudget()` replaces per-step RNG: floor of 4
  steps, mean ≈ `1 / rate`.
- **Cleared dungeons (v0.13).** Maps `cave1`, `cave2`, `peak1`, `peak2` gain a
  `clearedFlag` field (`bossDefeated` / `drakeDefeated`). `rollStepBudget`
  multiplies the rate by `0.25` when that flag is set.

## D. Maps / content

- Ardent exit door (12,21) → (12,20); overworld arrival (12,19).
- North gateway at overworld (12,1); pass guard NPC at (12,2).
- **Northern pass chokepoint (v0.13).** Overworld grid row 1, columns 11 and
  13 were walkable grass — the guard could simply be walked around. Row 1 is
  now `mmmttttttggtrtgmmmmgggggggttttmmmmmm` (trees at 11 and 13), making
  column 12 a single-file gate. Row 0 already had mountains there.
- Map-2 entry moved SSE: north (24,26) both ways; road carved on row 26;
  row-29 stub removed.
- **Secret passage.** Legend `X` = renders as wall, walkable, `secret: true`,
  in both `St` and `Gt` legends. cave1 (15,17); chest `c1_secret` (17,17) =
  `ringfang`. Flag `secret_<map>`, telemetry `secret_found`, journal line.
- **Shard reward chests (v0.13).** NPCs `shardpickup` (cave2) and
  `shard2pickup` (peak2) were authored with sprite `chestOpen` while still
  unopened — must be `chest`.

## E. Items / equipment

- **`crown`** — Crown of Command. Kind `ring`, `auto: true`, `+5 maxMp`.
  Drives `state.canAuto` / `hasAutoItem`. The battle **Auto** command exists
  only while it is worn; the Settings row shows "locked" otherwise.
  Auto-equips on pickup if the ring hand is free, else goes to the pack with a
  message naming the worn ring. Swapping a ring over it prompts Yes/No.
- **`gearScore`** values `auto` at 100; `isUpgrade` never rates a non-auto ring
  above a worn auto ring — Optimize / HUD nudge / shop cannot evict the crown.
- **Pack split.** Equipment screen and Inventory screen are separate
  (`Fa`/`Ga` vs `xa`); Inventory holds consumables + key items only.
- **Equipment screen is now a paper-doll screen (v0.12).** Hero portrait in a
  framed box, live ATK/DEF/AGI/CRIT + HP/MP, four tappable slot rows with item
  name / stat tag / bonus tags / ▲ upgrade marker, Optimize + Close buttons.
  The avatar is generated pixel art: a 20×24 layered sprite rendered to a
  canvas texture at 6×, cached per loadout under key
  `av_<weapon>_<armor>_<shield>_<ring>`. Layers: base body, armor (recoloured
  per item, 7 types), weapon (3 shapes — blade / dagger / mace — recoloured),
  shield (round / tower), ring (gold band + gem coloured per ring). `crown`
  additionally draws a crown on the head.
  **Do not hand-transcribe the art.** `art.py` is the source of truth for the
  sprite layers and `genart.py` emits the JS arrays — regenerate them.
- Shop shows ▲ upgrades, `(worn)` / `(owned)`, ✕ unaffordable.
- HUD nudge "⚙ better gear in pack" driven by `state.hasUnwornUpgrade`.

## F. Battle

- **One click per round (v0.13).** Three separate changes:
  1. `msg()` auto-advances by default — `auto: this.auto ? 260 : 560` ms.
     Previously every combat line waited for a tap.
  2. The message box gained a per-call typewriter override (`cd`); battle
     text uses `charDelay ? 3 : 0` ms instead of the global setting.
  3. **Fight** commits immediately against the first living enemy — no second
     target prompt. Tapping an enemy sprite still selects that target, so
     choice is preserved at one click.
- Encounter line and initiative line auto-advance.
- Auto-battle persists across fights, re-arms per fight; the low-HP stop pauses
  for that fight only rather than clearing the preference.
- Auto is refused against bosses.

## G. Quests

- **King's `onTalk` cascade (v0.13).** Every milestone was nested under
  `questStarted`, so a player who skipped the King, cleared the cave, and
  returned holding the shard needed two conversations and saw the wrong
  dialogue. It must resolve all pending milestones in one talk:
  set `questStarted` (skipping the 50-gold supply gift if `gotShard` is
  already true), then chapter 1 if `gotShard && !chapter1Done`, then chapter 2
  if `gotShard2 && chapter1Done && !chapter2Done`.
- The chapter-2 dialogue branch is gated behind `chapter1Done` so branches
  cannot render out of order.
- `lines` is evaluated BEFORE `onTalk`, so dialogue reflects pre-talk state.
  Preserve that ordering.

## H. Presentation

- **Theme system.** `settings.theme` = `classic` | `fable`. Fable = violet sky
  plus a MULTIPLY wash rectangle at depth 49 and an amber shell.
  **Gotcha:** `TilemapLayer.setTint` is a silent no-op in Phaser 3.80 — the
  wash rectangle is the workaround, not a stylistic choice.
- Shell CSS: framed letterbox, safe-area padding.
- **World map labels (v0.12/13).** Portals carry a faint static outline
  (alpha 0.28); the destination name appears only for the single nearest
  portal within 2 tiles, drawn at depth 11 with a dark stroke so it stays
  legible over the hero sprite. No pulsing tween.
- **Map screen (v0.12/13).** Labels are clamped by their own measured width,
  flip below the marker when within 14px of the top edge, and are dropped when
  they would collide with one already placed. Legend is three centred 11px
  lines; the panel is `mapHeight + 128` tall so the last line is not clipped.
- Difficulty blurbs shortened to fit the 40-char box.

---

## Verification — non-negotiable

The bundle is verified; a hand port is not, until it is rebuilt and retested.
After porting, build from source and run the suites against the BUILT output:

| suite | expected |
|---|---|
| `test_v0.13.mjs` | 29 passed, 0 failed |
| `test_build_guard.mjs` | 6 passed, 0 failed |
| `test_v0.12.mjs` | 34 of 36 — its two hold-to-move tests fail by design |

A port that does not reproduce those numbers has diverged from the artifact.
Diff the built output against `sunstone-v0.14.CANONICAL.html`
(sha256 `9d97eaa78dc5af183f5aa0cb66a07cf0ace5e06f5a8740d1c001a70343fdc15a`)
to find where.

## Known gaps

- Rounds 0.8–0.11 are specified here from the earlier session's manifest plus
  the compiled bundle. There is no v0.7 baseline bundle in this container, so
  those rounds cannot be re-derived as mechanical diffs the way 0.12–0.14 can
  (those three have exact assert-guarded patch scripts). Expect 0.8–0.11 to
  need reading the bundle against the source, function by function.
- No test covers a full 2–3 hour playthrough. Chapter 2 past the Ember Drake
  is unverified end to end.

— Claude, 2026-09-16
