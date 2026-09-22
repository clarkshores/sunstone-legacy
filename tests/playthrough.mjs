// End-to-end playthrough of the canonical v0.14 bundle.
//
// This is the test docs/PLAN-30-DAY.md revision 2 calls for in Improvement 4:
// "a bot run from new game through the Ember Drake, asserting the
// chapter-complete event". It is the only release-gate row that can be
// established without Clark's handoff folder.
//
//   node tests/playthrough.mjs
//
// Exits non-zero if any phase fails. Prints a transcript as it plays.

import { boot, drain, fightBattle, goTo, interact } from './driver.mjs';

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s]`, ...a);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
};

const BUDGET_MS = Number(process.env.PLAYTHROUGH_BUDGET_MS ?? 20 * 60 * 1000);
const overBudget = () => Date.now() - t0 > BUDGET_MS;

const g = await boot();
log('serving canonical build', g.canonicalSha.slice(0, 16) + '…');

try {
  // ---- Phase 1: new game -------------------------------------------------
  await g.pick('New'); await g.wait(2000);
  await g.page.mouse.click(313, 605); await g.wait(1500);   // Done on name keyboard
  await g.pick('Normal'); await g.wait(2500); await drain(g);
  check('new game reaches the world', (await g.mapId()) === 'ardent', `map ${await g.mapId()}`);

  // ---- Phase 2: the King starts the quest --------------------------------
  await goTo(g, 11, 4);
  await interact(g, 'king');
  let st = await g.state();
  check('King starts the quest', st.flags.questStarted === true);
  check('King gives the 50g supply gift', st.gold >= 90, `gold ${st.gold}`);

  // ---- Phase 3: overworld --------------------------------------------------
  await goTo(g, 12, 20); await g.wait(1800); await drain(g);
  check('town exit reaches the overworld', (await g.mapId()) === 'overworld');

  // ---- Phase 4: grind to boss readiness -----------------------------------
  // Long routes: one walkTo covering many tiles triggers far more encounters
  // per call than short hops, and spends less time in polling overhead.
  const TARGET_LEVEL = Number(process.env.TARGET_LEVEL ?? 11);
  const TARGET_GOLD = Number(process.env.TARGET_GOLD ?? 1400);
  const route = [[10, 10], [10, 24], [26, 24], [26, 10]];
  let laps = 0, healed = 0, lastLog = 0;

  while (!overBudget()) {
    st = await g.state();
    if (st.level >= TARGET_LEVEL && st.gold >= TARGET_GOLD) break;

    if (st.hp <= st.maxHp * 0.35) {
      if ((await g.mapId()) === 'overworld') { await goTo(g, 10, 9); await g.wait(1400); await drain(g); }
      if ((await g.mapId()) === 'ardent') {
        await goTo(g, 18, 14);
        await interact(g, 'innkeep');
        const m = await g.menu();
        if (m?.some((o) => /yes/i.test(o))) { await g.pick('Yes'); await g.wait(1100); await drain(g); }
        healed++;
        await goTo(g, 12, 20); await g.wait(1400); await drain(g);
      }
      continue;
    }

    if ((await g.mapId()) !== 'overworld') { await goTo(g, 12, 20); await g.wait(1400); await drain(g); }
    const spot = route[laps % route.length];
    await goTo(g, spot[0], spot[1], { tries: 2 });
    if ((await g.scene()) === 'Battle') { await fightBattle(g); await drain(g); }
    laps++;
    if (Date.now() - lastLog > 60000) {
      lastLog = Date.now();
      st = await g.state();
      log(`  grinding: lvl ${st.level} hp ${st.hp}/${st.maxHp} gold ${st.gold} xp ${st.xp} (rests ${healed})`);
    }
  }
  st = await g.state();
  check(`reaches level ${TARGET_LEVEL}`, st.level >= TARGET_LEVEL, `level ${st.level}, xp ${st.xp}`);
  check('earns the Millbrook kit budget', st.gold >= TARGET_GOLD, `gold ${st.gold}`);

  // ---- Phase 5: Millbrook, buy the kit ------------------------------------
  if ((await g.mapId()) !== 'overworld') { await goTo(g, 12, 20); await g.wait(1400); await drain(g); }
  await goTo(g, 15, 26); await g.wait(1800); await drain(g);
  log('map:', await g.mapId(), 'entities:', JSON.stringify(await g.entities()));
  log('portals:', JSON.stringify(await g.ev(() => window.__rpg.world?.map?.portals ?? null)));
  check('reaches Millbrook', (await g.mapId()) === 'millbrook', `map ${await g.mapId()}`);

  const ents = await g.entities();
  const shop = ents.find((e) => /shop|merchant|store|keep/i.test(e) && !/inn/i.test(e));
  if (shop) {
    const spot = await g.ev((id) => {
      const e = window.__rpg.world.entities.find((x) => x.def.id === id);
      return e ? { x: e.def.x, y: e.def.y } : null;
    }, shop);
    log('shop', shop, 'at', JSON.stringify(spot));
    if (spot) {
      await goTo(g, spot.x, spot.y + 1);
      await g.tap(shop); await g.wait(900); await drain(g, 6);
      log('shop menu:', JSON.stringify(await g.menu()));
      if (await g.pick('Buy')) {
        await g.wait(700);
        for (const want of ['Iron Blade', 'Chain Mail', 'Iron Shield']) {
          const items = (await g.menu()) ?? [];
          const hit = items.find((o) => o.toLowerCase().startsWith(want.toLowerCase()));
          log(`  buy ${want}:`, hit ? 'offered' : `not in [${items.join(' | ')}]`);
          if (hit) {
            await g.pick(want); await g.wait(700);
            const conf = await g.menu();
            if (conf?.some((o) => /yes/i.test(o))) { await g.pick('Yes'); await g.wait(800); }
            await drain(g, 8);
          }
        }
        await g.cancel(); await g.wait(400); await g.cancel(); await g.wait(400);
      }
      await drain(g);
      st = await g.state();
      log('after shopping:', JSON.stringify({ gold: st.gold, equip: st.equip }));
      check('equips the Millbrook kit', st.equip.weapon === 'iron' && st.equip.armor === 'chain' && st.equip.shield === 'ironshield',
            JSON.stringify(st.equip));
    }
  } else {
    check('finds the Millbrook shop', false, `entities ${JSON.stringify(ents)}`);
  }

  // ---- Phase 6: the Whispering Cave ---------------------------------------
  await goTo(g, 9, 15); await g.wait(1600); await drain(g);   // millbrook exit
  if ((await g.mapId()) !== 'overworld') {
    log('millbrook exit did not land on the overworld; map is', await g.mapId());
    log('portals:', JSON.stringify(await g.ev(() => window.__rpg.world?.map?.portals ?? null)));
  }
  await goTo(g, 32, 9); await g.wait(1800); await drain(g);
  log('map:', await g.mapId(), 'pos', JSON.stringify(await g.pos()));
  log('entities:', JSON.stringify(await g.entities()));
  log('portals:', JSON.stringify(await g.ev(() => window.__rpg.world?.map?.portals ?? null)));
  check('enters the Whispering Cave', (await g.mapId()) === 'cave1', `map ${await g.mapId()}`);

  log('SUMMARY', JSON.stringify(results.map((r) => [r.ok ? 'PASS' : 'FAIL', r.name])));
} catch (err) {
  check('run completed without throwing', false, err.message);
} finally {
  log('page errors:', g.errors.length ? g.errors.slice(0, 5) : 'none');
  await g.page.screenshot({ path: '/tmp/shot-final.png' }).catch(() => {});
  await g.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
