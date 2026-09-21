# App Store Listing — Sunstone Legacy (draft v0.2)

> **Status note (21 Sep 2026):** written against v0.2. Two items are now stale
> and are tracked in `docs/PLAN-30-DAY.md`: the screenshots predate the v0.14
> UI (paper-doll equipment screen, fog of war, themes), and the *What's New*
> text says Chapter 1 where v1.0 now ships Chapters 1–2. The App Privacy
> answers must also be re-read against the shipping build's grown event set
> before the App Store Connect form is opened.

**Name (30):** Sunstone Legacy
**Subtitle (30):** Retro RPG, one-thumb play
**Category:** Games › Role Playing (secondary: Adventure)
**Price:** Free. No ads, no in-app purchases in v1.
**Age rating:** 9+ (infrequent/mild cartoon or fantasy violence)

## Promotional text (170)
A classic 8-bit style RPG built for the phone: tap to walk, tap to fight, save anywhere. Recover the shattered Sunstone before the kingdom's last dawn fails.

## Description
The Shadow Lord shattered the Sunstone that lit the Kingdom of Ardent. The King has one hero left to send. You.

Sunstone Legacy is a single-player role-playing game in the spirit of the 8-bit classics, rebuilt for one-handed play. There is no virtual D-pad: tap where you want to go and your hero walks there. Tap a villager to talk, a chest to open it, an enemy to strike it.

• Turn-based battles with criticals, spells, and monsters that fight dirty
• Level up, learn Heal, Spark, Blaze and Mend, and gear up in town armories
• A hand-built overworld with towns, caves, and secrets off the road
• Short sessions: rest at an inn to save, pick up where you left off
• Adjustable text speed, sound on/off, and a privacy toggle for anonymous play data
• Free, with no ads and no purchases

Chapter 1 takes you from the castle hall to the Whispering Cave and the beast that guards the first shard. More chapters arrive in free updates.

## Keywords (100 chars)
rpg,retro,pixel,turn based,jrpg,fantasy,dragon,quest,adventure,offline,classic,8-bit,single player

## What's New (v1.0)
First release: Chapter 1 — the Whispering Cave.

## App Privacy answers
- Data collected: **Identifiers** (an anonymous per-install ID) and **Usage Data** (gameplay events). Used for **Analytics**. **Not linked** to the user's identity. **Not used for tracking.**
- Users can turn collection off in Settings › Share play data.
- Privacy policy URL: required — a one-page policy stating the above (host on GitHub Pages or clarkshores.com).

## Assets in `store/`
- `icon-1024.png` — App Store icon (no alpha, no rounded corners; Apple masks it).
- `screenshot-6.7in-1..6.png` — 1290×2796, iPhone 6.7" set with caption bands. Apple also accepts these for 6.5"; add a 6.1" set (1179×2556 or 1170×2532) by rerunning `scripts/dbg/shots.mjs store/raw 390 844 3`.
- Suggested order in App Store Connect: 1 town, 2 battle, 3 overworld, 4 boss, 5 shop, 6 title.

## Launch checklist (marketing)
1. 30-second preview video: title → walk into town → battle with damage numbers → boss intro → "Free, no ads".
2. Landing page with the six screenshots + App Store badge + privacy policy.
3. Post to r/jrpg, r/iosgaming, r/pixelart (dev-log style, not ad copy); TouchArcade forums "upcoming" thread.
4. Ask 10 TestFlight testers for day-one reviews.
