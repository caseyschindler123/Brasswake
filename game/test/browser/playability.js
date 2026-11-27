const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function game(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  return page.frames().find(frame => frame.url().includes('visual_test=1'));
}
async function coach(frame) {
  if (await frame.locator('[data-a=coachok]').isVisible()) await frame.locator('[data-a=coachok]').click();
}
async function run(frame, sql) {
  await frame.locator('#sql').fill(sql);
  await frame.locator('#kb [data-fn=run]').click();
  // Let the game's protection against touch clicks after a redraw expire.
  await frame.waitForTimeout(500);
}
async function basicAttack(frame) {
  await coach(frame);
  const attack = frame.locator('#combat-bar [data-id="basic.swords"]');
  await expect(attack).toBeEnabled({ timeout: 15000 });
  await attack.click();
  await coach(frame);
}
async function correctAttack(frame) {
  const sql = await frame.evaluate(() => __bw.F.task.sql);
  const original = await frame.evaluateHandle(() => Math.random);
  try {
    await frame.evaluate(() => { Math.random = () => .02; });
    await run(frame, sql);
    await frame.waitForFunction(() => __bw.F && !__bw.F.busy, null, { timeout: 20000 });
  } finally {
    await frame.evaluate(random => { Math.random = random; }, original);
    await original.dispose();
  }
}
async function winFight(frame) {
  for (let i = 0; i < 6; i++) {
    await basicAttack(frame);
    await correctAttack(frame);
    if (await frame.evaluate(() => !!__bw.F.over)) return;
  }
  throw new Error('Fight did not end after six correct queries');
}

test('commented queries survive Format, grading, and sandbox execution', async ({ page }, info) => {
  const errors = observeErrors(page), f = await game(page);
  await f.evaluate(() => __bw.START.contract({ id: 'c103' }));
  if (await f.locator('[data-a=qturn]').isVisible()) await f.locator('[data-a=qturn]').click();
  const sql = await f.evaluate(() => __bw.Q.task.sql);
  await f.locator('#sql').fill('/* my query; keep this note */\n' + sql + '; -- finished;');
  await f.locator('[data-fn=fmt]').click();
  expect(await f.locator('#sql').inputValue()).toContain('/* my query; keep this note */');
  await run(f, await f.locator('#sql').inputValue());
  await expect(f.locator('#enc')).toContainText('Exercise done');
  expect(await f.evaluate(() => !!__bw.S.done.c103)).toBe(true);
  await screenshot(page, info, 'commented-contract');
  await f.locator('[data-a=qleave]').last().click();
  const paidGold = await f.evaluate(() => __bw.S.gold);
  await f.evaluate(() => __bw.START.contract({ id: 'c103' }));
  await expect(f.locator('#combat-bar')).toBeHidden();
  await run(f, sql);
  await expect(f.locator('#enc')).toContainText('Still sharp');
  expect(await f.evaluate(() => __bw.S.gold)).toBe(paidGold);
  await f.locator('[data-a=qleave]').last().click();
  await f.locator('#nav [data-t=ledger]').click(); await coach(f);
  await f.locator('[data-a=lsub][data-s=sandbox]').click();
  await f.locator('#con-sql').fill('/* practice; */ SELECT 42 AS answer; -- done;');
  await f.locator('[data-a=conrun]').click();
  await expect(f.locator('#con-out td').first()).toHaveText('42');
  expect(errors).toEqual([]);
});

test('combat errors remain readable, correct attacks win, and loot can be banked', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), f = await game(page);
  await f.evaluate(() => {
    __bw.S.sk.swords = 100;
    const sword = __bw.makeItem('rare', 1, 'weapon', 'swords');
    __bw.S.inv.push(sword);
    __bw.S.eq.weapon = sword.id;
    const e = Scene.find(e => e.kind === 'mon' && e.r === 1 && e.inst.tpl === 'b102' && !e.inst.elite);
    e.wander = 0;
    for (const other of Scene.ents()) if (other.kind === 'mon') other.agg = 0;
    const { map } = Scene.debug();
    const next = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [e.x + dx, e.y + dy])
      .find(([x, y]) => !map.solid[y * map.w + x] && !map.occ.has(y * map.w + x));
    if (!next) throw Error('No clear tile beside the creature');
    Scene.hop(...next);
    __bw.Combat.selectTarget(e);
  });
  await basicAttack(f);
  for (const id of ['hp', 'mana', 'stamina']) await expect(f.locator(`#hud [data-resource=${id}] [role=meter]`)).toBeVisible();
  await run(f, 'SELECT missing FROM vendors');
  await expect(f.locator('#f-out')).toContainText('One free fix');
  expect(await f.evaluate(() => __bw.F.round)).toBe(0);
  const layout = await f.locator('.f-head').evaluate(el => {
    const title = el.firstElementChild.getBoundingClientRect(), buttons = el.lastElementChild.getBoundingClientRect();
    return { titleWidth: title.width, overlap: title.right > buttons.left && title.left < buttons.right && title.bottom > buttons.top && title.top < buttons.bottom,
      text: getComputedStyle(document.querySelector('#f-out .cap2')).color };
  });
  expect(layout.titleWidth).toBeGreaterThanOrEqual(150);
  expect(layout.overlap).toBe(false);
  expect(layout.text).toBe('rgb(98, 81, 61)');
  const runBox = await f.locator('#kb [data-fn=run]').boundingBox();
  expect(runBox.y + runBox.height).toBeLessThanOrEqual(page.viewportSize().height);
  await screenshot(page, info, 'combat-error-layout');
  await correctAttack(f);
  if (!await f.evaluate(() => !!__bw.F.over)) await winFight(f);
  await expect(f.locator('[data-a=floot]')).toBeVisible();
  await f.locator('[data-a=floot]').click(); await coach(f);
  await f.locator('[data-a=lootall]').click();
  expect(await f.evaluate(() => __bw.S.stats.kills)).toBeGreaterThan(0);
  await f.evaluate(() => { __bw.ACT.closesheet(); __bw.setCE(Scene.find(e => e.kind === 'banker' && e.r === 1)); __bw.ACT.bankopen(); });
  await coach(f);
  // Force the rare reward that previously replaced this sheet 900ms later.
  await f.evaluate(() => __bw.maybeDye(1));
  await f.waitForTimeout(1100);
  await expect(f.locator('#sheet')).toContainText('Your account');
  await expect(f.locator('#toast')).toContainText('dye. Use it from Hero');
  expect(await f.evaluate(() => __bw.S.dyeU.length)).toBeGreaterThan(0);
  await screenshot(page, info, 'dye-keeps-bank-open');
  const money = await f.evaluate(() => __bw.S.gold + __bw.S.bank.gold);
  await f.locator('[data-a=bdep]').click();
  expect(await f.evaluate(() => __bw.S.bank.gold)).toBe(money);
  await f.locator('[data-a=bwd][data-n=all]').click();
  expect(await f.evaluate(() => __bw.S.gold)).toBe(money);
  const store = f.locator('[data-a=bstore]').first(), id = await store.getAttribute('data-id');
  await store.click(); await f.locator('[data-a=btake][data-id="' + id + '"]').click();
  expect(await f.evaluate(id => __bw.S.inv.filter(it => it.id === id).length, id)).toBe(1);
  expect(errors).toEqual([]);
});

test('death protects insured and blessed gear and dropped equipment can be recovered', async ({ page }, info) => {
  const errors = observeErrors(page), f = await game(page);
  const setup = await f.evaluate(() => {
    const sword = __bw.makeItem('rare', 1, 'weapon', 'swords'), armor = __bw.makeItem('rare', 1, 'armor'), ring = __bw.makeItem('rare', 1, 'ring');
    armor.ins = 1; ring.bless = 1;
    __bw.S.inv = [sword, armor, ring]; __bw.S.eq = { weapon: sword.id, armor: armor.id, ring: ring.id };
    __bw.S.gold = 77; __bw.S.bank.gold = 500;
    const fee = __bw.insFee(armor); __bw.dropBody();
    __bw.HOST.interact(Scene.find(e => e.mine));
    return { sword: sword.id, armor: armor.id, ring: ring.id, fee };
  });
  expect(await f.evaluate(() => __bw.S.eq.weapon)).toBeUndefined();
  expect(await f.evaluate(() => __bw.S.eq.armor)).toBe(setup.armor);
  expect(await f.evaluate(() => __bw.S.eq.ring)).toBe(setup.ring);
  expect(await f.evaluate(() => __bw.S.bank.gold)).toBe(500 - setup.fee);
  await coach(f); await screenshot(page, info, 'recoverable-body');
  await f.locator('[data-a=lootall]').click();
  expect(await f.evaluate(() => __bw.S.eq.weapon)).toBe(setup.sword);
  expect(await f.evaluate(() => __bw.S.gold)).toBe(77);
  expect(await f.evaluate(() => __bw.S.inv.length)).toBe(3);
  expect(await f.evaluate(() => !!__bw.S.remains)).toBe(false);
  expect(errors).toEqual([]);
});

test('fishing, dungeon keys and chest, and dojo practice remain playable', async ({ page }, info) => {
  test.setTimeout(150000);
  const errors = observeErrors(page), f = await game(page);
  await f.evaluate(() => { __bw.HOST.interact(Scene.find(e => e.kind === 'fish' && e.r === 1)); });
  await coach(f); await f.locator('[data-a=cast]').first().click();
  await run(f, await f.evaluate(() => __bw.FI.task.sql));
  await expect(f.locator('#enc')).toContainText('3 casts left here');
  const color = await f.locator('.pk-dock [data-a=fileave]').evaluate(el => getComputedStyle(el).color);
  expect(color).toBe('rgb(245, 226, 184)');
  await screenshot(page, info, 'fishing-result');
  await f.locator('.pk-dock [data-a=fileave]').click(); await expect(f.locator('#enc')).toBeHidden();
  await f.evaluate(() => {
    __bw.S.gd = 12; __bw.S.sk.swords = 100;
    const sword = __bw.makeItem('rare', 1, 'weapon', 'swords');
    __bw.S.inv.push(sword);
    __bw.S.eq.weapon = sword.id;
    const e = Scene.find(e => e.kind === 'stairs' && e.r === 1); Scene.warp(e.x, e.y + 1); __bw.setCE(e); __bw.START.dungeon();
  });
  await f.waitForTimeout(900);
  await f.evaluate(() => { __bw.ACT.closesheet(); __bw.HOST.interact(Scene.find(e => e.kind === 'chest')); });
  expect(await f.evaluate(() => __bw.DG.done)).toBe(false);
  expect(await f.evaluate(() => __bw.DG.left)).toBe(1);
  await f.evaluate(() => {
    __bw.ACT.closesheet();
    const guard = Scene.find(e => e.kind === 'guard');
    const { map } = Scene.debug();
    const next = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [guard.x + dx, guard.y + dy])
      .find(([x, y]) => !map.solid[y * map.w + x] && !map.occ.has(y * map.w + x));
    if (!next) throw Error('No clear tile beside the cellar guard');
    Scene.hop(...next);
    __bw.HOST.interact(guard);
  });
  await winFight(f);
  expect(await f.evaluate(() => __bw.DG.left)).toBe(0);
  await f.locator('[data-a=fdone]').click();
  await f.evaluate(() => { __bw.ACT.closesheet(); __bw.HOST.interact(Scene.find(e => e.kind === 'chest')); });
  await expect(f.locator('#sheet').getByRole('heading', { name: 'Starter chest', exact: true })).toBeVisible();
  expect(await f.evaluate(() => __bw.DG.done)).toBe(true);
  expect(await f.evaluate(() => __bw.S.stats.dungeons)).toBe(1);
  await screenshot(page, info, 'earned-vault-chest');
  await f.evaluate(() => { __bw.ACT.closesheet(); __bw.ACT.exitdungeon(); __bw.ACT.gskip(); __bw.HOST.interact(Scene.find(e => e.kind === 'dojo' && e.r === 1)); });
  await f.waitForTimeout(700);
  await f.evaluate(() => __bw.HOST.interact(Scene.find(e => e.kind === 'dummy' && e.i === 0)));
  await run(f, await f.evaluate(() => __bw.DU.task.sql));
  await expect(f.locator('#f-out')).toContainText('Clean hit. 1 so far.');
  await screenshot(page, info, 'dojo-practice');
  await f.locator('[data-a=dudone]').click();
  await f.evaluate(() => __bw.HOST.interact(Scene.find(e => e.kind === 'hallexit')));
  expect(await f.evaluate(() => Scene.inHall())).toBe(0);
  expect(errors).toEqual([]);
});

test('poker accepts a commented count without wasting the read', async ({ page }, info) => {
  const errors = observeErrors(page), f = await game(page);
  await f.evaluate(() => { __bw.S.gold = 500; __bw.ACT.pksit({ r: '1', n: '100' }); });
  await coach(f);
  await f.waitForFunction(() => __bw.PK.h.over || (!__bw.PK.busy && __bw.PK.h.to === 0), null, { timeout: 30000 });
  // If everyone folded before reaching the player, deal the next hand with
  // the player first to act. This changes only seating, not cards or rules.
  if (await f.evaluate(() => __bw.PK.h.over)) {
    await f.evaluate(() => { __bw.PK.btn = 2; });
    await f.locator('[data-a=pknext]').click();
  }
  await f.locator('[data-a=pkread]').click();
  await run(f, '/* my read; */ SELECT /* count; */ COUNT(*) FROM hands; -- done;');
  const read = await f.evaluate(() => __bw.PK.reads[0]);
  expect(read.err).toBeUndefined();
  expect(read.ans).toMatch(/^(\d+|more than 10)$/);
  await expect(f.locator('[data-a=pkread]')).toBeDisabled();
  await screenshot(page, info, 'poker-commented-count');
  expect(errors).toEqual([]);
});
