const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

const action = (f, name, attrs = '') => f.locator(`[data-a=${name}]${attrs}`);

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
        if (map.ents.some(other => other !== e && !other.hidden && Math.abs(other.x - x) + Math.abs(other.y - y) <= 1)) continue;
        Scene.hop(x, y);
        return { name: e.name, id: e.cid || e.hid || e.fid, at: [x, y] };
      }
    }
    throw Error('No safe approach for ' + kind + ' ' + JSON.stringify(fields));
  }, { kind, fields });
  expect(await f.evaluate(() => Scene.pos())).toEqual(destination.at);
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
  try { await execute(); }
  finally {
    await f.evaluate(() => {
      Math.random = window.__skillTestRandom;
      delete window.__skillTestRandom;
    });
  }
}

async function submit(f, surface, { sql, roll = 0 } = {}) {
  if (sql === undefined) sql = await f.evaluate(surface => __bw[surface].task.sql, surface);
  await f.locator('#sql').fill(sql);
  await withRoll(f, roll, async () => {
    await f.locator('#kb [data-fn=run]').click();
    if (surface === 'F') await expect(action(f, 'fchoose')).toBeVisible();
    else if (surface === 'FI') await expect(action(f, 'fiagain')).toBeVisible();
    else await expect(f.locator('#enc .q-foot [data-a=qleave]')).toBeVisible();
  });
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
  const active = exported.slots[exported.cur];
  expect(exported.v).toBe(8);
  expect(active).toMatchObject({ v: 7, skillModes: { fishing: 'lock', swords: 'down' }, skillTargets: { fishing: 20.1 }, attrTargets: { dex: 40.2 } });

  // Navigate away from the visual fixture so its disposable reset does not run again.
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await action(page, 'playslot', `[data-i="${exported.cur}"]`).click();
  await expect(page.locator('#title')).toBeHidden();
  await tab(page, 'hero');
  await expect(progressMode(page, 'fishing')).toHaveText('Locked');
  await expect(page.getByRole('spinbutton', { name: 'Dexterity stop target' })).toHaveValue('40.2');

  const legacy = structuredClone(exported);
  legacy.v = 7;
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
  expect(migrated.v).toBe(8);
  expect(migrated.slots[migrated.cur]).toMatchObject({ v: 7, sk: slot.sk, skills: slot.skills, inv: slot.inv, eq: slot.eq, bank: slot.bank });
  expect(migrated.slots[other]).toMatchObject({ v: 7, name: 'Old companion', attr: { str: 35, dex: 60, int: 25 }, mana: 25, stamina: 60, bank: { gold: 79 } });
  expect(errors).toEqual([]);
});

test('skill system · a warrior bandages and spends stamina on a damaging maneuver', async ({ page }, info) => {
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.pages = { a1: 1 };
    s.sk = { swords: 32, tactics: 34, anatomy: 25, healing: 35, parrying: 40 };
    s.attr = { str: 60, dex: 60, int: 25 }; s.hp = 28; s.stamina = 40;
    const sword = __bw.makeItem('common', 1, 'weapon', 'swords');
    const shield = __bw.makeItem('common', 1, 'shield');
    s.inv.push(sword, shield); s.eq = { weapon: sword.id, shield: shield.id };
  });
  await standBy(f, 'mon');
  await expect(f.locator('#fight')).toBeVisible();
  // Give this foe room to survive the demonstrated full attack sequence.
  await f.evaluate(() => { __bw.F.foe.hp = __bw.F.foe.max = 1200; });
  await action(f, 'futility', '[data-id=bandage]').click();
  await coach(f);
  await submit(f, 'F', { roll: .99 });
  await expect(f.locator('#f-after')).toContainText('Bandaged');
  expect(await f.evaluate(() => __bw.S.hp)).toBeGreaterThan(28);
  expect(await f.evaluate(() => __bw.S.sk.healing)).toBeGreaterThan(35);
  await action(f, 'fchoose').click();
  const stamina = await f.evaluate(() => __bw.S.stamina);
  await action(f, 'fstance', '[data-id=cleave]').click();
  await action(f, 'fpage', '[data-id=a1]').click();
  await coach(f);
  await submit(f, 'F', { roll: .02 });
  const result = await f.evaluate(() => ({ stamina: __bw.S.stamina, foe: __bw.F.foe.hp, tactics: __bw.S.sk.tactics }));
  expect(result.stamina).toBe(stamina - 4);
  expect(result.foe).toBeLessThan(1200);
  expect(result.tactics).toBeGreaterThan(34);
  await expect(f.locator('#e-sw')).toContainText('blocked');
  expect(await f.evaluate(()=>__bw.S.sk.parrying)).toBeGreaterThan(40);
  await screenshot(page, info, 'warrior-maneuver');
  expect(errors).toEqual([]);
});

test('skill system · craft and install furniture, then spend a prepared scroll to cast a ward', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), f = await adventure(page);
  await f.evaluate(() => {
    const s = __bw.S;
    s.pages = { s1: 1, c1: 1 };
    s.mats[1] = 11;
    s.sk = { magery: 32, eval: 30, inscription: 32, meditation: 35, carpentry: 35, resisting:30 };
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

  await standBy(f, 'mon');
  await f.evaluate(() => { __bw.F.foe.hp = __bw.F.foe.max = 1200; __bw.F.drole='caster'; });
  await action(f, 'futility', '[data-id=recover]').click();
  await coach(f);
  await submit(f, 'F', { roll: .99 });
  await expect(f.locator('#f-after')).toContainText('mana and stamina');
  const recovered = await f.evaluate(() => ({ mana: __bw.S.mana, stamina: __bw.S.stamina, meditation: __bw.S.sk.meditation }));
  expect(recovered.mana).toBeGreaterThan(5);
  expect(recovered.stamina).toBeGreaterThan(5);
  expect(recovered.meditation).toBeGreaterThan(35);
  expect(await f.evaluate(()=>__bw.S.sk.resisting)).toBeGreaterThan(30);
  await action(f, 'fchoose').click();
  await action(f, 'fscroll').click();
  await expect(action(f, 'fscroll')).toHaveText('Scroll selected');
  await action(f, 'futility', '[data-id=ward]').click();
  await coach(f);
  await submit(f, 'F', { roll: .99 });
  await expect(f.locator('#f-after')).toContainText('Ward reduces');
  expect(await f.evaluate(() => [__bw.S.prepared, __bw.S.mana])).toEqual([0, recovered.mana + 2]);
  await screenshot(page, info, 'prepared-ward');
  await action(f, 'fchoose').click();
  await expect(action(f, 'fscroll')).toHaveCount(0);
  await action(f, 'fpage', '[data-id=s1]').click();
  await coach(f);
  await submit(f, 'F', { roll: .02 });
  const cast = await f.evaluate(() => ({ mana: __bw.S.mana, foe: __bw.F.foe.hp, eval: __bw.S.sk.eval }));
  expect(cast.mana).toBe(recovered.mana - 1);
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
  await action(f, 'conceal').click();
  await submit(f, 'Q');
  await expect(f.locator('#enc')).toContainText('You are concealed');
  await continueQuery(f);
  await expect(action(f, 'conceal')).toContainText('6 steps');
  await f.waitForTimeout(650);
  expect(await f.evaluate(() => [Scene.pos(), __bw.S.sk.stealth])).toEqual([route.cells[0], 25]);

  await f.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  await withRoll(f, 0, async () => {
    await page.keyboard.down(route.key);
    try { await f.waitForFunction(() => Scene.traveling()); }
    finally { await page.keyboard.up(route.key); }
    await expect.poll(() => f.evaluate(() => Scene.pos())).toEqual(route.cells[1]);
  });
  await expect(action(f, 'conceal')).toContainText('5 steps');
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
    await expect(action(f, 'conceal')).toHaveText('Hide · SQL');
  } finally { await page.mouse.up(); }
  expect(await f.evaluate(() => [Scene.pos(), __bw.S.sk.stealth])).toEqual([route.cells[2], trained]);
  expect(errors).toEqual([]);
});

test('skill system · an unaffordable spell grants no query credit or free training', async ({page})=>{
  const errors=observeErrors(page),f=await adventure(page);
  await f.evaluate(()=>{__bw.S.pages={s1:1};__bw.S.mana=0;__bw.S.prepared=0;__bw.S.sk.magery=32;});
  await standBy(f,'mon');await action(f,'fpage','[data-id=s1]').click();await coach(f);
  const before=await f.evaluate(()=>({stats:structuredClone(__bw.S.stats),streak:__bw.S.streak,best:__bw.S.best,skills:structuredClone(__bw.S.skills),sk:structuredClone(__bw.S.sk),round:__bw.F.round,hp:__bw.F.foe.hp}));
  await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));await f.locator('#kb [data-fn=run]').click();
  await expect(action(f,'futility','[data-id=recover]')).toBeVisible();
  expect(await f.evaluate(()=>({stats:__bw.S.stats,streak:__bw.S.streak,best:__bw.S.best,skills:__bw.S.skills,sk:__bw.S.sk,round:__bw.F.round,hp:__bw.F.foe.hp}))).toEqual(before);
  expect(errors).toEqual([]);
});

test('skill system · fleeing cancels old animation callbacks before another encounter', async ({page})=>{
  const errors=observeErrors(page),f=await adventure(page);
  await f.evaluate(()=>{__bw.S.pages={a1:1};__bw.S.sk.swords=80;__bw.S.hp=__bw.maxHp();window.__bwFast=false;});
  const first=await standBy(f,'mon');await f.evaluate(()=>{__bw.F.foe.hp=__bw.F.foe.max=1200;});
  await action(f,'fpage','[data-id=a1]').click();await coach(f);await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));await f.locator('#kb [data-fn=run]').click();
  await expect.poll(()=>f.evaluate(()=>__bw.F.busy)).toBe(true);
  await f.waitForTimeout(500); // Honor the keyboard's 450 ms protection against a redraw click.
  await action(f,'flee').click();
  await expect(f.locator('#fight')).toBeHidden();await standBy(f,'mon');
  const next=await f.evaluate(()=>({hp:__bw.F.foe.hp,max:__bw.F.foe.max,round:__bw.F.round,title:__bw.F.title}));
  await f.waitForTimeout(1200);
  expect(await f.evaluate(()=>({hp:__bw.F.foe.hp,max:__bw.F.foe.max,round:__bw.F.round,title:__bw.F.title}))).toEqual(next);
  expect(await f.evaluate(()=>({state:__bw.F.st,chips:__bw.F.chips}))).toEqual({state:'choose',chips:''});
  expect(first.name).toBeTruthy();expect(errors).toEqual([]);
});

test('skill system · a newer cloud save cancels combat and migrates every character', async ({page})=>{
  await page.addInitScript(()=>{
    const db={doc:path=>path.endsWith('/save')?{get:async()=>({exists:false})}:{get:async()=>({exists:true,data:()=>({json:JSON.stringify(window.__skillRemote)})}),set:async()=>{}}};
    window.claude={use:async kind=>kind==='db'?await new Promise(resolve=>{window.__provideSkillCloud=()=>resolve(db);}):{id:async()=>'skill-cloud-fixture'}};
  });
  const errors=observeErrors(page),f=await adventure(page);
  await f.evaluate(()=>{
    __bw.S.pages={a1:1};__bw.S.sk.swords=80;__bw.S.hp=__bw.maxHp();__bw.save();window.__bwFast=false;
    const remote=JSON.parse(localStorage.getItem('brasswake.acct.v8'));remote.v=7;remote.rev+=10000;
    const active=remote.slots[remote.cur];active.v=6;active.bank.gold=321;
    for(const key of ['attr','mana','stamina','skillModes','skillTargets','attrModes','attrTargets'])delete active[key];
    remote.slots[(remote.cur+1)%5]={...structuredClone(active),name:'Cloud companion',path:'thief'};
    window.__skillRemote=remote;
  });
  await standBy(f,'mon');await f.evaluate(()=>{__bw.F.foe.hp=__bw.F.foe.max=1200;window.__oldSkillFoe=__bw.F.ent;});
  await action(f,'fpage','[data-id=a1]').click();await coach(f);await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));await f.locator('#kb [data-fn=run]').click();
  await expect.poll(()=>f.evaluate(()=>__bw.F.busy)).toBe(true);
  await f.evaluate(()=>window.__provideSkillCloud());
  await expect(f.locator('#fight')).toBeHidden();await expect(f.locator('#hud')).toBeVisible();
  await expect(f.locator('#app')).not.toHaveClass(/infight/);
  await f.waitForTimeout(1200);
  expect(await f.evaluate(()=>({bank:__bw.S.bank.gold,fight:__bw.F,busy:window.__oldSkillFoe.busy,versions:__bw.A.slots.filter(Boolean).map(s=>s.v),companion:__bw.A.slots.find(s=>s&&s.name==='Cloud companion').attr})))
    .toEqual({bank:321,fight:null,busy:0,versions:[7,7],companion:{str:35,dex:60,int:25}});
  expect(errors).toEqual([]);
});
