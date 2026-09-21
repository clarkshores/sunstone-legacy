# Handoff — Sunstone Legacy v0.1 (14 Sep 2026)

## 1. What changed and why

Built the first playable draft of the RPG from Clark's brief (turn-based JRPG, classic fantasy, portrait tap-to-move, free, Supabase telemetry, App Store in 30 days). Engine: **Phaser 3 + TypeScript, Capacitor for iOS** — chosen so the whole game can be built and bot-tested in the cloud, with the Mac only needed for signing/upload.

Delivered: title/new/continue; Ardent castle town with king quest, armory, inn, 8 NPCs; Millbrook village; 36×40 overworld with 3 encounter zones; two-floor Whispering Cave; Gloomfang boss; turn-based battle (fight/spell/item/run, crits, specials, magic resist); leveling with 4 spells; 15 items; chests; save/load; death-to-inn rule; Chapter 1 completion. Telemetry queue + Supabase schema with analysis views. Placeholder pixel art generated in code so the art pack can be swapped by texture key.

## 2. Repository, branch, commit

Local git repo `kingdom-rpg`, branch `master`, commits `73586c1` (game) and `8c5b052` (docs). **No remote yet** — this environment has no GitHub credentials. Source archive: `sunstone-legacy-v0.1.tar.gz`. To publish: `git remote add origin git@github.com:<clark>/sunstone-legacy.git && git push -u origin master`.

## 3. Checks performed — actual results

- `tsc --noEmit`: clean. `vite build`: OK (1.5 MB bundle, 358 KB gzip).
- `scripts/validate-maps.ts`: all 5 maps rectangular, portals/NPCs/chests reachable.
- Playwright bot playthrough (headless Chromium, 390×844 touch): **3/3 passed** — (a) new game → king → shop → chest → walk to overworld → 3 battles → save → telemetry contains all expected event types → reload → continue; (b) death returns to inn with half gold and `player_death` event; (c) level-11 hero beats Gloomfang with Blaze/potions, picks up shard, king completes Chapter 1 (`boss_defeated`, `chapter_complete` events).
- Screenshots of title, town, dialog, shop, overworld, battle, cave reviewed visually.
- Single-file build boots with Phaser from cdnjs (verified with a local stub of the CDN; live CDN URL returns 200). Published as a Claude artifact for phone testing.
- **Not verified:** iOS build (no Xcode here), Supabase insert (no project/keys yet), real-device touch feel.

## 4. Blockers / risks / required configuration

- Supabase: create project, run `supabase/schema.sql`, put URL + anon key in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Until then telemetry stays on-device.
- iOS: `npm run cap:add:ios`, set signing team and bundle id in Xcode. Placeholder id `com.clarkshores.sunstone`, name "Sunstone Legacy" (both renameable).
- Content is ~35–50 min of play; Chapters 2–3 (planned, days 3–4 and 15–17) reach the 2–3 h target.
- Art is placeholder; the AI-art pass is the biggest quality risk (see PLAN-30-DAY risks).
- Balance: level-1 hero dies to a hills wolf pack; zones were laid out so the Ardent–Millbrook corridor is meadow-only. Needs telemetry confirmation.

## 5. Next action for Zero

1. Create the GitHub repo and Supabase project (or have Clark do it) and send back the repo URL + Supabase URL/anon key.
2. Approve or amend the 30-day plan (`docs/PLAN-30-DAY.md`) and the engine decision.
3. Assign Chapter 2 content + sound as the next Claude task; on-device Xcode run is Clark's day-2 task.

---

# Handoff — v0.2 polish pass (15 Sep 2026)

## 1. What changed and why
Brief from Clark: "your call — ease of use, graphics, marketability."

**Ease of use.** First-run tap hints (shown once, stored in settings). Quest tracker line in the HUD so the next objective is always visible. Tap an enemy in battle to attack it directly (menu still available). Settings menu: text speed (slow/normal/fast/instant), sound on/off, "Share play data" opt-out, About & privacy text. Auto-save on entering any town. Low-HP toast after battles. Larger menu touch rows.

**Graphics.** Automatic 1-px dark outline on every character/monster/chest sprite (readability on grass and stone). Hero 2-frame walk animation, 4 directions. Solid mountain tile with snow caps (was rocks-on-grass). Grass variants and flowers seeded by position. Two-frame animated water. Battle backdrops: layered hills + sun + tree line outdoors, stalactites + rock floor in caves. Sword slash arc, floating damage/heal/miss numbers, heavier shake on enemy specials. Title screen: hero walks across the foreground.

**Audio.** Chiptune SFX synthesised with WebAudio (no asset files): menu, hit, crit, miss, hurt, heal, spell, level-up, victory, death, chest, gold, door, inn, encounter, flee. Unlocked on first tap (iOS requirement). Mutable in Settings.

**Marketability.** `store/icon-1024.png` app icon; six 1290×2796 App Store screenshots with caption bands (`store/screenshot-6.7in-*.png`); `docs/STORE-LISTING.md` with name, subtitle, description, keywords, App Privacy answers, and a launch checklist. Telemetry now honours the opt-out (required for the privacy answers to be true).

## 2. Repository, branch, commit
Local repo `kingdom-rpg`, branch `master`, commit "v0.2 polish pass" on top of `8c5b052`. Still no remote (no GitHub credentials in this environment). Archive: `sunstone-legacy-v0.2.tar.gz`.

## 3. Checks performed — actual results
- `tsc --noEmit` clean; `vite build` OK; single-file artifact build boots (Phaser from cdnjs, verified with a local stub).
- Map validator: all maps valid.
- Playwright bot suite: **4/4 passed** (full playthrough, death rule, boss + chapter completion, first-run hints shown once).
- Screenshots reviewed: town, overworld, dialog, shop, battle with slash/damage number, cave, boss.
- Not verified: iOS device (no Xcode here); WebAudio on a real iPhone (implemented per the standard unlock-on-gesture pattern, needs a device check); Supabase (no keys).

## 4. Blockers / risks / configuration
Unchanged from v0.1: Supabase keys, GitHub remote, Xcode run. New: a privacy policy URL is now required for App Store Connect (one page, wording in STORE-LISTING.md).

## 5. Next action for Zero
1. Same three setup items (GitHub, Supabase, Xcode device run).
2. Confirm the store name/subtitle/keywords or send edits.
3. Next Claude task, in order of value: Chapter 2 content (doubles playtime), AI-art pass against the sprite spec in the GDD, background music (4 loops).

---

# Handoff — repository restore and plan revision 2 (21 Sep 2026)

## 1. What changed and why

`clarkshores/sunstone-legacy` was empty — no commits, no refs. Builds v0.1
through v0.14 were produced in ephemeral sessions and the only surviving record
was the Drive mirror. This commit restores that documentation set into the repo
and revises the end goal.

`docs/PLAN-30-DAY.md` is rewritten as revision 2, with four improvements to the
end goal: (1) the canonical v0.14 bundle becomes the build artifact and the
TypeScript port leaves the critical path; (2) release is governed by a
mechanical gate rather than the day-26 date; (3) the telemetry privacy work
moves from week-3 polish to a launch blocker; (4) v1.0 ships Chapters 1–2 and
Chapter 3 becomes the 1.1 update, with the missing end-to-end playthrough test
taking its place in the schedule. The original plan is preserved verbatim at the
bottom of that file.

Improvement 2 also corrects an error carried in `docs/port/PORT_PLAN_v0.7_to_v0.14.md`:
the legacy suite's acceptance number is 33 of 36 with three expected failures,
not 34 of 36 with two.

## 2. Repository, branch, commit

`clarkshores/sunstone-legacy`, branch `claude/wizardly-brown-fj78du`. See the
pull request for the commit.

## 3. Checks performed — actual results

- Drive mirror read and reconciled against the repo: `sunstone-legacy/` folder,
  `SUNSTONE_REPO_MIRROR/` folder, and the v0.1/v0.2 archives.
- Repo state confirmed empty before this commit (`git log` fatal: no commits;
  `git ls-remote origin` returned no refs).
- **Not run:** no build, no test suite, no gate script — this commit is
  documentation only, and the application source is not in the repository yet.
  Every figure quoted in the revised plan is cited from the 16 Sep verification
  run, not re-measured here.

## 4. Blockers / risks / required configuration

- **The TypeScript source is still not in the repo.** The Drive mirror holds a
  v0.7-era tree (`src/`, `tests/`, `scripts/`, `supabase/`, `store/`) that has
  not been pushed. It is no longer on the critical path (Improvement 1), but it
  is the only copy of the source that exists.
- ~~`sunstone-v0.14.CANONICAL.html` was not recovered.~~ **Resolved the same
  day** — see the 21 Sep addendum below.
- Supabase keys, the device run and the privacy policy URL remain outstanding,
  and are now all on the critical path.

## 5. Next action for Zero

See the addendum below — items 1 and 2 are done.

---

# Addendum — canonical bundle recovered, gate tooling live (21 Sep 2026)

Written after the entry above, same day, under Clark's grant of full control of
the project.

## 1. What changed and why

**The canonical v0.14 build artifact is recovered and in the repository.** It
was the single blocker on everything in plan revision 2, and it was not in the
Drive mirror — the entry above reported it lost.

`SUNSTONE_PORTBACK_PROTOCOL.md`, found in a separate Drive folder, named the
live artifact URL. Reading that artifact produced a file that is
**byte-identical** to the copy checksummed on 16 Sep: 212,705 bytes, sha256
`9d97eaa78dc5af183f5aa0cb66a07cf0ace5e06f5a8740d1c001a70343fdc15a`, build id
`0.14.0-artifact`. It is committed at `artifact/sunstone-v0.14.CANONICAL.html`.

**Improvement 1 is decided and executed**: the bundle is the build artifact. The
port-or-freeze question has been open since 16 Sep; with full control, freeze.
Everything Improvement 1 needs from the repository now exists:

- `artifact/MANIFEST.json` pins the build, byte count and hash.
- `tools/verify-manifest.mjs` fails if the bundle on disk stops matching.
- `tools/verify-before-publish.mjs` is the pre-publish gate, rebuilt from the
  protocol's spec (build rank = `major*1e6 + minor*1e3 + patch`, floor 0.14.0).
- `.github/workflows/verify.yml` runs all of it on every push, including a
  negative test.

## 2. Repository, branch, commit

`clarkshores/sunstone-legacy`. `main` now exists (docs commit `0fb8adf`) so
pull requests have a base. This work is on `claude/wizardly-brown-fj78du`.

## 3. Checks performed — actual results

- `sha256sum` of the recovered file: **matches** the canonical hash exactly.
  Byte count **212705**, matching the protocol. Build id greps as
  `ea = "0.14.0-artifact"`.
- `node tools/verify-manifest.mjs` → all three checks ok, **rc 0**.
- `node tools/verify-before-publish.mjs artifact/sunstone-v0.14.CANONICAL.html`
  → "byte-identical to the canonical build", **rc 0**.
- Gate negative tests, run locally and wired into CI:
  - synthetic `0.7.0-artifact` build → **BLOCKED, rc 1**
  - file with no build id → **BLOCKED, rc 1**
  - synthetic `0.15.0-artifact` build → cleared, rc 0, with a warning that the
    manifest needs re-pinning
- **Not run:** the three Playwright suites. They are in Clark's handoff folder,
  not in this repository and not in the Drive mirror. The 29/29, 6/6 and 33/36
  figures remain cited from the 16 Sep run, not re-measured.
- **Not done:** the artifact URL was read, never republished. The protocol's
  rule is intact.

## 4. Blockers / risks / required configuration

- **The three test suites are still missing.** Without them the release gate in
  plan revision 2 cannot actually be run — four of its eight rows are unverifiable
  today. This is now the top blocker, replacing the lost artifact.
- Clark's handoff folder (suites, manifest, per-round patch scripts, prettified
  source, diff, avatar art generators) has never been committed anywhere.
- Supabase keys, the device run and the privacy policy URL are unchanged and
  still on the critical path.

## 5. Next action for Zero

1. **Get Clark's v0.14 handoff folder into this repo** — specifically
   `test_v0.13.mjs`, `test_build_guard.mjs` and `test_v0.12.mjs`. The release
   gate is unenforceable until those three files exist here.
2. Push the v0.7 TypeScript tree from the Drive mirror to preserve it, clearly
   marked as stale and off the critical path.
3. Supabase project + keys, so the telemetry gate (Improvement 3) can be closed.
