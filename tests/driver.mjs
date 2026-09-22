// Shared driving helpers for the Sunstone Legacy playthrough.
import { chromium } from 'playwright';
import { serve } from './harness.mjs';

const SHELL = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

export async function boot({ log = () => {} } = {}) {
  const server = await serve();
  const browser = await chromium.launch({ executablePath: SHELL });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });

  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__rpg?.game, null, { timeout: 30000 });

  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const wait = (ms) => page.waitForTimeout(ms);

  const api = {
    page, errors, log,
    canonicalSha: server.sha,
    ev, wait,
    scene: () => ev(() => window.__rpg.scene ?? null),
    menu: () => ev(() => window.__rpg.menuOptions()),
    msg: () => ev(() => window.__rpg.messageText()),
    pos: () => ev(() => window.__rpg.pos?.() ?? null),
    mapId: () => ev(() => window.__rpg.world?.map?.id ?? null),
    state: () => ev(() => {
      const d = window.__rpg.state();
      return { name: d.name, level: d.level, hp: d.hp, maxHp: d.maxHp, mp: d.mp, maxMp: d.maxMp,
               gold: d.gold, xp: d.xp, flags: { ...d.flags }, inv: d.inventory ?? d.items ?? null,
               equip: { ...d.equipment } };
    }),
    pick: (label) => ev((l) => window.__rpg.pick(l), label),
    cancel: () => ev(() => window.__rpg.cancel()),
    advance: () => ev(() => window.__rpg.advance()),
    tap: (id) => ev((i) => window.__rpg.tapEntity(i), id),
    walkTo: (x, y) => ev(([a, b]) => window.__rpg.walkTo(a, b), [x, y]),
    entities: () => ev(() => window.__rpg.world?.entities?.map((e) => e.def.id) ?? []),
    telemetryTypes: () => ev(() => {
      const raw = window.__rpg.telemetry?.dump?.();
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.events) ? raw.events : [];
      return [...new Set(rows.map((e) => e?.type).filter(Boolean))].sort();
    }),
    close: async () => { await browser.close(); await server.close(); },
  };
  return api;
}

// Advance dialogue until nothing is waiting.
export async function drain(g, max = 80) {
  let n = 0;
  for (let i = 0; i < max; i++) {
    if (!(await g.advance())) break;
    n++;
    await g.wait(120);
  }
  await g.wait(200);
  return n;
}

// Fight the current battle to its end. Returns a short result string.
//
// Spell priority matters for the bosses: the Highmoor elder's hint says the
// Ember Drake's fire ignores armor ("keep Mend ready and never let your HP
// fall under half") and that Blaze is what cracks golems open. So: heal first
// when hurt, then nuke, then swing.
const COMMANDS = /^(fight|spell|item|run|auto|defend)\b/i;

// Spark, Blaze and Lull prompt for a target after they are chosen. Fight does
// not — v0.13 made it commit against the first living enemy — so a loop that
// only knows the command verbs sees the target list as an unrecognised menu
// and stalls. Pick the first target.
async function chooseTargetIfPrompted(g, why) {
  await g.wait(260);
  const m = await g.menu();
  if (!m || !m.length) return false;
  if (m.some((o) => COMMANDS.test(o))) return false;
  await g.pick(m[0].split(/\s+/)[0]);
  await g.wait(320);
  return true;
}

export async function fightBattle(g, { maxRounds = 200, onStuck = () => {} } = {}) {
  let unknown = 0;
  for (let r = 0; r < maxRounds; r++) {
    if ((await g.scene()) !== 'Battle') return 'ended';
    if (await g.advance()) { await g.wait(80); continue; }

    const menu = await g.menu();
    if (!menu) { await g.wait(150); continue; }

    const st = await g.state();
    const frac = st.hp / st.maxHp;

    // Heal: Mend (110) if badly hurt and affordable, else Heal (35), else item.
    if (frac <= 0.5 && menu.some((o) => /^spell/i.test(o))) {
      if (await g.pick('Spell')) {
        await g.wait(260);
        const spells = (await g.menu()) ?? [];
        const mend = spells.find((o) => /^mend/i.test(o));
        const heal = spells.find((o) => /^heal/i.test(o));
        const want = (frac <= 0.35 && mend) ? mend : (heal ?? mend);
        if (want) {
          await g.pick(want.split(' ')[0]);
          await chooseTargetIfPrompted(g, 'heal');
          await g.wait(320);
          continue;
        }
        await g.cancel(); await g.wait(200);
      }
    }
    if (frac <= 0.45 && menu.some((o) => /^item/i.test(o))) {
      if (await g.pick('Item')) {
        await g.wait(260);
        const items = (await g.menu()) ?? [];
        const healer = items.find((o) => /potion/i.test(o)) ?? items.find((o) => /herb/i.test(o));
        if (healer) {
          await g.pick(healer.split(' ')[0]);
          await chooseTargetIfPrompted(g, 'item');
          await g.wait(320);
          continue;
        }
        await g.cancel(); await g.wait(200);
      }
    }

    // Offence: Blaze when it is available and worth the MP.
    if (st.mp >= 7 && menu.some((o) => /^spell/i.test(o))) {
      if (await g.pick('Spell')) {
        await g.wait(260);
        const spells = (await g.menu()) ?? [];
        const blaze = spells.find((o) => /^blaze/i.test(o));
        if (blaze) {
          await g.pick('Blaze');
          await chooseTargetIfPrompted(g, 'blaze');
          await g.wait(320);
          continue;
        }
        await g.cancel(); await g.wait(200);
      }
    }

    if (menu.some((o) => /^fight/i.test(o))) { await g.pick('Fight'); await g.wait(280); continue; }
    if (menu.some((o) => /^run/i.test(o))) { await g.pick('Run'); await g.wait(280); continue; }

    // An unrecognised menu is almost always a target or confirm prompt. Take
    // the first entry rather than waiting for a command that will never come.
    if (++unknown <= 40) {
      onStuck(menu);
      await g.pick(menu[0].split(/\s+/)[0]);
      await g.wait(300);
      continue;
    }
    await g.wait(180);
  }
  return 'maxRounds';
}

// The portal graph, read out of the bundle's own map definitions.
export const PORTALS = {
  ardent: { overworld: [12, 20] },
  overworld: { ardent: [10, 9], cave1: [32, 9], millbrook: [15, 26], north: [12, 1] },
  millbrook: { overworld: [9, 15] },
  cave1: { overworld: [1, 1], cave2: [22, 18] },
  cave2: { cave1: [1, 1] },
  north: { overworld: [24, 26], highmoor: [22, 8], peak1: [30, 1] },
  highmoor: { north: [11, 15] },
  peak1: { north: [1, 1], peak2: [22, 18] },
  peak2: { peak1: [1, 1] },
};

function routeBetween(from, to) {
  const seen = new Set([from]);
  const queue = [[from, []]];
  while (queue.length) {
    const [at, path] = queue.shift();
    if (at === to) return path;
    for (const next of Object.keys(PORTALS[at] ?? {})) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([next, [...path, [at, next]]]);
    }
  }
  return null;
}

// Travel to another map, taking portals in order and fighting what interrupts.
export async function travelTo(g, target, { log = () => {} } = {}) {
  for (let hop = 0; hop < 12; hop++) {
    const here = await g.mapId();
    if (here === target) return true;
    const route = routeBetween(here, target);
    if (!route || !route.length) return false;
    const [, next] = route[0];
    const [px, py] = PORTALS[here][next];
    log(`    travel ${here} -> ${next} via (${px},${py})`);
    await goTo(g, px, py);
    await g.wait(1500);
    await drain(g);
    if ((await g.scene()) === 'Battle') { await fightBattle(g); await drain(g); }
  }
  return (await g.mapId()) === target;
}

// Walk to a tile, fighting anything that interrupts. Returns true if arrived.
export async function goTo(g, x, y, { tries = 14, settle = 70 } = {}) {
  for (let t = 0; t < tries; t++) {
    if ((await g.scene()) === 'Battle') { await fightBattle(g); await drain(g); continue; }
    await drain(g, 10);
    const before = await g.pos();
    if (!before) return false;
    if (before.x === x && before.y === y) return true;

    await g.walkTo(x, y);
    // poll until we stop moving, arrive, or a battle starts
    let last = `${before.x},${before.y}`, still = 0;
    for (let i = 0; i < 220; i++) {
      await g.wait(settle);
      if ((await g.scene()) === 'Battle') break;
      const p = await g.pos();
      if (!p) break;
      if (p.x === x && p.y === y) return true;
      const key = `${p.x},${p.y}`;
      still = key === last ? still + 1 : 0;
      last = key;
      if (still >= 6) break;
    }
  }
  return (await g.pos())?.x === x && (await g.pos())?.y === y;
}

// Talk to / interact with an entity by id, then drain dialogue.
export async function interact(g, id) {
  if ((await g.scene()) === 'Battle') { await fightBattle(g); await drain(g); }
  await g.tap(id);
  await g.wait(700);
  const seen = [];
  for (let i = 0; i < 60; i++) {
    const m = await g.msg();
    if (m) seen.push(m);
    if (await g.advance()) { await g.wait(140); continue; }
    break;
  }
  await g.wait(250);
  return seen;
}
