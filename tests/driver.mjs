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
export async function fightBattle(g, { maxRounds = 120 } = {}) {
  for (let r = 0; r < maxRounds; r++) {
    if ((await g.scene()) !== 'Battle') return 'ended';
    if (await g.advance()) { await g.wait(90); continue; }

    const menu = await g.menu();
    if (!menu) { await g.wait(180); continue; }

    const st = await g.state();
    const low = st.hp <= st.maxHp * 0.35;

    if (low && menu.some((o) => /^item/i.test(o))) {
      if (await g.pick('Item')) {
        await g.wait(300);
        const items = (await g.menu()) ?? [];
        const healer = items.find((o) => /herb|potion/i.test(o));
        if (healer) { await g.pick(healer.split(' ')[0]); await g.wait(500); continue; }
        await g.cancel(); await g.wait(250);
      }
    }
    if (menu.some((o) => /^fight/i.test(o))) { await g.pick('Fight'); await g.wait(320); continue; }
    if (menu.some((o) => /^run/i.test(o))) { await g.pick('Run'); await g.wait(320); continue; }
    await g.wait(200);
  }
  return 'maxRounds';
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
