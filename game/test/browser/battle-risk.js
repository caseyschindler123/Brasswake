const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

const action = (f, a, attrs = '') => f.locator(`[data-a="${a}"]${attrs}`);
async function fixture(page, path = 'warrior', forced = false, blockedFirst = false) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(f => f.url().includes('visual_test=1'));
  await f.evaluate(({ path, forced, blockedFirst }) => {
    Sound.setMu(false); window.__bwFast = true;
    const s = __bw.S, presets = {
      warrior: { sk: { swords: 40, healing: 30 }, attr: { str: 60, dex: 35, int: 25 }, w: 'swords', pages: { a1: 1 } },
      thief: { sk: { stealing: 40, hiding: 30 }, attr: { str: 35, dex: 60, int: 25 }, w: 'fencing', pages: { a1: 1, h1: 1 } },
      mage: { sk: { magery: 40, alchemy: 30 }, attr: { str: 25, dex: 35, int: 60 }, w: 'magery', pages: { s1: 1 } },
      crafter: { sk: { smith: 40, carpentry: 30 }, attr: { str: 45, dex: 40, int: 35 }, w: 'swords', pages: { a1: 1, c1: 1 } },
    }, p = presets[path];
    Object.assign(s, { path, sk: p.sk, attr: p.attr, pages: p.pages, bandages: 4, tonics: 1, prepared: 0, tut: 3, gd: 99, seen: { fight: 1, fprompt: 1, stealth: 1 } });
    Progression.normalize(s); s.hp = Progression.maxHp(s); s.mana = Progression.maxMana(s); s.stamina = Progression.maxStamina(s);
    const weapon = __bw.makeItem('common', 1, 'weapon', p.w); s.inv = [weapon]; s.eq = { weapon: weapon.id };
    for (const e of Scene.ents()) { e.wander = 0; e.tx = null; e.fx = e.x; e.fy = e.y; e.chase = 0; }
    const m = Scene.debug().map;
    const candidates = Scene.ents().filter(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === 'b101' && !e.inst.elite && !e.dead && !e.dying);
    if (!candidates.length) throw Error('No ordinary b101 battle candidates');
    const neighbors = e => [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => [e.x+dx,e.y+dy]);
    // Population and wandering can surround the first matching creature.
    // Keep its actual starting stats, but choose a creature we can stand beside.
    const blocked = blockedFirst ? neighbors(candidates[0]).map(([x,y]) => [y*m.w+x, m.solid[y*m.w+x]]) : [];
    for (const [i] of blocked) m.solid[i] = 1;
    let selected;
    try {
      selected = candidates.map(e => ({ e, at: neighbors(e).find(([x,y]) =>
        x > 1 && y > 1 && x < m.w-1 && y < m.h-1 && m.seen[y*m.w+x] &&
        !m.solid[y*m.w+x] && m.t[y*m.w+x] !== 4 && !m.occ.has(y*m.w+x)) })).find(p => p.at);
    } finally { for (const [i, solid] of blocked) m.solid[i] = solid; }
    if (!selected) throw Error('No clear ordinary battle approach among ' + candidates.length + ' candidates');
    const { e, at } = selected;
    window.battleRiskTarget = e;
    window.battleRiskSkippedFirst = e !== candidates[0];
    Scene.warp(...at);
    if (Scene.pos().join() !== at.join()) throw Error('Ordinary battle approach was displaced');
    if (forced) __bw.HOST.ambush(e); else __bw.HOST.interact(e);
  }, { path, forced, blockedFirst });
  await expect(f.locator('#fight')).toBeVisible();
  return f;
}
async function submit(f, sql) {
  if (sql === undefined) sql = await f.evaluate(() => __bw.F.task.sql);
  await f.locator('#sql').fill(sql);
  await f.evaluate(() => { window.battleRiskRandom = Math.random; Math.random = () => .01; });
  try {
    await f.locator('#kb [data-fn="run"]').click();
    await f.waitForFunction(() => __bw.F && !__bw.F.busy);
  } finally { await f.evaluate(() => { Math.random = window.battleRiskRandom; }); }
}
async function next(f) { await action(f, 'fchoose').click(); }
async function attack(f) {
  await action(f, 'fpage').first().click(); await submit(f);
}

// Prepared positions shorten travel. Stats, weapon rarity, resources and foe HP
// use each actual starting preset. Pinned rolls establish response transactions,
// not a population death-rate estimate or a naturally earned campaign.
test('battle risk · an obstructed first creature retains a clear ordinary battle fixture', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'warrior', false, true);
  expect(await f.evaluate(() => {
    const e = battleRiskTarget, [x, y] = Scene.pos();
    return { skipped: battleRiskSkippedFirst, same: __bw.F.ent === e,
      tpl: e.inst.tpl, elite: e.inst.elite, distance: Math.hypot(x-e.x, y-e.y) };
  }))
    .toEqual({ skipped: true, same: true, tpl: 'b101', elite: false, distance: 1 });
  const hp = await f.evaluate(() => __bw.S.hp);
  await attack(f);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp);
  expect(errors).toEqual([]);
});

for (const path of ['warrior', 'mage', 'thief', 'crafter']) test(`battle risk · starting ${path} faces a real response and no free victory heal`, async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, path);
  const before = await f.evaluate(() => ({ hp: __bw.S.hp, healing: __bw.S.sk.healing || 0 }));
  await attack(f);
  expect(await f.evaluate(() => __bw.F.foe.hp)).toBeGreaterThan(0);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(before.hp);
  let rounds = 1, previousHP;
  while (!await f.evaluate(() => __bw.F.over) && rounds < 9) {
    previousHP = await f.evaluate(() => __bw.S.hp);
    await next(f); await attack(f); rounds++;
  }
  expect(rounds).toBeGreaterThan(1);
  expect(await f.evaluate(() => __bw.F.foe.hp)).toBeLessThanOrEqual(0);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThanOrEqual(previousHP);
  expect(await f.evaluate(() => __bw.S.sk.healing || 0)).toBe(before.healing);
  await expect(f.locator('.battle-status')).toContainText('You');
  await screenshot(page, info, `battle-risk-${path}-victory`);
  expect(errors).toEqual([]);
});

test('battle risk · finite bandages and draughts allow a response without free resource recovery', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await f.evaluate(() => { __bw.S.hp = 25; __bw.S.mana = 5; __bw.S.stamina = 7; __bw.S.bandages = 1; __bw.ACT.fchoose(); });
  await action(f, 'futility', '[data-id="bandage"]').click(); await submit(f);
  expect(await f.evaluate(() => [__bw.S.bandages, __bw.S.mana, __bw.S.stamina])).toEqual([0, 5, 7]);
  await expect(f.locator('#f-after')).toContainText('One bandage used');
  await next(f); await expect(action(f, 'futility', '[data-id="bandage"]')).toBeDisabled();
  const hp = await f.evaluate(() => __bw.S.hp);
  await f.evaluate(() => { window.battleRiskRandom = Math.random; Math.random = () => .01; });
  try { await action(f, 'tonic').click(); await f.waitForFunction(() => !__bw.F.busy); }
  finally { await f.evaluate(() => { Math.random = window.battleRiskRandom; }); }
  expect(await f.evaluate(() => __bw.S.tonics)).toBe(0);
  const healed = await f.evaluate(() => __bw.S.hp);
  expect(healed).toBeGreaterThan(hp); expect(healed).toBeLessThan(hp + 30);
  await expect(f.locator('#e-sw')).toContainText('−');
  await expect(f.locator('.query-power')).toHaveCount(0);
  await screenshot(page, info, 'battle-risk-draught-response');
  expect(errors).toEqual([]);
});

test('battle risk · Guard protects the current and next exchange, then expires', async ({ page }) => {
  const f = await fixture(page);
  await f.evaluate(() => {
    __bw.F.foe.hp = __bw.F.foe.max = 10000;
    for (const [id] of Progression.skills) __bw.S.skillModes[id] = 'lock';
    for (const id of Progression.stats) __bw.S.attrModes[id] = 'lock';
  });
  const damage = [];
  for (const id of ['guard', 'strike', 'strike']) {
    const hp = await f.evaluate(() => __bw.S.hp);
    if (id === 'guard') { await action(f, 'futility', '[data-id="guard"]').click(); await submit(f); }
    else await attack(f);
    damage.push(hp - await f.evaluate(() => __bw.S.hp));
    if (damage.length < 3) await next(f);
  }
  expect(damage[0]).toBeGreaterThan(0); expect(damage[0]).toBe(damage[1]); expect(damage[2]).toBeGreaterThan(damage[1]);
  expect(await f.evaluate(() => __bw.F.defense)).toBeNull();
});

test('battle risk · announced role phases match the actual next response', async ({ page }, info) => {
  const f = await fixture(page);
  await f.evaluate(() => { __bw.F.drole = 'brute'; __bw.F.foe.hp = __bw.F.foe.max = 10000; });
  await action(f, 'fpage').click();
  await expect(f.locator('.battle-intent')).toContainText('Wind-up');
  const hp = await f.evaluate(() => __bw.S.hp); await submit(f);
  expect(await f.evaluate(() => __bw.S.hp)).toBe(hp);
  await next(f); await expect(f.locator('.battle-intent')).toContainText('Crushing blow');
  await attack(f); expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp);
  await screenshot(page, info, 'battle-risk-brute-intent');
});

test('battle risk · forced engagement cannot be erased by initial or caught re-entry Flee', async ({ page }, info) => {
  const f = await fixture(page, 'warrior', true);
  await expect(action(f, 'flee')).toHaveText('Flee');
  let hp = await f.evaluate(() => __bw.S.hp);
  for (let attempt = 0; attempt < 2; attempt++) {
    await f.evaluate(() => { window.battleRiskRandom = Math.random; Math.random = () => .01; });
    try { await action(f, 'flee').click(); await expect(f.locator('#fight')).toBeHidden(); }
    finally { await f.evaluate(() => { Math.random = window.battleRiskRandom; }); }
    const state = await f.evaluate(() => ({ hp: __bw.S.hp, chase: window.battleRiskTarget.chase, engaged: window.battleRiskTarget.engaged }));
    expect(state.hp).toBeLessThan(hp); expect(state.chase).toBeGreaterThan(0); expect(state.engaged).toBe(true);
    hp = state.hp;
    await f.evaluate(() => __bw.HOST.ambush(window.battleRiskTarget));
    expect(await f.evaluate(() => __bw.S.hp)).toBe(hp); // No extra unavoidable contact hit.
    expect(await f.evaluate(() => __bw.F.engaged)).toBe(true);
    expect(await f.evaluate(() => __bw.F.round)).toBe(attempt + 1);
    await expect(action(f, 'flee')).toHaveText('Flee');
  }
  await screenshot(page, info, 'battle-risk-engaged-reentry');
});

test('battle risk · clear direct controls retain health, keyboard access and correction limits', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await expect(action(f, 'fstance')).toHaveCount(0);
  await screenshot(page, info, 'battle-risk-actions');
  await action(f, 'fmaneuver', '[data-id="a1"][data-stance="feint"]').click();
  await expect(f.locator('.f-head b').first()).toHaveText('Feint');
  await expect(f.locator('.battle-status')).toContainText('80 / 80');
  const paused = await f.evaluate(() => ({ hp: __bw.S.hp, clock: Scene.tacticalTime(), round: __bw.F.round }));
  await f.waitForTimeout(500);
  expect(await f.evaluate(() => ({ hp: __bw.S.hp, clock: Scene.tacticalTime(), round: __bw.F.round }))).toEqual(paused);
  const round = await f.evaluate(() => __bw.F.round);
  await submit(f, 'SELEC name FROM vendors');
  expect(await f.evaluate(() => __bw.F.round)).toBe(round);
  const run = await f.locator('#kb [data-fn="run"]').boundingBox();
  expect(run.y + run.height).toBeLessThanOrEqual(page.viewportSize().height);
  await screenshot(page, info, 'battle-risk-free-fix');
  await action(f, 'fchoose').click(); await action(f, 'fpage').click();
  await submit(f, 'SELEC name FROM vendors');
  expect(await f.evaluate(() => __bw.F.round)).toBe(round + 1);
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(0);
  expect(errors).toEqual([]);
});

test('battle risk · ignoring Examiner attacks causes death with the existing recovery rules', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await action(f, 'flee').click(); // Voluntary neutral inspection still backs away.
  await f.evaluate(() => {
    const e = Scene.find(e => e.kind === 'boss' && e.r === 1);
    Scene.warp(e.x + 1, e.y); __bw.setCE(e); __bw.START.boss();
  });
  let exchanges = 0;
  while (!await f.evaluate(() => __bw.F.over) && exchanges < 7) {
    if (exchanges) await next(f);
    await action(f, 'fpage').click();
    await expect(action(f, 'fhint')).toHaveCount(0); await expect(action(f, 'fshow')).toHaveCount(0);
    await submit(f, 'SELECT -987654321 AS unrelated_result'); exchanges++;
  }
  expect(exchanges).toBeLessThanOrEqual(6);
  await expect(f.locator('#f-after')).toContainText('You fall');
  expect(await f.evaluate(() => __bw.S.hp)).toBe(0);
  expect(await f.evaluate(() => __bw.S.remains.loot.items.some(it => it.slot === 'weapon'))).toBe(true);
  await screenshot(page, info, 'battle-risk-examiner-death');
  await action(f, 'fdone').click();
  expect(await f.evaluate(() => __bw.S.hp)).toBe(await f.evaluate(() => __bw.maxHp()));
  expect(errors).toEqual([]);
});

module.exports = { fixture, submit, next, attack, action };
