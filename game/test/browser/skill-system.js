const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

const action = (f, name, attrs = '') => f.locator(`[data-a=${name}]${attrs}`);
const combat = (f, id) => action(f, 'combatbegin', `[data-id="${id}"]`);

async function beginCombat(f, id) {
  await expect(combat(f, id)).toBeEnabled({ timeout: 10000 });
  await combat(f, id).click();
  await coach(f);
  await expect(f.locator('#fight #sql')).toBeVisible();
}

async function coach(f) {
  const dismiss = action(f, 'coachok');
  if (await dismiss.isVisible()) await dismiss.click();
}

async function adventure(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const f = page.frames().find(frame => frame.url().includes('visual_test=1'));
  await f.evaluate(() => {
    Sound.setMu(false);
    window.__bwFast = true;
    // Leave entities and collisions intact while keeping unrelated patrols still.
    for (const e of Scene.ents()) if (e.wander) {
      e.wander = 0;
      e.tx = null;
      e.fx = e.x;
      e.fy = e.y;
      e.alert = 0;
    }
  });
  await coach(f);
  return f;
}

async function tab(f, name) {
  await f.locator(`#nav [data-t=${name}]`).click();
  await coach(f);
}

async function standBy(f, kind, fields = {}) {
  const destination = await f.evaluate(({ kind, fields }) => {
    const { map } = Scene.debug();
    for (const e of Scene.ents()) {
      if (e.kind !== kind || e.r !== 1 || e.hidden || !Object.entries(fields).every(([key, value]) => e[key] === value)) continue;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const x = e.x + dx, y = e.y + dy, i = y * map.w + x;
        if (map.reg[i] !== e.r || map.solid[i] || map.occ.has(i) || map.t[i] === 4) continue;
        if (kind !== 'mon' && map.ents.some(other => other !== e && !other.hidden && Math.abs(other.x - x) + Math.abs(other.y - y) <= 1)) continue;
        if (kind === 'mon' && Geography.inTown(x, y)) continue;
        Scene.hop(x, y);
        window.__skillNearby = e;
        return { name: e.name, id: e.cid || e.hid || e.fid, at: [x, y] };
      }
    }
    throw Error('No safe approach for ' + kind + ' ' + JSON.stringify(fields));
  }, { kind, fields });
  expect(await f.evaluate(() => Scene.pos())).toEqual(destination.at);
  if (kind === 'mon') {
    await f.evaluate(() => __bw.Combat.selectTarget(window.__skillNearby));
    await expect(f.locator('#combat-target')).toContainText(destination.name);
    return destination;
  }
  await expect(f.locator('#ctx')).toContainText(destination.name);
  await f.locator('#ctx').click();
  await coach(f);
  return destination;
}

// Queries come from the real seeded exercise generator. Pin only action rolls
// after the task exists and restore randomness before opening the next task.
async function withRoll(f, roll, execute) {
  await f.evaluate(roll => {
    window.__skillTestRandom = Math.random;
    Math.random = () => roll;
  }, roll);
  try { return await execute(); }
  finally {
    await f.evaluate(() => {
      Math.random = window.__skillTestRandom;
      delete window.__skillTestRandom;
    });
  }
}

async function submit(f, surface, { sql, roll = 0, next } = {}) {
  if (sql === undefined) sql = await f.evaluate(surface => __bw[surface].task.sql, surface);
  await f.locator('#sql').fill(sql);
  if (surface === 'F' && !next) {
    // Snapshot the committed resources before the first frame of resumed world time.
    await f.evaluate(() => window.addEventListener('pointerdown', () => {
      window.__skillCommitted = { stamina: __bw.S.stamina, mana: __bw.S.mana };
    }, { once: true }));
  }
  await withRoll(f, roll, async () => {
    await f.locator('#kb [data-fn=run]').click();
    if (surface === 'F' && next) await expect(action(f, next)).toBeVisible();
    else if (surface === 'F') await f.waitForFunction(() => __bw.F?.live && __bw.F.st === 'after');
    else if (surface === 'FI') await expect(action(f, 'fiagain')).toBeVisible();
    else await expect(f.locator('#enc .q-foot [data-a=qleave]')).toBeVisible();
  });
  if (surface === 'F' && !next) return f.evaluate(() => window.__skillCommitted);
}

const wrongSQL = 'SELECT -987654321 AS unrelated_result';
const continueQuery = f => f.locator('#enc .q-foot [data-a=qleave]').click();
const progressMode = (f, id) => action(f, 'progressmode', `[data-id=${id}]`);

async function stopAt(f, label, id, value) {
  await f.getByRole('spinbutton', { name: label + ' stop target' }).fill(value);
  await action(f, 'progresstarget', `[data-id=${id}]`).click();
}

async function exportCode(f) {
  await action(f, 'export').click();
  const code = await f.locator('#savebox').inputValue();
  await f.locator('.sheet-x').click();
  return JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
}

test('skill system · Hero controls govern actual capped fishing and survive reload and legacy import', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.sk = { swords: 80, fencing: 100, archery: 100, magery: 100, smith: 100, healing: 100, carpentry: 100, fishing: 20 };
    s.skillModes = {}; s.skillTargets = {}; s.attrModes = {}; s.attrTargets = {};
    s.attr = { str: 60, dex: 40, int: 40 };
    s.skills = { select: { v: 10, t: Date.now(), n: 7 } };
    Progression.normalize(s);
  });
  await tab(f, 'hero');
  await expect(action(f, 'progressmode', '[data-stat="0"]')).toHaveCount(20);
  await expect(action(f, 'progressmode', '[data-stat="1"]')).toHaveCount(3);
  await expect(f.locator('#view h2').filter({ hasText: 'Skills' })).toContainText('700.0 / 700');
  await expect(progressMode(f, 'swords')).toHaveText('↑ Raise');
  await progressMode(f, 'swords').click();
  await expect(progressMode(f, 'swords')).toHaveText('↓ Lower');
  await progressMode(f, 'str').click();
  await progressMode(f, 'str').click();
  await expect(progressMode(f, 'str')).toHaveText('Locked');
  await stopAt(f, 'Fishing', 'fishing', '20.1');
  await stopAt(f, 'Dexterity', 'dex', '40.2');
  await expect(f.getByRole('spinbutton', { name: 'Dexterity stop target' })).toHaveValue('40.2');
  await screenshot(page, info, 'skill-controls');

  await tab(f, 'world');
  await standBy(f, 'fish');
  await action(f, 'cast', '[data-i="2"]').click();
  const prior = await f.evaluate(() => structuredClone(__bw.S.skills));
  await submit(f, 'FI', { sql: wrongSQL, roll: .99 });
  await expect(f.locator('#enc')).toContainText('Not the answer');
  expect(await f.evaluate(() => [__bw.S.sk.fishing, __bw.S.sk.swords, __bw.S.attr.dex])).toEqual([20, 80, 40]);
  expect(await f.evaluate(() => __bw.S.skills)).toEqual(prior);

  await action(f, 'fiagain').click();
  await coach(f);
  await action(f, 'cast', '[data-i="2"]').click();
  expect(await f.evaluate(() => __bw.FI.c)).toBe(2);
  await submit(f, 'FI');
  await expect(f.locator('#enc')).toContainText('A clean cast');
  const earned = await f.evaluate(() => ({
    fishing: __bw.S.sk.fishing, swords: __bw.S.sk.swords, dex: __bw.S.attr.dex,
    mode: __bw.S.skillModes.fishing, statMode: __bw.S.attrModes.dex, total: Progression.total(__bw.S),
    techniques: __bw.FI.res.used.map(id => [id, __bw.S.skills[id].n]),
  }));
  expect(earned).toMatchObject({ fishing: 20.1, swords: 79.9, dex: 40.2, mode: 'lock', statMode: 'lock', total: 700 });
  expect(earned.techniques.length).toBeGreaterThan(0);
  for (const [id, n] of earned.techniques) expect(n).toBe((prior[id]?.n || 0) + 1);
  await screenshot(page, info, 'at-cap-fishing');
  await f.locator('#enc .pk-dock [data-a=fileave]').click();
  await tab(f, 'hero');
  await expect(progressMode(f, 'fishing')).toHaveText('Locked');
  const exported = await exportCode(f);
  const world = exported.worlds[exported.world], active = world.slots[world.cur];
  expect(exported.v).toBe(9);
  expect(active).toMatchObject({
    v: 8, uid: expect.stringMatching(/\S/), horse: { owned: false, mounted: false },
    skillModes: { fishing: 'lock', swords: 'down' }, skillTargets: { fishing: 20.1 }, attrTargets: { dex: 40.2 },
  });

  // Navigate away from the visual fixture so its disposable reset does not run again.
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await action(page, 'playslot', `[data-i="${world.cur}"]`).click();
  await expect(page.locator('#title')).toBeHidden();
  await tab(page, 'hero');
  await expect(progressMode(page, 'fishing')).toHaveText('Locked');
  await expect(page.getByRole('spinbutton', { name: 'Dexterity stop target' })).toHaveValue('40.2');

  const legacy = { ...structuredClone(world), v: 7, rev: exported.rev, at: exported.at };
  const slot = legacy.slots[legacy.cur];
  const other = (legacy.cur + 2) % 5;
  legacy.slots[other] = { ...structuredClone(slot), path: 'thief', name: 'Old companion', bank: { gold: 79, items: [] } };
  for (const old of [slot, legacy.slots[other]]) {
    old.v = 6;
    for (const key of ['progression', 'attr', 'mana', 'stamina', 'skillModes', 'skillTargets', 'attrModes', 'attrTargets']) delete old[key];
  }
  await action(page, 'import').click();
  await page.locator('#savebox').fill(Buffer.from(JSON.stringify(legacy), 'utf8').toString('base64'));
  await action(page, 'doimport').click();
  await expect(page.locator('#sheet')).toBeHidden();
  const migrated = await exportCode(page);
  expect(migrated.v).toBe(9);
  expect(migrated.world).toBe(0);
  const migratedWorld = migrated.worlds[migrated.world];
  expect(migratedWorld.slots[migratedWorld.cur]).toMatchObject({
    v: 8, uid: active.uid, horse: active.horse, sk: slot.sk, skills: slot.skills, inv: slot.inv, eq: slot.eq, bank: slot.bank,
  });
  expect(migratedWorld.slots[other]).toMatchObject({
    v: 8, uid: expect.stringMatching(/\S/), horse: { owned: false, mounted: false },
    name: 'Old companion', attr: { str: 35, dex: 60, int: 25 }, mana: 25, stamina: 60, bank: { gold: 79 },
  });
  expect(errors).toEqual([]);
});

test('skill system · a warrior bandages and spends stamina on a damaging technique', async ({ page }, info) => {
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.sk = { swords: 55, tactics: 34, anatomy: 25, healing: 35, parrying: 40 };
    s.attr = { str: 60, dex: 60, int: 25 };
    s.hp = 28; s.stamina = Progression.maxStamina(s); s.mana = 5; s.bandages = 2;
    for (const e of Scene.ents()) {
      if (e.kind !== 'mon') continue;
      e.agg = false;
      if (e.r === 1 && e.inst.tpl === 'b101' && !e.inst.elite && !e.inst.lair) e.testBandageFight = true;
    }
    const sword = __bw.makeItem('common', 1, 'weapon', 'swords');
    const shield = __bw.makeItem('common', 1, 'shield');
    s.inv.push(sword, shield); s.eq = { weapon: sword.id, shield: shield.id };
    Techniques.teach(s, 1);
    if (!__bw.Combat.equip('swords.cross-cut', 0).ok) throw Error('Could not equip Cross Cut');
  });
  await standBy(f, 'mon', { testBandageFight: true });
  await f.evaluate(() => { const e = window.__skillNearby; e.combat.hp = e.combat.max = 1200; });
  const bandage = combat(f, 'supply');
  await expect(bandage).toContainText('Bandage');
  await beginCombat(f, 'supply');
  await expect(f.locator('#fight .f-head b').first()).toHaveText('Bandage');
  await expect(f.locator('#f-odds')).toHaveText('1 Circle SQL · Paused');
  await action(f, 'queryhelp').click();
  await expect(action(f, 'fhint')).toHaveText('Hint · reduced power');
  await action(f, 'queryhelp').click();
  await screenshot(page, info, 'bandage-prompt');
  const beforeFirstBandage = await f.evaluate(() => __bw.S.stamina);
  const healed = await submit(f, 'F', { roll: .02 });
  expect(healed.stamina).toBe(beforeFirstBandage);
  await expect(f.locator('#combat-result')).toContainText('Restored');
  const bandaged = await f.evaluate(() => ({
    hp: __bw.S.hp, healing: __bw.S.sk.healing, mana: __bw.S.mana, bandages: __bw.S.bandages,
  }));
  expect(bandaged.hp).toBeGreaterThan(28);
  expect(bandaged.healing).toBeGreaterThan(35);
  expect(bandaged).toMatchObject({ mana: 5, bandages: 1 });
  await beginCombat(f, 'supply');
  const beforeBandage = await f.evaluate(() => __bw.S.stamina);
  const wrongBandage = await submit(f, 'F', { sql: wrongSQL, roll: .99 });
  expect(wrongBandage.stamina).toBe(beforeBandage);
  await expect(f.locator('#combat-result')).toContainText('The query gives no useful effect.');
  expect(await f.evaluate(() => ({
    hp: __bw.S.hp, healing: __bw.S.sk.healing, mana: __bw.S.mana, bandages: __bw.S.bandages,
  }))).toEqual({ ...bandaged, bandages: 0 });
  await expect(bandage).toBeDisabled();

  const cut = 'swords.cross-cut';
  await expect(combat(f, cut)).toContainText('Cross Cut');
  await beginCombat(f, cut);
  await expect(f.locator('#f-odds')).toHaveText('2 Circle SQL · Paused');
  await expect(f.locator('#kb [data-fn=run]')).toHaveText('Cross Cut');
  const before = await f.evaluate(() => __bw.S.stamina);
  const committed = await submit(f, 'F', { roll: .02 });
  expect(committed.stamina).toBe(before - 7);
  const result = await f.evaluate(() => ({ foe: __bw.F.foe.hp, tactics: __bw.S.sk.tactics }));
  expect(result.foe).toBeLessThan(1200);
  await expect(f.locator('#combat-result')).toContainText('Cross Cut dealt ' + (1200 - result.foe) + ' damage.');
  expect(result.tactics).toBeGreaterThan(34);

  await withRoll(f, .02, async () => {
    const hp = await f.evaluate(() => {
      const enemy = window.__skillNearby;
      enemy.combat.windup = .15;
      window.__skillBlocked = false;
      const hit = Scene.FX.hit;
      Scene.FX.hit = (target, text, ...args) => {
        if (target === 'me' && text === 'blocked') window.__skillBlocked = true;
        return hit(target, text, ...args);
      };
      return __bw.S.hp;
    });
    await f.waitForFunction(() => window.__skillBlocked);
    expect(await f.evaluate(() => __bw.S.hp)).toBe(hp);
  });
  expect(await f.evaluate(() => __bw.S.sk.parrying)).toBeGreaterThan(40);
  await screenshot(page, info, 'warrior-technique');
  expect(errors).toEqual([]);
});

test('skill system · craft and install furniture, then spend a prepared scroll to cast a ward', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.pages = { c1: 1 };
    s.mats[1] = 11;
    s.sk = { magery: 70, eval: 30, inscription: 32, meditation: 35, carpentry: 35, resisting: 30 };
    s.attr = { str: 80, dex: 35, int: 80 }; s.hp = 90; s.mana = 2; s.stamina = 5;
    s.prepared = 0; s.furniture = {};
    const [x, y] = Scene.towns()[1];
    s.homes.push({ id: 'tested-home', name: 'Workshop Cottage', r: 1, x: x + 55, y: y - 38, w: 6, h: 4,
      shape: 9, mat: 1, wall: '#8c7858', roof: '#633a2c', chest: [] });
    Scene.restoreHomes(s.homes);
  });
  for (const [id, result] of [['chest', 'Storage chest crafted'], ['spellscroll', 'Prepared spell scroll crafted']]) {
    await standBy(f, 'bench');
    await action(f, 'profession', `[data-id=${id}]`).click();
    await submit(f, 'Q');
    await expect(f.locator('#enc')).toContainText(result);
    await continueQuery(f);
  }
  expect(await f.evaluate(() => [__bw.S.mats[1], __bw.S.furniture.chest, __bw.S.prepared])).toEqual([2, 1, 1]);
  await standBy(f, 'myhome', { hid: 'tested-home' });
  await expect(f.locator('#sheet')).toContainText('Workshop Cottage');
  await action(f, 'installfurniture', '[data-id=chest]').click();
  await expect(action(f, 'installfurniture', '[data-id=chest]')).toHaveCount(0);
  expect(await f.evaluate(() => [__bw.S.homes.find(h => h.id === 'tested-home').xch, __bw.S.furniture.chest])).toEqual([1, 0]);
  await screenshot(page, info, 'furnished-home');
  await f.locator('.sheet-x').click();

  await f.evaluate(() => {
    const s = __bw.S;
    for (const e of Scene.ents()) {
      if (e.kind !== 'mon') continue;
      e.agg = 0;
      if (e.r === 1 && e.inst.tpl === 'b104' && !e.inst.elite && !e.inst.lair) e.testWardCaster = true;
    }
    Techniques.teach(s, 3);
    if (!__bw.Combat.equip('magery.ward', 0).ok) throw Error('Could not equip Ward');
  });
  await standBy(f, 'mon', { testWardCaster: true });
  await f.evaluate(() => {
    const e = window.__skillNearby;
    e.combat.hp = e.combat.max = 1200;
    Scene.combatEngage(e);
    e.combat.cooldown = 30;
  });
  await beginCombat(f, 'recover');
  const before = await f.evaluate(() => {
    __bw.S.stamina = 5;
    return { mana: __bw.S.mana, stamina: __bw.S.stamina };
  });
  const recovered = await submit(f, 'F', { roll: .02 });
  const meditation = await f.evaluate(() => __bw.S.sk.meditation);
  expect(recovered.mana).toBe(before.mana + Math.round(8 + meditation * .2 + 80 * .08));
  expect(recovered.stamina).toBe(before.stamina + 12);
  await expect(f.locator('#combat-result')).toContainText('Recovered ' + (recovered.mana - before.mana) + ' mana and 12 stamina.');
  expect(meditation).toBeGreaterThan(35);

  // Use the real low-mana fallback for the scroll earned at the bench.
  const costs = await f.evaluate(() => {
    const spark = __bw.Combat.descriptor('basic.magery').mana;
    const ward = __bw.Combat.descriptor('magery.ward').mana;
    __bw.S.mana = spark + 1;
    return { spark, ward, mana: __bw.S.mana };
  });
  expect(costs.mana).toBeLessThan(costs.ward);
  await beginCombat(f, 'magery.ward');
  await expect(f.locator('#fight .f-head b').first()).toHaveText('Ward');
  await expect(f.locator('#f-odds')).toHaveText('2 Circle SQL · Paused');
  await screenshot(page, info, 'ward-prompt');
  await submit(f, 'F', { roll: .02 });
  await expect(f.locator('#combat-result')).toContainText('Protection holds for five seconds of active combat.');
  expect(await f.evaluate(() => ({ prepared: __bw.S.prepared, mana: __bw.S.mana }))).toEqual({ prepared: 0, mana: costs.mana });
  await screenshot(page, info, 'prepared-ward');

  // Time two ordinary caster strikes against the same player and input roll.
  async function casterHit() {
    return withRoll(f, .02, async () => {
      const initial = await f.evaluate(() => {
        const e = window.__skillNearby;
        Scene.combatEngage(e);
        e.combat.round = 0;
        e.combat.windup = .12;
        return __bw.S.hp;
      });
      await f.waitForFunction(hp => __bw.S.hp < hp, initial);
      return initial - await f.evaluate(() => __bw.S.hp);
    });
  }
  const protectedDamage = await casterHit();
  await f.evaluate(() => {
    window.__skillNearby.combat.cooldown = 30;
    window.__skillWardExpires = Scene.tacticalTime() + 5000;
  });
  await f.waitForFunction(() => Scene.tacticalTime() >= window.__skillWardExpires);
  expect(protectedDamage).toBeLessThan(await casterHit());
  expect(await f.evaluate(() => __bw.S.sk.resisting)).toBeGreaterThan(30);

  await beginCombat(f, 'basic.magery');
  await submit(f, 'F', { roll: .02 });
  const cast = await f.evaluate(() => ({ mana: __bw.S.mana, foe: __bw.F.foe.hp, eval: __bw.S.sk.eval }));
  expect(cast.mana).toBe(costs.mana - costs.spark);
  expect(cast.foe).toBeLessThan(1200);
  expect(cast.eval).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test('skill system · optional locks disarm or force through queries and can be retried after failure', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), f = await adventure(page);
  const pair = await f.evaluate(() => {
    __bw.S.sk.lockpicking = 30; __bw.S.sk.tactics = 30;
    return Scene.ents().filter(e => e.kind === 'cache' && e.r === 1).map(e => e.cid);
  });
  expect(pair.length).toBeGreaterThanOrEqual(2);
  const first = await standBy(f, 'cache');
  await expect(f.locator('#sheet')).toContainText('A locked container');
  await action(f, 'lockwork', '[data-kind=lock]').click();
  const before = await f.evaluate(() => __bw.S.hp);
  await submit(f, 'Q', { sql: wrongSQL, roll: .99 });
  await expect(f.locator('#enc')).toContainText('The lock holds');
  expect(await f.evaluate(id => ({ hp: __bw.S.hp, skill: __bw.S.sk.lockpicking, looted: !!__bw.S.cache[id] }), first.id))
    .toEqual({ hp: before - 2, skill: 30, looted: false });
  await continueQuery(f);
  await standBy(f, 'cache', { cid: first.id });
  await action(f, 'lockwork', '[data-kind=lock]').click();
  await submit(f, 'Q');
  await expect(f.locator('#enc')).toContainText('trap is disarmed');
  await screenshot(page, info, 'lockpicking-result');
  await continueQuery(f);
  await expect(f.locator('#sheet')).toContainText('An old chest');
  expect(await f.evaluate(id => !!__bw.S.cache[id] && __bw.S.sk.lockpicking > 30, first.id)).toBe(true);
  await f.locator('#sheet [data-a=closesheet]').last().click();

  const second = pair.find(id => id !== first.id);
  await standBy(f, 'cache', { cid: second });
  await action(f, 'lockwork', '[data-kind=force]').click();
  await submit(f, 'Q');
  await expect(f.locator('#enc')).toContainText('The lock gives way');
  await continueQuery(f);
  await expect(f.locator('#sheet')).toContainText('An old chest');
  expect(await f.evaluate(id => !!__bw.S.cache[id] && __bw.S.sk.tactics > 30, second)).toBe(true);
  expect(errors).toEqual([]);
});

test('skill system · SQL concealment spends steps on a real approach and running reveals the player', async ({ page }, info) => {
  const errors = observeErrors(page), f = await adventure(page);
  const route = await f.evaluate(() => {
    const { map } = Scene.debug();
    const s = __bw.S;
    s.sk.hiding = 45; s.sk.stealth = 25;
    const dirs = [[1, 0, 's', 'ArrowRight'], [-1, 0, 'l', 'ArrowLeft'], [0, 1, 'f', 'ArrowDown'], [0, -1, 'b', 'ArrowUp']];
    for (const target of map.ents) {
      if (target.kind !== 'mon' || target.r !== 1 || target.inst.tpl !== 'b102') continue;
      for (const [dx, dy, dir, key] of dirs) {
        const cells = [3, 2, 1].map(n => [target.x - n * dx, target.y - n * dy]);
        if (!cells.every(([x, y]) => {
          const i = y * map.w + x;
          return map.reg[i] === 1 && !map.solid[i] && !map.occ.has(i) && map.t[i] !== 4;
        })) continue;
        // Keep the gull facing away, with its normal detection still active.
        Object.assign(target, { wander: 1, dir, t: 120, calm: 120, agg: 0, chase: 0, alert: 0 });
        Scene.hop(...cells[0]);
        return { cells, dx, dy, key };
      }
    }
    throw Error('No clear approach to a Tallyport gull');
  });
  await expect(combat(f, 'hide')).toHaveText('Hide');
  await combat(f, 'hide').click();
  await submit(f, 'Q');
  await expect(f.locator('#enc')).toContainText('You are concealed');
  await continueQuery(f);
  await expect(combat(f, 'hide')).toHaveText('Reveal · 6 steps');
  expect(await f.evaluate(() => __bw.CONCEAL.steps)).toBe(6);
  await f.waitForTimeout(650);
  expect(await f.evaluate(() => [Scene.pos(), __bw.S.sk.stealth])).toEqual([route.cells[0], 25]);

  await f.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  await withRoll(f, 0, async () => {
    await page.keyboard.down(route.key);
    try { await f.waitForFunction(() => __bw.CONCEAL.steps===5); }
    finally { await page.keyboard.up(route.key); }
    await expect.poll(() => f.evaluate(() => Scene.pos())).toEqual(route.cells[1]);
  });
  await expect(combat(f, 'hide')).toHaveText('Reveal · 5 steps');
  expect(await f.evaluate(() => __bw.CONCEAL.steps)).toBe(5);
  const trained = await f.evaluate(() => __bw.S.sk.stealth);
  expect(trained).toBeGreaterThan(25);
  await f.waitForTimeout(650);
  expect(await f.evaluate(() => __bw.S.sk.stealth)).toBe(trained);
  await screenshot(page, info, 'stealth-step-budget');

  const stick = f.getByRole('group', { name: 'Movement joystick' });
  const box = await stick.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  const radius = Math.min(box.width, box.height) * .42;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await page.mouse.move(x + route.dx * radius, y + route.dy * radius);
    await expect(stick).toHaveAttribute('data-mode', 'run');
    await expect(combat(f, 'hide')).toHaveText('Hide');
    await f.waitForFunction(at=>Scene.pos().every((n,i)=>n===at[i]),route.cells[2]);
  } finally { await page.mouse.up(); }
  expect(await f.evaluate(() => [Scene.pos(), __bw.S.sk.stealth])).toEqual([route.cells[2], trained]);
  expect(errors).toEqual([]);
});

test('skill system · an unaffordable spell grants no query credit or free training', async ({ page }) => {
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.mana = 3; s.prepared = 0; s.sk.magery = 32;
    for (const e of Scene.ents()) if (e.kind === 'mon') e.agg = 0;
  });
  await standBy(f, 'mon');
  await beginCombat(f, 'basic.magery');
  const credit = () => f.evaluate(() => ({
    stats: __bw.S.stats, streak: __bw.S.streak, best: __bw.S.best,
    skills: __bw.S.skills, sk: __bw.S.sk, round: __bw.F.round, hp: __bw.F.foe.hp,
  }));
  const before = await credit();
  const sql = await f.evaluate(() => { __bw.S.mana = 0; return __bw.F.task.sql; });
  await f.locator('#sql').fill(sql);
  await f.locator('#kb [data-fn=run]').click();
  await expect(f.locator('#toast')).toContainText('Not enough mana for that action.');
  expect(await credit()).toEqual(before);
  await action(f, 'combatback').click();
  await expect(combat(f, 'basic.magery')).toBeDisabled();
  await expect(combat(f, 'basic.magery')).toHaveAccessibleName(/Not enough mana/);
  await expect(combat(f, 'recover')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('skill system · movement pauses during boss SQL and resumes with live pursuit', async ({ page }, info) => {
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.sk.swords = 80;
    s.hp = __bw.maxHp();
    const sword = __bw.makeItem('common', 1, 'weapon', 'swords');
    s.inv.push(sword);
    s.eq.weapon = sword.id;
  });
  await standBy(f, 'boss');
  await action(f, 'start', '[data-k=boss]').click();
  await beginCombat(f, 'basic.swords');
  const initial = await f.evaluate(() => {
    const { map, P } = Scene.debug(), enemy = __bw.F.ent;
    const directions = [['ArrowRight', 1, 0], ['ArrowLeft', -1, 0], ['ArrowDown', 0, 1], ['ArrowUp', 0, -1]];
    const away = directions.find(([, dx, dy]) => {
      const x = P.x + dx, y = P.y + dy, i = y * map.w + x;
      return !map.solid[i] && !map.occ.has(i) && Math.hypot(x - enemy.x, y - enemy.y) > 1;
    });
    if (!away) throw Error('Boss approach has no adjacent retreat tile');
    return { hp: __bw.S.hp, swords: __bw.S.sk.swords, feet: [P.fx, P.fy], key: away[0], enemy: enemy.id };
  });
  await f.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  await page.keyboard.down(initial.key);
  try {
    await f.waitForTimeout(300);
    expect(await f.evaluate(() => {
      const { P } = Scene.debug();
      return { hp: __bw.S.hp, feet: [P.fx, P.fy], paused: __bw.Combat.snapshot().worldPaused };
    })).toEqual({ hp: initial.hp, feet: initial.feet, paused: true });
  } finally { await page.keyboard.up(initial.key); }
  await screenshot(page, info, 'boss-movement-paused-during-sql');
  await submit(f, 'F', { roll: .02 });
  await expect(f.locator('#fight')).toBeHidden();
  expect(await f.evaluate(() => ({ round: __bw.F.round, paused: Boolean(__bw.Combat.snapshot().worldPaused) })))
    .toEqual({ round: 1, paused: false });
  expect(await f.evaluate(() => __bw.S.sk.swords)).toBeGreaterThan(initial.swords);
  await withRoll(f, .02, async () => f.waitForFunction(hp => __bw.S.hp < hp, initial.hp));

  await page.keyboard.down(initial.key);
  try {
    await f.waitForFunction(feet => {
      const { P } = Scene.debug();
      return Math.hypot(P.fx - feet[0], P.fy - feet[1]) > .5;
    }, initial.feet);
  } finally { await page.keyboard.up(initial.key); }
  await standBy(f, 'mon');
  expect(await f.evaluate(() => {
    const e = window.__skillNearby;
    return { target: __bw.Combat.snapshot().target.id, queries: e.combat.queries };
  })).toEqual({ target: await f.evaluate(() => window.__skillNearby.id), queries: 0 });
  expect(await f.evaluate(() => __bw.Combat.snapshot().target.id)).not.toBe(initial.enemy);
  expect(errors).toEqual([]);
});

async function theftTarget(f, elite) {
  await f.evaluate(elite=>{
    for(const target of Scene.ents()) if(target.kind==='mon') target.agg=false;
    for(const target of Scene.ents().filter(e=>e.kind==='mon'&&e.r===1&&!e.inst.lair&&e.inst.tpl[0]==='b'&&CreatureLoot.carries(e))) {
      target.testTheftCandidate=true;
      target.inst.elite=elite;
    }
    __bw.S.pages={h1:1};
    Object.assign(__bw.S.sk,{stealing:40,hiding:40,swords:100,fencing:100});
    const sword=__bw.makeItem('rare',1,'weapon','swords');
    __bw.S.inv.push(sword);__bw.S.eq.weapon=sword.id;
  },elite);
  await standBy(f,'mon',{testTheftCandidate:true});
  await f.evaluate(()=>{
    window.__theftTarget=window.__skillNearby;
    window.__theftTarget.testTheftTarget=true;
    window.__theftTarget.unseen=true;
  });
}

const theftPayout = f => f.evaluate(()=>({
  gold:__bw.S.gold,mats:__bw.S.mats[1]||0,sigils:__bw.S.mats.sigil||0,
  items:__bw.S.inv.length,steals:__bw.S.stats.steals,kills:__bw.S.stats.kills,
}));

for(const prize of [false,true]) {
  test(`skill system · a successful ${prize?'prize':'purse'} lift exhausts a living elite's theft rewards`,async({page},info)=>{
    const errors=observeErrors(page),f=await adventure(page);
    await theftTarget(f,true);
    const before=await theftPayout(f);
    await beginCombat(f,'steal');
    if(prize)await action(f,'fprize','[data-id=prize]').click();
    await submit(f,'F',{next:'fdone',roll:.01});
    await expect(f.locator('#f-after')).toContainText('Clean lift');
    await action(f,'fdone').click();
    const lifted=await theftPayout(f);
    expect(lifted.gold-before.gold).toBe(prize?16:32);
    expect(lifted.mats-before.mats).toBe(6);
    expect(lifted.sigils-before.sigils).toBe(1);
    expect(lifted.items-before.items).toBe(prize?1:0);
    expect(lifted.steals-before.steals).toBe(1);

    // Re-enter the surface with the same live entity and a fresh unseen approach.
    const at=await f.evaluate(()=>Scene.pos());
    await f.evaluate(at=>Scene.load(at,1),at);
    await standBy(f,'mon',{testTheftTarget:true});
    await expect(combat(f,'steal')).toHaveCount(0);
    await expect(f.locator('#combat-target')).toBeVisible();
    if(!prize)await screenshot(page,info,'lifted-purse');
    expect(await f.evaluate(()=>{
      const e=window.__theftTarget;
      const rejected=!__bw.Combat.begin('steal');
      return {same:__bw.Combat.snapshot().target.id===e.id,living:!e.dead,pocketsEmpty:e.pocketsEmpty,rejected};
    })).toEqual({same:true,living:true,pocketsEmpty:true,rejected:true});
    expect(await theftPayout(f)).toEqual(lifted);

    if(!prize) {
      const loot = action(f, 'floot');
      for (let turns = 0; turns < 6 && !await loot.isVisible(); turns++) {
        await beginCombat(f, 'basic.swords');
        await submit(f, 'F');
      }
      await expect(loot).toBeVisible();
      const corpse=await f.evaluate(()=>{
        const target=window.__theftTarget;
        return {dead:target.dead,gold:target.loot.gold,mats:target.loot.mats[1],sigils:target.loot.sigils,items:target.loot.items.length};
      });
      expect(corpse).toEqual({dead:1,gold:16,mats:3,sigils:1,items:1});
      await action(f,'floot').click();
      await expect(f.locator('#sheet')).toContainText('Brass Sigil');
      await coach(f);
      await action(f,'lootall').click();
      const killed=await theftPayout(f);
      expect(killed.kills-lifted.kills).toBe(1);
      expect(killed.sigils-lifted.sigils).toBe(1);

      // Expire the real timer. Force one unavailable placement, then reopen
      // exactly the same ground; the live queue must retain and retry its slot.
      await f.evaluate(()=>{
        const { map } = Scene.debug(), terr = window.__theftTarget.terr;
        const [townX, townY] = Scene.towns()[1], minimum = (terr.rad || 7) * Math.SQRT2 + 5;
        const tiles = Array.from({ length: 21 * 21 }, (_, i) => [townX + i % 21 - 10, townY + Math.floor(i / 21) - 10]);
        const safe = tiles.find(([x, y]) => {
          const i = y * map.w + x;
          return Geography.inTown(x, y) && Math.hypot(x - terr.x, y - terr.y) >= minimum &&
            !map.solid[i] && !map.occ.has(i) && map.t[i] !== 4;
        });
        if (!safe) throw Error('No clear town tile beyond the respawn radius');
        Scene.hop(...safe);
        window.__beforeRespawn = new Set(map.ents);
        window.__respawnBlocked = [];
        const radius = Math.ceil(terr.rad || 7);
        for (let y=terr.y-radius;y<=terr.y+radius;y++) for (let x=terr.x-radius;x<=terr.x+radius;x++) {
          if (x<0 || y<0 || x>=map.w || y>=map.h) continue;
          const i=y*map.w+x; __respawnBlocked.push([i,map.keep[i]]); map.keep[i]=1;
        }
        map.respawn.find(entry => entry.terr === terr).t = 0;
      });
      try {
        await f.waitForFunction(()=>Scene.debug().map.respawn.some(entry=>entry.terr===window.__theftTarget.terr&&entry.t>0));
        expect(await f.evaluate(()=>Scene.ents().some(e=>e.kind==='mon'&&e.terr===window.__theftTarget.terr&&!window.__beforeRespawn.has(e)))).toBe(false);
      } finally {
        await f.evaluate(()=>{const {map}=Scene.debug();for(const [i,value] of __respawnBlocked)map.keep[i]=value;delete window.__respawnBlocked;});
      }
      await f.waitForFunction(()=>Scene.ents().some(e=>e.kind==='mon'&&e.terr===window.__theftTarget.terr&&!window.__beforeRespawn.has(e)));
      await f.evaluate(()=>{
        const newcomer=Scene.find(e=>e.kind==='mon'&&e.terr===window.__theftTarget.terr&&!window.__beforeRespawn.has(e));
        newcomer.testTheftNewcomer=true;newcomer.agg=0;newcomer.unseen=true;
      });
      await standBy(f,'mon',{testTheftNewcomer:true});
      await beginCombat(f,'steal');
      await submit(f,'F',{next:'fdone'});
      await expect(f.locator('#f-after')).toContainText('Clean lift');
      expect((await theftPayout(f)).steals-killed.steals).toBe(1);
    }
    expect(errors).toEqual([]);
  });
}

test('skill system · a failed ordinary theft starts live pursuit after closing the result', async ({ page }) => {
  const errors = observeErrors(page), f = await adventure(page);
  await theftTarget(f, false);
  const before = await theftPayout(f);
  await beginCombat(f, 'steal');
  await submit(f, 'F', { next: 'fdone', sql: wrongSQL, roll: .99 });
  await expect(f.locator('#f-after')).toContainText('It comes after you.');
  expect(await theftPayout(f)).toEqual({ ...before, gold: before.gold - 5 });
  const hp = await f.evaluate(() => __bw.S.hp);
  await action(f, 'fdone').click();
  expect(await f.evaluate(() => {
    const e = window.__theftTarget, combat = __bw.Combat.snapshot();
    return { pursuit: e.combat.phase, hp: __bw.S.hp, paused: combat.worldPaused, active: combat.active, target: combat.target.id === e.id };
  })).toEqual({ pursuit: 'chase', hp, paused: false, active: true, target: true });
  await expect(f.locator('#fight')).toBeHidden();
  await withRoll(f, .02, async () => f.waitForFunction(before => __bw.S.hp < before, hp));
  expect(errors).toEqual([]);
});

test('skill system · a newer cloud save cancels combat and migrates every character', async ({page})=>{
  await page.addInitScript(()=>{
    const db={doc:path=>path.endsWith('/save')?{get:async()=>({exists:false})}:{get:async()=>({exists:true,data:()=>({json:JSON.stringify(window.__skillRemote)})}),set:async()=>{}}};
    window.claude={use:async kind=>kind==='db'?await new Promise(resolve=>{window.__provideSkillCloud=()=>resolve(db);}):{id:async()=>'skill-cloud-fixture'}};
  });
  const errors=observeErrors(page),f=await adventure(page);
  await f.evaluate(()=>{
    __bw.S.pages={a1:1};__bw.S.sk.swords=80;__bw.S.hp=__bw.maxHp();
    const sword=__bw.makeItem('common',1,'weapon','swords');
    __bw.S.inv.push(sword);__bw.S.eq.weapon=sword.id;
    __bw.save();
    const stored=JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const remote={...stored.worlds[stored.world],v:7,rev:stored.rev+10000,at:stored.at};
    const active=remote.slots[remote.cur];active.v=6;active.bank.gold=321;
    for(const key of ['attr','mana','stamina','skillModes','skillTargets','attrModes','attrTargets'])delete active[key];
    remote.slots[(remote.cur+1)%5]={...structuredClone(active),name:'Cloud companion',path:'thief'};
    window.__skillRemote=remote;
  });
  await standBy(f,'mon');
  await beginCombat(f,'basic.swords');
  const before=await f.evaluate(()=>{
    window.__oldSkillFoe=__bw.F.ent;
    return {queries:__bw.S.stats.q,hp:__bw.F.foe.hp};
  });
  await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));
  expect(await f.evaluate(()=>__bw.Combat.snapshot().worldPaused)).toBe(true);
  await f.evaluate(()=>window.__provideSkillCloud());
  await expect(f.locator('#fight')).toBeHidden();await expect(f.locator('#hud')).toBeVisible();
  await expect(f.locator('#app')).not.toHaveClass(/infight/);
  await f.waitForTimeout(1200);
  expect(await f.evaluate(()=>({queries:__bw.S.stats.q,hp:window.__oldSkillFoe.combat.hp}))).toEqual(before);
  expect(await f.evaluate(()=>({account:__bw.A.v,world:__bw.A.world,bank:__bw.S.bank.gold,fight:__bw.F,busy:window.__oldSkillFoe.busy,
    characters:__bw.A.slots.filter(Boolean).map(({v,uid,horse})=>({v,uid,horse})),companion:__bw.A.slots.find(s=>s&&s.name==='Cloud companion').attr})))
    .toEqual({account:9,world:0,bank:321,fight:null,busy:0,characters:Array.from({length:2},()=>({
      v:8,uid:expect.stringMatching(/\S/),horse:{owned:false,mounted:false},
    })),companion:{str:35,dex:60,int:25}});
  expect(errors).toEqual([]);
});
