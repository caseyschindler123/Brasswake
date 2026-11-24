const { test, expect } = require('@playwright/test');
const { observeErrors } = require('./flow');
const { fixture, submit, next, action } = require('./battle-risk');

test('battle boundaries · paused pursuit cannot refill health through walking or recovery menus', async ({ page }) => {
  const f = await fixture(page, 'warrior', true);
  await action(f, 'flee').click(); await expect(f.locator('#fight')).toBeHidden();
  const result = await f.evaluate(() => {
    Scene.pause(); const s = __bw.S; s.hp = 20; s.meat = 1; s.mv = 4;
    const before = { hp: s.hp, meat: s.meat, tonics: s.tonics, gold: s.gold, mana: s.mana };
    const at = Scene.pos(); __bw.HOST.moved(...at, false, false);
    __bw.ACT.eat({ k: 'meat' }); __bw.ACT.tonic(); __bw.ACT.rest({ c: 1 }); __bw.beginSkillWork('recover');
    return { before, after: { hp: s.hp, meat: s.meat, tonics: s.tonics, gold: s.gold, mana: s.mana }, query: !!__bw.Q };
  });
  expect(result.after).toEqual(result.before); expect(result.query).toBe(false);
});

test('battle boundaries · novice Feint evades hits even when outgoing accuracy is already capped', async ({ page }) => {
  const f = await fixture(page);
  await f.evaluate(() => {
    __bw.F.foe.hp = __bw.F.foe.max = 10000;
    for (const id of Progression.ids) __bw.S.skillModes[id] = 'lock';
    for (const id of Progression.stats) __bw.S.attrModes[id] = 'lock';
  });
  const hp = await f.evaluate(() => __bw.S.hp);
  await action(f, 'fmaneuver', '[data-id=a1][data-stance=feint]').click();
  await withEnemyRolls(f, [.3, .3], () => submit(f));
  expect(await f.evaluate(() => __bw.S.hp)).toBe(hp);
  expect(await f.evaluate(() => __bw.S.stamina)).toBe(31);
  await next(f); await action(f, 'fpage').click();
  await withEnemyRolls(f, [.3, .3], () => submit(f));
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp);
});

test('battle boundaries · Study increases actual damage and is spent by the next attack', async ({ page }) => {
  const f = await fixture(page);
  await f.evaluate(() => {
    __bw.F.foe.hp = __bw.F.foe.max = 10000;
    for (const id of Progression.ids) __bw.S.skillModes[id] = 'lock';
    for (const id of Progression.stats) __bw.S.attrModes[id] = 'lock';
  });
  let hp = await f.evaluate(() => __bw.F.foe.hp);
  await action(f, 'fpage').click(); await submit(f);
  const ordinary = hp - await f.evaluate(() => __bw.F.foe.hp);
  await next(f); await action(f, 'futility', '[data-id=study]').click(); await submit(f);
  expect(await f.evaluate(() => __bw.F.focus)).toBeGreaterThan(0);
  await next(f); hp = await f.evaluate(() => __bw.F.foe.hp);
  await action(f, 'fpage').click(); await submit(f);
  expect(hp - await f.evaluate(() => __bw.F.foe.hp)).toBeGreaterThan(ordinary);
  expect(await f.evaluate(() => [__bw.F.focus, __bw.F.focusPower, __bw.F.pierce])).toEqual([0, 1, 0]);
});

async function withEnemyRolls(f, rolls, execute) {
  await f.evaluate(rolls => {
    const saved = { swing: Scene.FX.swing, random: Math.random, swings: 0 };
    window.battleBoundaryRolls = saved;
    Scene.FX.swing = function (from, to, ...rest) {
      const effect = saved.swing.call(this, from, to, ...rest);
      if (to === 'me') {
        const roll = rolls[saved.swings++];
        Math.random = () => roll ?? .99;
      }
      return effect;
    };
  }, rolls);
  try {
    await execute();
    return await f.evaluate(() => window.battleBoundaryRolls.swings);
  } finally {
    await f.evaluate(() => {
      const { swing, random } = window.battleBoundaryRolls;
      Scene.FX.swing = swing;
      Math.random = random;
      delete window.battleBoundaryRolls;
    });
  }
}

test('battle boundaries · a clean lift keeps a neutral foe and theft and duels own their prompts', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'thief');
  const before = await f.evaluate(() => {
    window.battleRiskTarget.unseen = true;
    __bw.ACT.fchoose();
    return { hp: __bw.S.hp, steals: __bw.S.stats.steals, kills: __bw.S.stats.kills };
  });
  await action(f, 'fsteal').click();
  await expect(action(f, 'fchoose')).toHaveCount(0);
  await submit(f);
  await expect(f.locator('#f-after')).toContainText('Clean lift');
  await action(f, 'fdone').click();
  expect(await f.evaluate(() => ({
    hp: __bw.S.hp, steals: __bw.S.stats.steals, kills: __bw.S.stats.kills,
    engaged: !!window.battleRiskTarget.engaged, emptied: !!window.battleRiskTarget.pocketsEmpty,
  }))).toEqual({ ...before, steals: before.steals + 1, engaged: false, emptied: true });

  await f.evaluate(() => __bw.HOST.interact(window.battleRiskTarget));
  await expect(f.locator('#fight')).toContainText('already picked');
  await expect(action(f, 'flee')).toHaveText('Back away');
  await action(f, 'flee').click();
  await expect(f.locator('#fight')).toBeHidden();
  await f.evaluate(() => {
    const rival = Scene.find(e => e.kind === 'rival' && e.r === 1);
    __bw.HOST.interact(rival);
  });
  await action(f, 'start', '[data-k=rival][data-m=duel]').click();
  await expect(action(f, 'fchoose')).toHaveCount(0);
  await expect(f.locator('#kb [data-fn=run]')).toHaveText('Answer');
  await submit(f);
  await expect(f.locator('#f-after')).toContainText('Duel won');
  expect(errors).toEqual([]);
});

test('battle boundaries · cancelling a rare spell preserves both enemy swings and avoids a casting charge', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'mage', true);
  await f.evaluate(() => {
    const s = __bw.S;
    s.pages.s1r = 1;
    s.mana = 0;
    s.prepared = 1;
    __bw.ACT.fchoose();
  });
  const rare = action(f, 'fpage', '[data-id=s1r]');
  await action(f, 'fscroll').click();
  await rare.click();
  await next(f);
  await action(f, 'futility', '[data-id=guard]').click();
  const guardSwings = await withEnemyRolls(f, [.01, .01], () => submit(f));
  expect(guardSwings).toBe(2);
  await expect(f.locator('#e-sw .ouch')).toHaveCount(2);
  expect(await f.evaluate(() => [__bw.S.mana, __bw.S.prepared, __bw.F.round])).toEqual([0, 1, 1]);

  await next(f);
  await rare.click();
  await next(f);
  const beforeEscape = await f.evaluate(() => ({ hp: __bw.S.hp, queries: __bw.S.stats.q }));
  const escapeSwings = await withEnemyRolls(f, [.01, .01], async () => {
    await action(f, 'flee').click();
    await expect(f.locator('#fight')).toBeHidden();
  });
  expect(escapeSwings).toBe(2);
  expect(await f.evaluate(() => ({
    queries: __bw.S.stats.q, mana: __bw.S.mana, prepared: __bw.S.prepared,
    round: window.battleRiskTarget.battleRound, pursuing: window.battleRiskTarget.chase > 0,
  }))).toEqual({ queries: beforeEscape.queries, mana: 0, prepared: 1, round: 2, pursuing: true });
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(beforeEscape.hp);
  expect(errors).toEqual([]);
});

test('battle boundaries · Siphon drains once when its first swing misses and its second hits', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'mage');
  await f.evaluate(() => {
    __bw.F.drole = 'caster';
    __bw.S.mana = 18;
    for (const id of Progression.ids) __bw.S.skillModes[id] = 'lock';
    for (const id of Progression.stats) __bw.S.attrModes[id] = 'lock';
  });
  const guard = action(f, 'futility', '[data-id=guard]');
  await guard.click();
  await submit(f);
  await next(f);
  await expect(f.locator('.battle-intent')).toContainText('Siphon');
  const hp = await f.evaluate(() => __bw.S.hp);
  await guard.click();
  const swings = await withEnemyRolls(f, [.99, .01], () => submit(f));
  expect(swings).toBe(2);
  await expect(f.locator('#e-sw .miss')).toHaveCount(1);
  await expect(f.locator('#e-sw .ouch')).toHaveCount(2);
  await expect(f.locator('#e-sw .ouch').filter({ hasText: 'mana' })).toHaveText('−4 mana');
  expect(await f.evaluate(() => [__bw.S.mana, __bw.F.round])).toEqual([14, 2]);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp);
  expect(errors).toEqual([]);
});

test('battle boundaries · chase expires beyond visible scene range outside town safety', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'warrior', true);
  await withEnemyRolls(f, [.01, .01], async () => {
    await action(f, 'flee').click();
    await expect(f.locator('#fight')).toBeHidden();
  });
  const initial = await f.evaluate(() => {
    const e = window.battleRiskTarget, { map } = Scene.debug();
    const tiles = Array.from({ length: 81 * 81 }, (_, i) => [e.x + i % 81 - 40, e.y + Math.floor(i / 81) - 40]);
    const at = tiles.find(([x, y]) => {
      const i = y * map.w + x;
      return x > 0 && y > 0 && x < map.w - 1 && y < map.h - 1 && Math.hypot(x - e.fx, y - e.fy) > 28 &&
        map.reg[i] === e.r && map.seen[i] && !map.solid[i] && !map.occ.has(i) && map.t[i] !== 4 && !Geography.inTown(x, y);
    });
    if (!at) throw Error('No open distant wilderness tile');
    for (const other of map.ents) if (other !== e) other.agg = false;
    Scene.hop(...at);
    if (e.chase > 0) e.chase = .2;
    return { at, chase: e.chase, engaged: e.engaged, round: e.battleRound };
  });
  expect(initial).toMatchObject({ chase: .2, engaged: true, round: 1 });
  await expect.poll(() => f.evaluate(() => {
    const e = window.battleRiskTarget;
    return { at: Scene.pos(), chase: e.chase, engaged: e.engaged, round: e.battleRound, lastSeen: e.lastSeen };
  })).toEqual({ at: initial.at, chase: 0, engaged: false, round: 0, lastSeen: null });
  await expect(f.locator('#fight')).toBeHidden();
  expect(errors).toEqual([]);
});
