// End-to-end playthrough of the canonical v0.14 bundle: Chapter 1 and the
// Ember Drake.
//
// This is the test docs/PLAN-30-DAY.md revision 2 calls for in Improvement 4 —
// "a bot run from new game through the Ember Drake, asserting the
// chapter-complete event" — and the gap docs/port/ records as
// "Chapter 2 past the Ember Drake is unverified end to end".
//
//   npm run playthrough
//
// Exits non-zero if any phase fails. Prints a transcript as it plays.

import { boot, drain, fightBattle, goTo, interact, travelTo } from './driver.mjs';

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s]`, ...a);
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  return ok;
};

const BUDGET_MS = Number(process.env.PLAYTHROUGH_BUDGET_MS ?? 75 * 60 * 1000);
const overBudget = () => Date.now() - t0 > BUDGET_MS;

const INNS = {
  ardent: { id: 'innkeep', at: [18, 14] },
  millbrook: { id: 'mb_inn', at: [15, 4] },
  highmoor: { id: 'hm_inn', at: [16, 4] },
};
const SHOPS = {
  millbrook: { id: 'mb_shop', at: [5, 4] },
  highmoor: { id: 'hm_shop', at: [4, 4] },
};

const g = await boot();
log('serving canonical build', g.canonicalSha.slice(0, 16) + '…');

async function rest(where) {
  if (!(await travelTo(g, where, { log }))) return false;
  const inn = INNS[where];
  await goTo(g, inn.at[0], inn.at[1]);
  await interact(g, inn.id);
  const m = await g.menu();
  if (m?.some((o) => /yes/i.test(o))) { await g.pick('Yes'); await g.wait(1100); await drain(g); return true; }
  await g.cancel();
  return false;
}

async function buy(where, wants) {
  if (!(await travelTo(g, where, { log }))) return [];
  const shop = SHOPS[where];
  await goTo(g, shop.at[0], shop.at[1]);
  await interact(g, shop.id);
  const bought = [];
  if (!(await g.pick('Buy'))) return bought;
  await g.wait(600);
  for (const want of wants) {
    const items = (await g.menu()) ?? [];
    const hit = items.find((o) => o.toLowerCase().startsWith(want.toLowerCase()));
    if (!hit) { log(`    ${want}: not offered`); continue; }
    if (/✕/.test(hit)) { log(`    ${want}: unaffordable`); continue; }
    await g.pick(want); await g.wait(600);
    const conf = await g.menu();
    if (conf?.some((o) => /yes/i.test(o))) { await g.pick('Yes'); await g.wait(700); }
    await drain(g, 10);
    bought.push(want);
    log(`    bought ${want}`);
  }
  await g.cancel(); await g.wait(300);
  await g.cancel(); await g.wait(300);
  await drain(g);
  return bought;
}

// Grind on whichever map we are standing on, resting when hurt.
async function grind({ level, gold, where, route, restAt, label }) {
  let laps = 0, rests = 0, lastLog = 0;
  // Stall guard: a grind that stops earning is a harness bug, not slow luck.
  // Fail fast and say so rather than spending the whole budget spinning.
  let mark = { xp: -1, gold: -1, at: Date.now() };
  const STALL_MS = 240000;

  while (!overBudget()) {
    const st = await g.state();
    if (st.level >= level && st.gold >= gold) break;

    if (st.xp !== mark.xp || st.gold !== mark.gold) {
      mark = { xp: st.xp, gold: st.gold, at: Date.now() };
    } else if (Date.now() - mark.at > STALL_MS) {
      const menu = await g.menu();
      throw new Error(
        `${label} stalled: no xp or gold for ${Math.round(STALL_MS / 1000)}s at lvl ${st.level} ` +
        `xp ${st.xp} gold ${st.gold}, scene ${await g.scene()}, map ${await g.mapId()}, ` +
        `menu ${JSON.stringify(menu)}`,
      );
    }

    if (st.hp <= st.maxHp * 0.45) {
      if (await rest(restAt)) rests++;
      await travelTo(g, where, { log });
      continue;
    }
    if ((await g.mapId()) !== where) { await travelTo(g, where, { log }); continue; }

    const spot = route[laps % route.length];
    await goTo(g, spot[0], spot[1], { tries: 2 });
    if ((await g.scene()) === 'Battle') {
      const st2 = await g.state();
      await fightBattle(g, {
        debug: st2.level >= 4,
        onStuck: (m) => log(`    unrecognised battle menu: ${JSON.stringify(m)}`)
      });
      await drain(g);
    }
    laps++;
    if (Date.now() - lastLog > 90000) {
      lastLog = Date.now();
      const s2 = await g.state();
      log(`  ${label}: lvl ${s2.level} hp ${s2.hp}/${s2.maxHp} mp ${s2.mp}/${s2.maxMp} gold ${s2.gold} xp ${s2.xp} (rests ${rests})`);
    }
  }
  return g.state();
}

async function fightBoss(g, id, label) {
  await interact(g, id);
  await g.wait(800);
  if ((await g.scene()) !== 'Battle') {
    // the encounter may need one more nudge through dialogue
    await drain(g);
    if ((await g.scene()) !== 'Battle') { await interact(g, id); await g.wait(800); }
  }
  if ((await g.scene()) !== 'Battle') return 'no-battle';
  log(`  ${label}: battle joined`);
  const r = await fightBattle(g);
  await drain(g);
  return r;
}

try {
  // ---- 1. new game -------------------------------------------------------
  await g.pick('New'); await g.wait(2000);
  await g.page.mouse.click(313, 605); await g.wait(1500);
  await g.pick('Normal'); await g.wait(2500); await drain(g);
  check('new game reaches the world', (await g.mapId()) === 'ardent');

  // ---- 2. the King -------------------------------------------------------
  await goTo(g, 11, 4);
  await interact(g, 'king');
  let st = await g.state();
  check('King starts the quest', st.flags.questStarted === true);
  check('King gives the 50g supply gift', st.gold >= 90, `gold ${st.gold}`);

  // ---- 3. grind for the iron kit ----------------------------------------
  await travelTo(g, 'overworld', { log });
  check('town exit reaches the overworld', (await g.mapId()) === 'overworld');

  st = await grind({
    level: Number(process.env.CH1_LEVEL ?? 11), gold: Number(process.env.CH1_GOLD ?? 1500),
    where: 'overworld', route: [[10, 10], [10, 24], [26, 24], [26, 10]],
    restAt: 'ardent', label: 'ch1 grind',
  });
  check('reaches Chapter 1 boss level', st.level >= 10, `level ${st.level}, xp ${st.xp}`);

  // ---- 4. Millbrook: the iron kit ----------------------------------------
  const got = await buy('millbrook', ['Iron Blade', 'Chain Mail', 'Iron Shield', 'Potion', 'Potion', 'Potion']);
  st = await g.state();
  log('after shopping:', JSON.stringify({ gold: st.gold, equip: st.equip }));
  check('buys and equips the iron kit',
    st.equip.weapon === 'iron' && st.equip.armor === 'chain' && st.equip.shield === 'ironshield',
    `${JSON.stringify(st.equip)} (bought ${got.join(', ') || 'nothing'})`);

  // ---- 5. the Whispering Cave and Gloomfang ------------------------------
  await rest('ardent');
  check('reaches the Whispering Cave', await travelTo(g, 'cave2', { log }), `map ${await g.mapId()}`);
  log('cave2 entities:', JSON.stringify(await g.entities()));
  await goTo(g, 20, 16);
  const r1 = await fightBoss(g, 'gloomfang', 'Gloomfang');
  st = await g.state();
  check('defeats Gloomfang', st.flags.bossDefeated === true, `${r1}, lvl ${st.level}, hp ${st.hp}/${st.maxHp}`);

  await goTo(g, 21, 16);
  await interact(g, 'shardpickup');
  st = await g.state();
  check('takes the Sunstone Shard', st.flags.gotShard === true);

  // ---- 6. Chapter 1 complete --------------------------------------------
  await travelTo(g, 'ardent', { log });
  await goTo(g, 11, 4);
  await interact(g, 'king');
  st = await g.state();
  check('CHAPTER 1 COMPLETE', st.flags.chapter1Done === true, `gold ${st.gold}, lvl ${st.level}`);
  log('telemetry:', JSON.stringify(await g.telemetryTypes()));

  // ---- 7. north: grind for the Drake -------------------------------------
  check('reaches the Northlands', await travelTo(g, 'north', { log }), `map ${await g.mapId()}`);
  st = await grind({
    level: Number(process.env.CH2_LEVEL ?? 17), gold: Number(process.env.CH2_GOLD ?? 2600),
    where: 'north', route: [[24, 24], [12, 20], [24, 12], [12, 6]],
    restAt: 'highmoor', label: 'ch2 grind',
  });
  check('reaches Ember Drake level', st.level >= 15, `level ${st.level}, xp ${st.xp}`);

  // ---- 8. Highmoor: upgrade --------------------------------------------
  const got2 = await buy('highmoor', ['Knight Sword', 'Drake Hide', 'Tower Shield', 'Potion', 'Potion', 'Potion', 'Ether', 'Ether']);
  st = await g.state();
  log('after Highmoor:', JSON.stringify({ gold: st.gold, equip: st.equip }));
  log(`  bought: ${got2.join(', ') || 'nothing'}`);

  // ---- 9. Ember Peak and the Drake --------------------------------------
  await rest('highmoor');
  check('reaches Ember Peak', await travelTo(g, 'peak2', { log }), `map ${await g.mapId()}`);
  log('peak2 entities:', JSON.stringify(await g.entities()));
  await goTo(g, 19, 14);
  const r2 = await fightBoss(g, 'drake', 'Ember Drake');
  st = await g.state();
  check('DEFEATS THE EMBER DRAKE', st.flags.drakeDefeated === true, `${r2}, lvl ${st.level}, hp ${st.hp}/${st.maxHp}`);

  await goTo(g, 20, 14);
  await interact(g, 'shard2pickup');
  st = await g.state();
  check('takes the second Sunstone Shard', st.flags.gotShard2 === true);

  // ---- 10. Chapter 2 complete -------------------------------------------
  await travelTo(g, 'ardent', { log });
  await goTo(g, 11, 4);
  await interact(g, 'king');
  st = await g.state();
  check('CHAPTER 2 COMPLETE', st.flags.chapter2Done === true, `gold ${st.gold}, lvl ${st.level}`);
  log('final telemetry:', JSON.stringify(await g.telemetryTypes()));
  log('final state:', JSON.stringify({ level: st.level, hp: st.hp, gold: st.gold, xp: st.xp, flags: st.flags }));
} catch (err) {
  check('run completed without throwing', false, err.message);
} finally {
  log('page errors:', g.errors.length ? g.errors.slice(0, 5) : 'none');
  await g.page.screenshot({ path: '/tmp/shot-final.png' }).catch(() => {});
  await g.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('failed:', failed.map((f) => f.name).join(' | '));
process.exit(failed.length ? 1 : 0);
