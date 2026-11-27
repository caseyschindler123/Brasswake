const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

const action = (f, a, attrs = '') => f.locator(`[data-a="${a}"]${attrs}`);
async function fixture(page, path = 'warrior', forced = false, blockedFirst = false, template = 'b101') {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(f => f.url().includes('visual_test=1'));
  await f.evaluate(({ path, forced, blockedFirst, template }) => {
    Sound.setMu(false); window.__bwFast = true;
    const s = __bw.S, presets = {
      warrior: { sk: { swords: 40, healing: 30 }, attr: { str: 60, dex: 35, int: 25 }, w: 'swords', pages: { a1: 1 } },
      thief: { sk: { stealing: 40, hiding: 30 }, attr: { str: 35, dex: 60, int: 25 }, w: 'fencing', pages: { a1: 1, h1: 1 } },
      mage: { sk: { magery: 40, alchemy: 30 }, attr: { str: 25, dex: 35, int: 60 }, w: 'magery', pages: { s1: 1 } },
      crafter: { sk: { smith: 40, carpentry: 30 }, attr: { str: 45, dex: 40, int: 35 }, w: 'swords', pages: { a1: 1, c1: 1 } },
    }, p = presets[path];
    Object.assign(s, { path, sk: p.sk, attr: p.attr, pages: p.pages, techniques: null, bandages: 4, tonics: 1, prepared: 0, tut: 3, gd: 99, seen: { fight: 1, fprompt: 1, stealth: 1 } });
    Progression.normalize(s); s.hp = Progression.maxHp(s); s.mana = Progression.maxMana(s); s.stamina = Progression.maxStamina(s);
    const weapon = __bw.makeItem('common', 1, 'weapon', p.w); s.inv = [weapon]; s.eq = { weapon: weapon.id };
    for (const e of Scene.ents()) {
      e.wander = 0;
      e.agg = 0;
      e.tx = e.ty = null;
      e.fx = e.x;
      e.fy = e.y;
      e.chase = 0;
      if (e.combat) e.combat = undefined;
    }
    const m = Scene.debug().map;
    const candidates = Scene.ents().filter(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === template &&
      !e.inst.elite && !e.dead && !e.dying && !Geography.inTown(e.x, e.y));
    if (!candidates.length) throw Error('No ordinary battle candidates for '+template);
    const neighbors = e => [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => [e.x+dx,e.y+dy]);
    // Population and wandering can surround the first matching creature.
    // Keep its actual starting stats, but choose a creature we can stand beside.
    const blocked = blockedFirst ? neighbors(candidates[0]).map(([x,y]) => [y*m.w+x, m.solid[y*m.w+x]]) : [];
    for (const [i] of blocked) m.solid[i] = 1;
    let selected;
    try {
      selected = candidates.map(e => ({ e, at: neighbors(e).find(([x,y]) =>
        x > 1 && y > 1 && x < m.w-1 && y < m.h-1 && m.seen[y*m.w+x] &&
        !m.solid[y*m.w+x] && m.t[y*m.w+x] !== 4 && !m.occ.has(y*m.w+x) && !Geography.inTown(x, y)) })).find(p => p.at);
    } finally { for (const [i, solid] of blocked) m.solid[i] = solid; }
    if (!selected) throw Error('No clear ordinary battle approach among ' + candidates.length + ' candidates');
    const { e, at } = selected;
    window.battleRiskTarget = e;
    window.battleRiskSkippedFirst = e !== candidates[0];
    e.pursuitAnchor = [e.x, e.y];
    Scene.warp(...at);
    if (Scene.pos().join() !== at.join()) throw Error('Ordinary battle approach was displaced');
    if (!__bw.Combat.selectTarget(e)) throw Error('Could not select the ordinary battle target');
    if (forced && !Scene.combatEngage(e)) throw Error('Could not engage the ordinary battle target');
    __bw.render();
  }, { path, forced, blockedFirst, template });
  await expect(f.locator('#fight')).toBeHidden();
  return f;
}
async function submit(f, sql) {
  if (sql === undefined) sql = await f.evaluate(() => __bw.F.task.sql);
  await f.locator('#sql').fill(sql);
  const saved = await f.evaluate(() => {
    window.battleRiskSubmitRandom = Math.random;
    Math.random = () => .01;
    return { round: __bw.F.round, fixed: __bw.F.fixed };
  });
  try {
    await f.locator('#kb [data-fn="run"]').click();
    await f.waitForFunction(before => __bw.F && !__bw.F.busy &&
      (__bw.F.round !== before.round || __bw.F.fixed !== before.fixed || __bw.F.st === 'after'), saved);
  } finally { await f.evaluate(() => { Math.random = window.battleRiskSubmitRandom; delete window.battleRiskSubmitRandom; }); }
}
async function next(f) {
  await f.evaluate(() => { if (__bw.F?.live && !__bw.F.over) __bw.Combat.cancel(); });
  await f.waitForFunction(() => __bw.Combat.snapshot().recovery.ready);
}
async function begin(f, id) {
  const result = await f.evaluate(id => {
    id ||= __bw.Combat.snapshot().actions.find(a => a.id.startsWith('basic.'))?.id;
    return { began: __bw.Combat.begin(id), id, reason: __bw.Combat.descriptor(id)?.reason };
  }, id);
  expect(result.began, `Begin ${result.id}: ${result.reason}`).toBe(true);
  await expect(f.locator('#fight #sql')).toBeVisible();
}
async function attack(f, id) {
  await begin(f, id);
  await submit(f);
}

async function trackEnemyBlows(f, damageRoll = .01) {
  await f.evaluate(damageRoll => {
    const swing = Scene.FX.swing;
    window.battleRiskBlows = [];
    Scene.FX.swing = function(from, to, ...rest) {
      const result = swing.call(this, from, to, ...rest);
      if (from === window.battleRiskTarget && to === 'me') {
        const random = Math.random;
        const hp = __bw.S.hp, clock = Scene.tacticalTime();
        let rolls = 0;
        Math.random = () => rolls++ === 0 ? .01 : damageRoll;
        queueMicrotask(() => {
          Math.random = random;
          window.battleRiskBlows.push({ damage: hp - __bw.S.hp, clock });
        });
      }
      return result;
    };
  }, damageRoll);
}

async function enemyBlow(f, count) {
  await f.waitForFunction(count => window.battleRiskBlows.length >= count, count);
  return f.evaluate(count => window.battleRiskBlows[count - 1], count);
}

// Prepared positions shorten travel. Stats, weapon rarity, resources and foe HP
// use each starting preset. Pinned rolls make real action transactions repeatable.
test('battle risk · an obstructed first creature retains a clear ordinary battle fixture', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page, 'warrior', false, true);
  expect(await f.evaluate(() => {
    const e = battleRiskTarget, [x, y] = Scene.pos();
    return { skipped: battleRiskSkippedFirst, same: __bw.Combat.snapshot().target.id === e.id,
      tpl: e.inst.tpl, elite: e.inst.elite, distance: Math.hypot(x-e.x, y-e.y) };
  }))
    .toEqual({ skipped: true, same: true, tpl: 'b101', elite: false, distance: 1 });
  const hp = await f.evaluate(() => __bw.S.hp);
  await trackEnemyBlows(f);
  await attack(f);
  await enemyBlow(f, 1);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp);
  expect(errors).toEqual([]);
});

for (const path of ['warrior', 'mage', 'thief', 'crafter']) test(`battle risk · starting ${path} faces a real response and no free victory heal`, async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page, path);
  const before = await f.evaluate(() => ({ hp: __bw.S.hp, healing: __bw.S.sk.healing || 0 }));
  await trackEnemyBlows(f);
  await attack(f);
  expect(await f.evaluate(() => __bw.F.foe.hp)).toBeGreaterThan(0);
  expect(await f.evaluate(() => __bw.S.hp)).toBe(before.hp);
  await enemyBlow(f, 1);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(before.hp);
  let rounds = 1, previousHP;
  while (!await f.evaluate(() => __bw.F.over) && rounds < 9) {
    await next(f);
    await begin(f);
    previousHP = await f.evaluate(() => __bw.S.hp);
    await submit(f);
    rounds++;
  }
  expect(rounds).toBeGreaterThan(1);
  expect(await f.evaluate(() => __bw.F.foe.hp)).toBeLessThanOrEqual(0);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThanOrEqual(previousHP);
  expect(await f.evaluate(() => __bw.S.sk.healing || 0)).toBe(before.healing);
  await expect(f.locator('#hud')).toContainText('Mana');
  await screenshot(page, info, `battle-risk-${path}-victory`);
  expect(errors).toEqual([]);
});

test('battle risk · finite bandages and draughts allow a response without free resource recovery', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await trackEnemyBlows(f);
  await f.evaluate(() => {
    Object.assign(__bw.S, { hp: 25, mana: 5, stamina: 7, bandages: 1 });
    window.battleRiskAt = Scene.pos();
    Scene.combatEngage(battleRiskTarget);
  });
  await begin(f, 'supply');
  const before = await f.evaluate(() => ({ stamina: __bw.S.stamina, clock: Scene.tacticalTime() }));
  await submit(f);
  const bandage = await f.evaluate(() => ({
    supplies: __bw.S.bandages, mana: __bw.S.mana, stamina: __bw.S.stamina,
    clock: Scene.tacticalTime(), max: Progression.maxStamina(__bw.S), phase: __bw.F.st, quality: __bw.F.queryPower
  }));
  expect(bandage).toMatchObject({ supplies: 0, mana: 5, phase: 'after', quality: 1 });
  expect(bandage.stamina).toBeCloseTo(Math.min(bandage.max, before.stamina +
    (bandage.clock - before.clock) / 1000 * 3), 3);
  await expect(f.locator('#combat-result')).toContainText('Restored');
  expect((await enemyBlow(f, 1)).damage).toBeGreaterThan(0);
  await next(f);
  expect(await f.evaluate(() => __bw.Combat.descriptor('supply'))).toMatchObject({
    eligible: false, reason: 'You have none of that supply.'
  });
  expect(await f.evaluate(() => __bw.Combat.setSupply('draught'))).toBe(false);
  await f.evaluate(() => Scene.warp(...Scene.towns()[1]));
  await f.waitForFunction(() => !__bw.Combat.active());
  expect(await f.evaluate(() => __bw.Combat.setSupply('draught'))).toBe(true);
  await f.evaluate(() => {
    Scene.warp(...battleRiskAt);
    Scene.combatEngage(battleRiskTarget);
  });
  await begin(f, 'supply');
  const hp = await f.evaluate(() => __bw.S.hp);
  await submit(f);
  expect(await f.evaluate(() => ({
    hp: __bw.S.hp, mana: __bw.S.mana, tonics: __bw.S.tonics, power: __bw.F.queryPower
  }))).toEqual({ hp: hp + 30, mana: 5, tonics: 0, power: 1 });
  const blows = await f.evaluate(() => battleRiskBlows.length);
  expect((await enemyBlow(f, blows + 1)).damage).toBeGreaterThan(0);
  expect(await f.evaluate(() => __bw.S.hp)).toBeLessThan(hp + 30);
  await screenshot(page, info, 'battle-risk-draught-response');
  expect(errors).toEqual([]);
});

test('battle risk · Iron Guard protects against live blows and expires on active time', async ({ page }) => {
  const f = await fixture(page);
  await trackEnemyBlows(f);
  await f.evaluate(() => {
    __bw.S.sk.swords = 90;
    for (const [id] of Progression.skills) __bw.S.skillModes[id] = 'lock';
    for (const id of Progression.stats) __bw.S.attrModes[id] = 'lock';
    Techniques.teach(__bw.S, 5);
    if (!__bw.Combat.equip('swords.iron-guard', 0).ok) throw Error('Could not equip Iron Guard');
    Scene.combatEngage(battleRiskTarget);
    battleRiskTarget.combat.cooldown = .2;
  });
  const progression = () => f.evaluate(() => ({ stats: { ...__bw.S.attr }, skills: { ...__bw.S.sk } }));
  const before = await progression();
  await begin(f, 'swords.iron-guard');
  const committedAt = await f.evaluate(() => Scene.tacticalTime());
  await submit(f);
  await expect(f.locator('#combat-result')).toContainText('five seconds');
  const [first, second, third] = [await enemyBlow(f, 1), await enemyBlow(f, 2), await enemyBlow(f, 3)];
  expect(first.damage).toBeGreaterThan(0);
  expect(second.damage).toBe(first.damage);
  expect(third.damage).toBeGreaterThan(second.damage);
  expect(second.clock - committedAt).toBeLessThan(5000);
  expect(third.clock - committedAt).toBeGreaterThanOrEqual(5000);
  expect(await progression()).toEqual(before);
});

test('battle risk · brute windup and recovery govern the next live blow', async ({ page }, info) => {
  const f = await fixture(page);
  await trackEnemyBlows(f);
  const hp = await f.evaluate(() => {
    const { combat } = battleRiskTarget;
    combat.config.drole = 'brute';
    combat.profile = LiveCombat.profile({ role: 'brute' });
    Scene.combatEngage(battleRiskTarget);
    return __bw.S.hp;
  });
  await f.waitForFunction(() => battleRiskTarget.combat.windup > 0);
  await begin(f);
  const winding = await f.evaluate(() => ({
    time: battleRiskTarget.combat.windup, round: battleRiskTarget.combat.round, hp: __bw.S.hp
  }));
  expect(winding).toMatchObject({ hp, round: 0 });
  expect(winding.time).toBeGreaterThan(0);
  await f.waitForTimeout(500);
  expect(await f.evaluate(() => ({
    time: battleRiskTarget.combat.windup, round: battleRiskTarget.combat.round, hp: __bw.S.hp
  }))).toEqual(winding);
  await f.evaluate(() => __bw.Combat.cancel());
  await f.waitForFunction(() => battleRiskTarget.combat.round === 1);
  const announced = await f.evaluate(() => ({ hp: __bw.S.hp, clock: Scene.tacticalTime(), blows: battleRiskBlows.length }));
  expect(announced).toMatchObject({ hp, blows: 0 });
  const blow = await enemyBlow(f, 1);
  expect(blow.damage).toBeGreaterThan(5);
  expect(blow.clock - announced.clock).toBeGreaterThanOrEqual(4250);
  await screenshot(page, info, 'battle-risk-brute-intent');
});

test('battle risk · canceling SQL twice does not erase forced engagement or add a contact hit', async ({ page }, info) => {
  const f = await fixture(page, 'warrior', true);
  await trackEnemyBlows(f);
  await expect(action(f, 'flee')).toHaveCount(0);
  let hp = await f.evaluate(() => __bw.S.hp);
  for (let attempt = 0; attempt < 2; attempt++) {
    await begin(f);
    expect(await f.evaluate(() => __bw.S.hp)).toBe(hp);
    expect(await f.evaluate(() => __bw.Combat.cancel())).toBe(true);
    await expect(f.locator('#fight')).toBeHidden();
    expect(await f.evaluate(() => battleRiskTarget.combat.phase)).toBe('chase');
    expect((await enemyBlow(f, attempt + 1)).damage).toBeGreaterThan(0);
    const state = await f.evaluate(() => ({
      hp: __bw.S.hp, phase: battleRiskTarget.combat.phase, round: battleRiskTarget.combat.round
    }));
    expect(state.hp).toBeLessThan(hp);
    expect(state).toMatchObject({ phase: 'chase', round: attempt + 1 });
    hp = state.hp;
  }
  await screenshot(page, info, 'battle-risk-engaged-reentry');
});

test('battle risk · clear direct controls retain health, keyboard access and correction limits', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await expect(action(f, 'fstance')).toHaveCount(0);
  const strike = action(f, 'combatbegin', '[data-id="basic.swords"]');
  await expect(strike).toBeEnabled();
  await screenshot(page, info, 'battle-risk-actions');
  await strike.click();
  await expect(f.locator('#fight #sql')).toBeVisible();
  expect(await f.evaluate(() => __bw.F.actionId)).toBe('basic.swords');
  await expect(f.locator('#hud')).toContainText('80 / 80');
  const paused = await f.evaluate(() => ({ hp: __bw.S.hp, clock: Scene.tacticalTime(), round: __bw.F.round }));
  await f.waitForTimeout(500);
  expect(await f.evaluate(() => ({ hp: __bw.S.hp, clock: Scene.tacticalTime(), round: __bw.F.round }))).toEqual(paused);
  const first = await f.evaluate(() => [__bw.F.round, __bw.S.mana, __bw.S.stamina]);
  await submit(f, 'SELEC name FROM vendors');
  expect(await f.evaluate(() => [__bw.F.round, __bw.S.mana, __bw.S.stamina])).toEqual(first);
  const run = await f.locator('#kb [data-fn="run"]').boundingBox();
  expect(run.y + run.height).toBeLessThanOrEqual(page.viewportSize().height);
  await screenshot(page, info, 'battle-risk-free-fix');
  await f.evaluate(() => __bw.Combat.cancel());
  await begin(f, 'basic.magery');
  const commit = await f.evaluate(() => [__bw.F.round, __bw.S.mana]);
  await submit(f, 'SELEC name FROM vendors');
  expect(await f.evaluate(() => [__bw.F.round, __bw.S.mana, __bw.F.queryPower]))
    .toEqual([commit[0] + 1, commit[1] - 3, 0]);
  expect(errors).toEqual([]);
});

test('battle risk · a shape hint carries reduced power when switching live actions', async ({ page }) => {
  const errors = observeErrors(page), f = await fixture(page);
  await begin(f);
  const sql = await f.evaluate(() => __bw.F.task.sql);
  await action(f, 'queryhelp').click();
  await action(f, 'fhint').click();
  await action(f, 'fhint').click();
  expect(await f.evaluate(() => __bw.F.hint)).toBe(2);
  await f.locator('#kb [data-fn="ldone"]').click();
  await action(f, 'combatback').click();
  await begin(f, 'basic.magery');
  expect(await f.evaluate(() => [__bw.F.hint, __bw.F.task.sql])).toEqual([2, sql]);
  await submit(f);
  expect(await f.evaluate(() => [__bw.F.res.ok, __bw.F.queryPower])).toEqual([true, .6]);
  expect(errors).toEqual([]);
});

test('battle risk · ignoring Examiner attacks causes death with the existing recovery rules', async ({ page }, info) => {
  const errors = observeErrors(page), f = await fixture(page);
  await f.evaluate(() => {
    const e = Scene.find(e => e.kind === 'boss' && e.r === 1);
    if (!e) throw Error('Could not find the First Circle Examiner');
    const m = Scene.debug().map;
    const at = [[e.x + 1, e.y], [e.x - 1, e.y], [e.x, e.y + 1], [e.x, e.y - 1]]
      .find(([x, y]) => !m.solid[y*m.w+x] && !m.occ.has(y*m.w+x));
    if (!at) throw Error('No clear approach to the Examiner');
    Scene.warp(...at);
    window.battleRiskTarget = e;
    __bw.setCE(e);
    __bw.START.boss();
  });
  await trackEnemyBlows(f, .99);
  await begin(f);
  expect(await f.evaluate(() => ({ noHint: __bw.F.noHint, kind: __bw.F.kind, hp: __bw.S.hp })))
    .toEqual({ noHint: true, kind: 'boss', hp: 80 });
  await action(f, 'queryhelp').click();
  await expect(f.locator('.query-reference')).toContainText('No hints are available');
  await expect(action(f, 'fhint')).toHaveCount(0);
  await expect(action(f, 'fshow')).toHaveCount(0);
  await f.locator('#kb [data-fn="ldone"]').click();
  await submit(f, 'SELECT -987654321 AS unrelated_result');
  expect(await f.evaluate(() => __bw.F.queryPower)).toBe(0);
  let blows = 0;
  while (!await f.evaluate(() => __bw.F.kick) && blows < 12) {
    expect((await enemyBlow(f, ++blows)).damage).toBeGreaterThan(0);
  }
  expect(blows).toBeGreaterThan(1);
  await expect(f.locator('#f-after')).toContainText('You fall');
  expect(await f.evaluate(() => __bw.S.hp)).toBe(0);
  expect(await f.evaluate(() => __bw.S.remains.loot.items.some(it => it.slot === 'weapon'))).toBe(true);
  await screenshot(page, info, 'battle-risk-examiner-death');
  await action(f, 'fdone').click();
  expect(await f.evaluate(() => __bw.S.hp)).toBe(await f.evaluate(() => __bw.maxHp()));
  expect(await f.evaluate(() => __bw.S.deathPending)).toBeNull();
  expect(errors).toEqual([]);
});

module.exports = { fixture, submit, next, attack, action, begin };
