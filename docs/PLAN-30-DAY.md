# Plan to the App Store — revision 2 (21 Sep 2026)

Supersedes the 14 Sep plan, which is preserved verbatim at the bottom of this
file. Start was Mon 14 Sep 2026; today is day 8.

## Where the project actually is

The original plan and reality have diverged, and the divergence is the reason
for this revision:

- **Ahead on content and hardening.** The shipping build is **v0.14.0**, not the
  v0.1 the plan assumed. Chapter 2 (mountain pass, second dungeon, Ember Drake),
  fog of war, suspend/resume, a paper-doll equipment screen, themes, world-map
  labels, a secret passage, encounter pacing, one-click battle rounds and a
  build-regression guard all exist and are verified by 35 browser tests plus a
  publish gate (`docs/port/BASELINE_v0.14_VERIFICATION.md`).
- **Behind on the things the plan called prerequisites.** The GitHub repo was
  empty until today — prerequisite 3 was never done. Supabase keys are still
  unset (`ta` / `xt` undefined in source). No build has run on a real iPhone.
  No TestFlight.
- **Split in two.** The verified artifact is a compiled single-file bundle. The
  TypeScript source is at **v0.7** and cannot reproduce it. Seven rounds of
  changes exist only in the bundle.

The plan's day-26 submission target (Fri 9 Oct) is not reachable while the
critical path runs through a hand port that nobody has started and that, by its
own port plan, cannot be mechanically derived for rounds 0.8–0.11.

## The four improvements to the end goal

### 1. The canonical bundle becomes the build artifact; the port leaves the critical path

**Was:** the TypeScript source is the source of truth; ship what it compiles.

**Now:** `sunstone-v0.14.CANONICAL.html`
(sha256 `9d97eaa78dc5af183f5aa0cb66a07cf0ace5e06f5a8740d1c001a70343fdc15a`)
is the build artifact. Capacitor wraps it as `www/index.html` and ships it. The
repository's job for v1.0 is packaging, signing, verification and release, not
compiling.

**Why:** `docs/port/README_UPLOAD_HERE.md` put this decision to Zero and it was
never made; the port has been the unowned blocker since 16 Sep. The bundle is
verified by 35 tests and a publish gate. A hand port is unverified until it is
rebuilt and retested, and rounds 0.8–0.11 have no v0.7 baseline to diff
against, so they need function-by-function reading of minified output. That is
open-ended work sitting directly in front of a fixed ship date.

**Cost, stated plainly:** the TypeScript source goes stale at v0.7. That is a
real debt, not a free win. It is paid back after launch (see Improvement 4),
when the port can be verified against a shipped, telemetry-instrumented build
instead of racing it.

**Ends this ambiguity:** the port is no longer "in progress". It is scheduled,
post-launch, with an owner.

### 2. Done is a gate, not a date

**Was:** "Day 26: Submit for review."

**Now:** v1.0 submits when this gate passes, and not before. Every line is
mechanically checkable:

| Check | Pass condition |
|---|---|
| Artifact identity | sha256 of the packaged `www/index.html` matches the canonical hash above |
| Publish gate | `node verify-before-publish.mjs <artifact>` → rc 0 |
| Main suite | `test_v0.13.mjs` — 29 passed, 0 failed |
| Build guard | `test_build_guard.mjs` — 6 passed, 0 failed |
| Legacy suite | `test_v0.12.mjs` — **33 of 36**; the only failures are the three retired hold-to-move assertions |
| Device | Clean run on iPhone SE (small) and a Pro Max (safe area, touch, WebAudio unlock) |
| Telemetry | Gate from Improvement 3 |
| Playthrough | End-to-end test from Improvement 4 |

**Note the correction.** `docs/port/PORT_PLAN_v0.7_to_v0.14.md` states the
legacy suite should score 34 of 36 with two tests failing by design. That is
wrong. There are three hold-to-move assertions, not two, and the correct
acceptance number is **33 of 36** — established by the pre-port verification run
on 16 Sep. The port plan has not been corrected in place; this table is the
authority. Anyone treating 34/36 as the target will read a passing build as a
regression.

**Why:** a date target with a soft definition of done is how a build ships
broken or slips silently. The dates below still exist as a forecast, but they no
longer have the authority to release anything.

### 3. Privacy and telemetry move from week-3 polish to launch blocker

**Was:** week 3, "Settings: … Privacy: telemetry disclosure + opt-out toggle
(required for App Privacy answers)."

**Now:** a release-gate item, and it must be true in this order:

1. Telemetry ships **disabled by default when no sink is configured**. `ta` and
   `xt` are still undefined in source; a build that silently starts posting the
   moment keys appear is not acceptable.
2. The Settings → *Share play data* toggle is present, defaults to the
   disclosed state, and actually suppresses the queue flush when off — verified
   by test, not by reading the code.
3. The privacy policy URL is live before the App Store Connect form is opened.
4. The App Privacy answers in `docs/STORE-LISTING.md` are re-read against the
   shipping build's actual event set, which has grown since they were written:
   `encounter_gap`, `secret_found`, `boss_defeated`, `optimize_gear`, `drop`,
   `level_up`, `quest_started`, `chapter_complete`, `map_open`, `journal_open`,
   `warp`, `build_regression`.

**Why:** these answers are a declaration to Apple, and every one of them is
currently a claim about code that has never been exercised against a live
Supabase project. Rejections on privacy answers are same-day-fixable only when
the fix is wording; they are not when the fix is behavior. This is the one item
where being wrong costs a review cycle inside the buffer.

### 4. v1.0 ships Chapters 1–2. Chapter 3 becomes the 1.1 update

**Was:** week 3, "Chapter 3: Shadow Lord's keep, final boss, ending sequence,
credits" — with the content freeze one week later.

**Now:** v1.0 is Chapters 1 and 2, ending on the Ember Drake, with the Shadow
Lord explicitly set up as the next free update. Chapter 3 is 1.1.

**Why:** the GDD already scoped chapters 2–3 as post-launch; the 30-day plan
contradicted it and nobody reconciled the two. Chapters 1–2 are roughly the
2–3 hour target the pillars ask for, which was the actual reason Chapter 3 was
on the list. Against that, **no test covers a full playthrough, and Chapter 2
past the Ember Drake is unverified end to end** — so the honest position is that
the content we have is not yet proven, let alone content we have not written.
Adding a third chapter in the last full week, on top of an unfinished port and
an unrun device build, is the scope creep the original plan's own risk section
warned about.

**What replaces it in the schedule:** the missing end-to-end playthrough test —
a bot run from new game through the Ember Drake, asserting the chapter-complete
event — which becomes a gate item in Improvement 2. The store listing's "More
chapters arrive in free updates" line already sets this expectation; the
*What's New* text needs updating from "Chapter 1" to "Chapters 1–2".

## Revised schedule (forecast, not authority)

| Days | Work |
|---|---|
| 8–10 (21–23 Sep) | Package the canonical bundle under Capacitor. Repo carries the packaging pipeline, the gate script and the suites. Device run on iPhone SE + Pro Max. |
| 11–13 (24–26 Sep) | Supabase project live; schema applied; telemetry gate (Improvement 3) closed and tested against real inserts. Privacy policy page published. |
| 14–16 (27–29 Sep) | End-to-end playthrough test. Balance pass from the first real telemetry. Store assets refreshed against the v0.14 UI — the existing screenshots predate the paper-doll equipment screen, fog of war and the themes. |
| 17–20 (30 Sep–3 Oct) | TestFlight to 5–10 testers. Fix feedback. Content freeze. |
| 21–23 (4–6 Oct) | Release gate run in full. Submit when it passes. |
| 24–30 | Apple review buffer. |
| Post-launch | v0.8–v0.14 port into TypeScript, verified against the shipped artifact. Then Chapter 3 as 1.1. |

## Prerequisites Clark owns

1. Apple Developer account (have) and a Mac with Xcode (have).
2. Supabase account (free tier) — still not done, now on the critical path.
3. ~~GitHub repo~~ — created; source push still outstanding.
4. Final app name and bundle id (`com.clarkshores.sunstone` is the placeholder).
5. Privacy policy hosting (GitHub Pages or clarkshores.com).

## Risks, revised

- **The port debt.** Accepted deliberately, not overlooked. If the bundle ever
  needs a change that cannot be made by patching it, the port becomes urgent
  with no schedule. Mitigation: the canonical hash, the publish gate and the
  build-regression guard make an unverified bundle impossible to ship by
  accident.
- **Device-unverified WebAudio and safe area.** Implemented to the standard
  patterns, never run on hardware. First item in the revised schedule.
- **Store assets are stale.** They show the v0.2 UI.
- **Telemetry has never inserted a real row.** The whole analysis contract is
  untested end to end.
- **Art consistency** and **review time** — unchanged from revision 1.

---

# Original plan, 14 Sep 2026 (superseded, kept for the record)

## 30-Day Plan to the App Store

Start: Mon 14 Sep 2026. Submission target: Fri 9 Oct (day 26). Apple review buffer: days 27–30.

### Week 1 (14–20 Sep) — Foundation is real on a phone

- [x] Day 1: Playable vertical slice (this build). Bot playthrough tests green.
- [ ] Day 2: Clark runs `npm run cap:add:ios`, opens Xcode, runs on a real iPhone. Fix safe-area, touch, and scale issues found on device.
- [ ] Day 2: Supabase project created; `supabase/schema.sql` applied; keys in `.env`. First real events land in the `events` table.
- [ ] Day 3–4: Content pass 1 — Chapter 2: second region (mountain pass), third town, second dungeon, Ember Drake. Doubles playtime toward the 2–3 h target.
- [ ] Day 5–6: Sound — 8-bit SFX set (menu, hit, crit, level up, encounter sting) and 4 loop tracks (town, overworld, cave, battle). CC0/licensed packs.
- [ ] Day 7: Play data review #1 — Claude reads Supabase, proposes balance patch.

### Week 2 (21–27 Sep) — Art and feel

- [ ] Art pipeline: generate tiles/characters/monsters, clean up in Aseprite, drop into `assets/`; swap texture keys in `BootScene`. Hero walk animation (2 frames × 4 dirs).
- [ ] Battle polish: attack animations, damage numbers, screen transitions, enemy idle bob variety.
- [ ] Status effects (Sleep, Poison) and 2 more spells if data shows fights are monotonous.
- [ ] App icon (1024²), launch screen, portrait lock, haptics on hit (Capacitor Haptics).
- [ ] Play data review #2.

### Week 3 (28 Sep–4 Oct) — Content complete, release candidate

- [ ] Chapter 3: Shadow Lord's keep, final boss, ending sequence, credits.
- [ ] Full balance pass from telemetry (death hotspots, flee rates, gold curve).
- [ ] Onboarding: first 90 seconds tutorial via elder dialogue + tap hints.
- [ ] Settings: text speed, SFX/music volume, delete save. Privacy: telemetry disclosure + opt-out toggle (required for App Privacy answers).
- [ ] TestFlight build to 5–10 external testers. Crash-free on iPhone SE (small screen) and Pro Max.

### Week 4 (5–11 Oct) — Ship

- [ ] Day 22–24: Fix TestFlight feedback. Freeze content.
- [ ] Day 25: Store listing — screenshots (6.7" and 6.1"), 30 s preview video, description, keywords, age rating (likely 9+, cartoon violence), App Privacy (analytics: identifiers not linked to user).
- [ ] Day 26: Submit for review.
- [ ] Day 27–30: Review buffer. If rejected, typical causes are 4.2 minimum functionality (not a risk with a full game) or privacy answers; respond same day.

### Prerequisites Clark owns

1. Apple Developer account (have) and a Mac with Xcode (have).
2. Supabase account (free tier) — 10 minutes.
3. GitHub repo — create `sunstone-legacy` and push the initial commit (see HANDOFF).
4. Decide the final app name and bundle id (`com.clarkshores.sunstone` is the placeholder).

### Risks

- **Art consistency** (AI-generated). Mitigation: one palette, one cleanup pass, strict sprite spec in GDD; keep placeholders as fallback.
- **Review time.** Mitigation: submit day 26, not day 30; TestFlight first.
- **Scope creep.** Chapters 2–3 are the only content additions; everything else is polish.
