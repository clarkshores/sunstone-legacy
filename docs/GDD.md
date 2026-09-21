# Sunstone Legacy — Game Design Document (v0.1)

Working title. Single-player, portrait, tap-to-move JRPG in the Dragon Warrior / early Final Fantasy tradition. Target: iOS App Store, free, no monetization in v1.

> **Status note (21 Sep 2026):** this document describes v0.1 content. The
> shipping build is v0.14 and has since added Chapter 2 (mountain pass, second
> dungeon, Ember Drake), fog of war, suspend/resume, a paper-doll equipment
> screen, themes, a secret passage and revised encounter pacing. See
> `docs/port/PORT_PLAN_v0.7_to_v0.14.md` for the subsystem-by-subsystem delta
> and `docs/PLAN-30-DAY.md` for the current scope of v1.0.

## Pillars

1. **One thumb.** Everything is a tap: tap a tile to walk, tap a person to talk, tap yourself for the pack. No virtual D-pad.
2. **Short sessions, long arc.** Inn-to-inn loops of 5–10 minutes; a 2–3 hour Chapter 1 arc.
3. **Numbers you can feel.** Classic visible stats, level-ups that matter, gear that changes the next fight.
4. **Learn from every run.** Every meaningful action is a telemetry row; balance changes are driven by real play data.

## Premise

The Shadow Lord shattered the Sunstone that lit the Kingdom of Ardent. The King sends a lone hero to recover its shards. Chapter 1 (v0.1): the shard in the Whispering Cave, guarded by Gloomfang. Chapters 2–3 (post-launch): two more shards, the Ember Drake, the Shadow Lord.

## World (v0.1 content)

| Map | Type | Contents |
|---|---|---|
| Kingdom of Ardent | overworld 36×40 | Ardent (castle town), Millbrook (village), Whispering Cave entrance, 2 chests, 3 encounter zones (meadow / forest / hills) |
| Ardent Castle Town | town | King (quest giver), 2 guards, Armory (herb, warp wing, copper sword, leather armor, wooden shield), Inn 8g, elder, 2 villagers, 1 chest |
| Millbrook | village | General store (herb, potion, ether, wing, iron blade, chain mail, iron shield), Inn 15g, elder (boss hint), farmer, 1 chest |
| Whispering Cave B1 | dungeon | bats / goblins / skeletons, 3 chests, stairs down |
| Whispering Cave B2 | dungeon | skeletons / wisps, 3 chests, **Gloomfang** boss, Sunstone Shard |

Map data lives in `src/data/maps.ts` as ASCII grids with a legend, portals, NPCs, chests and encounter zones. Adding a map is adding an entry.

## Systems

**Movement.** BFS pathfinding over the tile grid; tapping an NPC/chest paths to the nearest adjacent tile then interacts. 140 ms per tile. Four-step encounter grace after any map change or battle.

**Encounters.** Per-step chance (overworld 9%, cave 11–12%). Weighted tables per zone (`src/data/monsters.ts`). Groups of 1–2 enemies.

**Battle.** Turn order = AGI × random(0.6–1.4). Commands: Fight, Spell, Item, Run. Damage = (ATK − DEF/2) × random(0.8–1.2), min 1; 1/12 hero crit (×1.6, ignores DEF); 4–6% miss. Monster specials (Lunge, Club Smash, Shadow Bite) hit for ×1.5–1.8. Run chance = 0.55 + (heroAGI − enemyAGI)×0.04, clamped 25–92%; bosses block running. Wisps resist magic 50%.

**Death.** Return to the last inn with full HP/MP and half gold (Dragon Warrior rule). Auto-saves.

**Progression.** XP to reach level L = 8·(L−1)^2.15 + 6·(L−1). Level 15 ≈ 4,000 XP. Per level: +5–25 HP, +MP from level 3, +1–2 STR, +1–2 AGI, full heal. Spells: Heal (3), Spark (5), Blaze (9), Mend (12). Boss is tuned for level 10–12 with Iron Blade + Chain Mail.

**Economy.** Enemy gold 3–30 per fight, chests 40–200. Full Millbrook kit (iron + chain + iron shield) ≈ 1,330 g ≈ 60–80 fights, i.e. the natural grind to boss level.

**Saving.** One slot. Manual save from the pack menu, auto-save at inns, after the boss, and on death. Capacitor Preferences on device, localStorage on web. Save schema is versioned (`SAVE_VERSION`) and forward-merged onto defaults.

## Telemetry (the analysis contract)

Every event row: `player_id` (anonymous UUID per install), `session_id`, `seq`, `ts`, `build`, `platform`, `type`, `map`, `level`, `hp`, `gold`, `play_seconds`, `props` (JSON). Queued locally, flushed in batches of 50 every 15 s and on background/pagehide; survives restarts; idempotent on `(session_id, seq)`.

Event types: `session_start`, `session_pause`, `session_resume`, `new_game`, `continue_game`, `map_enter`, `npc_talk`, `quest_started`, `chest_open`, `purchase`, `inn_rest`, `save`, `warp`, `equip`, `item_use`, `spell_cast`, `battle_start`, `battle_end` (result, turns, hp_lost, dmg_dealt, items_used, spells_cast), `level_up`, `player_death` (enemy, group, level, gold_lost), `boss_defeated`, `chapter_complete`, `quit_to_title`.

Supabase views (`supabase/schema.sql`): `sessions`, `death_hotspots`, `battle_balance`, `progress_funnel`. These answer the first questions for v0.2: where do players die, which encounters are too swingy, how far does a session get, how long is Chapter 1 really.

## Art

v0.1 uses procedurally rasterised 16×16 placeholder pixel art (`src/gfx/pixels.ts`). Every sprite is a named texture key; the AI-generated + cleaned pack replaces keys one at a time (drop PNGs in, load them in `BootScene`, keep the same keys) with no gameplay code changes. Target spec for the art pass: 16×16 tiles, 16×16 characters with 4 directions × 2 frames, 32×32 monsters, 48×48 bosses, 4-color-ramp palette per material.

## Out of scope for v1

Party members, status effects, side quests, sound design beyond a basic SFX set, Game Center, IAP, cloud save, localisation.
