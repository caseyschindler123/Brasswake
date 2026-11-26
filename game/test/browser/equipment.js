const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { open } = require('./dev-helper');

async function approachBench(page) {
  const target = await page.evaluate(() => {
    Dev.teleport({ region: 1 });
    const { map } = Scene.debug();
    for (const actor of Scene.ents()) if (actor.wander) {
      actor.wander = 0;
      actor.tx = null;
      actor.fx = actor.x;
      actor.fy = actor.y;
    }
    const benches = Scene.ents().filter(entity => entity.kind === 'bench' && entity.r === 1 && !entity.hidden);
    for (const bench of benches) {
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const x = bench.x + dx, y = bench.y + dy, cell = y * map.w + x;
        if (map.solid[cell] || map.t[cell] === 4 || map.occ.has(cell)) continue;
        const safe = Scene.safePosition([x, y], 1);
        if (safe[0] !== x || safe[1] !== y) continue;
        Dev.teleport({ region: 1, x, y });
        return { at: [x, y], bench: [bench.x, bench.y] };
      }
    }
    throw Error(`No clear workbench approach in Tallyport (${benches.length} visible benches)`);
  });
  expect(await page.evaluate(() => Scene.pos())).toEqual(target.at);
  const since = await page.evaluate(() => Scene.tacticalTime());
  await page.waitForFunction(({ bench: [x, y], since }) => {
    const { cam, zoom } = Scene.debug(), canvas = document.querySelector('#stage canvas.over');
    const px = (x * 16 + 8 - cam.x) * zoom, py = (y * 16 + 4 - cam.y) * zoom;
    return Scene.tacticalTime() - since >= 500 && px > 24 && px < canvas.clientWidth - 24 && py > 34 && py < canvas.clientHeight - 34;
  }, { ...target, since });
  const context = page.locator('#ctx');
  if (await context.isVisible() && (await context.textContent()).includes('Workbench')) {
    await context.click();
    return;
  }
  const position = await page.evaluate(([x, y]) => {
    const { cam, zoom } = Scene.debug();
    return { x: (x * 16 + 8 - cam.x) * zoom, y: (y * 16 + 4 - cam.y) * zoom };
  }, target.bench);
  await page.locator('#stage canvas.over').click({ position });
}

test('equipment details compare the worn build and enchanting spends the quoted cost once', async ({ page }, info) => {
  const errors = observeErrors(page);
  await open(page);
  await expect(page.locator('#toast [role=status]')).toHaveCount(0);
  const fixture = await page.evaluate(() => {
    Dev.skills({ swords: 45, fencing: 32 });
    Dev.resources({ gold: 100 });
    __bw.S.mats[1] = 10;
    const generated = Dev.grant({ weapon: 'swords', equip: false });
    const weapon = generated.equipment.enchantment?.id === 'slaying' ? generated :
      EquipmentRules.applyEnchantment(generated, 'slaying', { circle: 1, gold: 35, mats: { 1: 2 } }).item;
    __bw.S.inv[__bw.S.inv.findIndex(item => item.id === weapon.id)] = weapon;
    const armor = Dev.grant({ slot: 'armor', equip: false });
    return { weapon, armor, enchantment: 'power' };
  });
  const sheet = page.locator('#sheet');
  const selectItem = async id => page.locator(`#view [data-a=item][data-id="${id}"]`).click();
  await page.locator('#nav [data-t=bag]').click();
  await selectItem(fixture.weapon.id);
  const breakdown = sheet.locator('[data-equipment-breakdown]');
  await expect(breakdown).toContainText('Craftsmanship');
  await expect(breakdown).toContainText('Material');
  await expect(breakdown).toContainText(`+${fixture.weapon.stats.dmg}% weapon damage`);
  await screenshot(page, info, 'equipment-breakdown');
  const comparison = sheet.locator('[data-equipment-comparison]');
  await expect(comparison).toContainText(/Expected damage per query\s*\d+\.\d → \d+\.\d/);
  await expect(comparison).toContainText(/Combat DPS\s*\d+\.\d → \d+\.\d/);
  await expect(comparison).toContainText('no time spent writing SQL');
  const strength = comparison.locator('[data-equipment-strength]');
  await expect(strength).toContainText(/(?:\d+\.\d% (?:more|less)|Same) damage per second · (?:[+−])?\d+\.\d DPS/);
  const expectedDamage = comparison.getByText('Expected damage per query', { exact: true }).locator('xpath=following-sibling::span[1]');
  const ordinary = Number((await expectedDamage.textContent()).split('→')[1]);
  const undead = comparison.getByRole('button', { name: 'Undead' });
  await undead.scrollIntoViewIfNeeded();
  await undead.click();
  await expect(undead).toHaveAttribute('aria-pressed', 'true');
  await expect(undead).toBeInViewport();
  expect(Number((await expectedDamage.textContent()).split('→')[1])).toBeGreaterThan(ordinary);
  await comparison.evaluate(section => section.scrollIntoView({ block: 'start' }));
  await screenshot(page, info, 'equipment-comparison');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await selectItem(fixture.armor.id);
  await expect(sheet.locator('[data-equipment-mitigation]')).toContainText(/Physical damage\s*\d+% → \d+%/);
  await expect(sheet.locator('[data-equipment-mitigation]')).toContainText('60%');
  await sheet.getByRole('button', { name: 'Close' }).click();

  await approachBench(page);
  await sheet.getByRole('button', { name: 'Enchant equipment' }).click();
  await sheet.locator(`[data-a=enchitem][data-id="${fixture.weapon.id}"]`).click();
  const confirmation = sheet.locator(`[data-a=enchantapply][data-effect=${fixture.enchantment}]`);
  await expect(confirmation).toBeEnabled();
  await expect(confirmation.locator('..')).toContainText('35 gold');
  await expect(confirmation.locator('..')).toContainText('2 Salt Crystal');
  await screenshot(page, info, 'equipment-enchanting');
  const stale = await confirmation.evaluate(button => ({ ...button.dataset }));
  await confirmation.click();
  await expect(sheet).toContainText('You have 65 gold.');
  const result = await page.evaluate(({ id, stale }) => {
    __bw.ACT.enchantapply(stale);
    const state = Dev.snapshot().hero;
    return { gold: state.gold, materials: state.mats[1], enchanted: state.inv.find(item => item.id === id) };
  }, { id: fixture.weapon.id, stale });
  expect(result.gold).toBe(65);
  expect(result.materials).toBe(8);
  expect(result.enchanted.equipment.enchantment).toEqual({ id: fixture.enchantment, level: 1 });
  expect(result.enchanted.name).toMatch(/of Power I$/);
  expect(result.enchanted.stats.slaying).toBeUndefined();
  expect(errors).toEqual([]);
});

test('equipment crafting honors fabrication shapes and preserves ring and charm identities', async ({ page }) => {
  const errors = observeErrors(page);
  await open(page);
  const crafted = await page.evaluate(() => {
    Dev.skills({ smith: 65 });
    __bw.S.pages.c1 = 1;
    __bw.S.mats[1] = 20;
    const make = (slot, archetype, material, skill, rarity = 'legendary') => __bw.makeItem(rarity, 8, slot, skill,
      { source: 'craft', archetype, material, skill: 75, queryQuality: 1 });
    return {
      helm: make('head', 'Steel Helm', 'steel'), gloves: make('hands', 'Leather Gloves', 'waxed'),
      boots: make('feet', 'Leather Boots', 'boiled'), robe: make('armor', 'Travelling Robe', 'silk'),
      shield: make('shield', 'Wooden Shield', 'yew'), staff: make('weapon', undefined, 'yew', 'magery'),
      leather: make('armor', 'Leather Jerkin', 'waxed'), mail: make('armor', 'Chain Shirt', 'steel'),
      plate: make('armor', 'Plate Cuirass', 'tempered'),
      lesserPlate: make('armor', 'Plate Cuirass', 'tempered', undefined, 'uncommon'),
    };
  });
  expect(crafted.helm).toMatchObject({ ic: 'hq3', equipment: { material: 'steel' } });
  expect(crafted.helm.name).toMatch(/Steel Helm$/);
  expect(crafted.helm.stats.learn).toBeUndefined();
  expect(crafted.gloves).toMatchObject({ ic: 'hq7', equipment: { material: 'waxed' } });
  expect(crafted.gloves.name).toMatch(/Waxed Leather Gloves$/);
  expect(crafted.gloves.stats.deft).toBeUndefined();
  expect(crafted.boots).toMatchObject({ ic: 'hq10', equipment: { material: 'boiled' } });
  expect(crafted.boots.name).toMatch(/Boiled Leather Boots$/);
  expect(crafted.robe).toMatchObject({ ic: 'cloak_1', equipment: { material: 'silk' } });
  expect(crafted.robe.name).toMatch(/Silk Robe$/);
  expect(crafted.robe.stats.learn).toBeGreaterThan(0);
  expect(crafted.leather).toMatchObject({ ic: 'armor_1', equipment: { material: 'waxed' } });
  expect(crafted.mail).toMatchObject({ ic: 'armor_2', equipment: { material: 'steel' } });
  expect(crafted.plate).toMatchObject({ ic: 'armor_3', equipment: { material: 'tempered' } });
  expect(crafted.lesserPlate).toMatchObject({ ic: crafted.plate.ic, equipment: { material: 'tempered', baseRarity: 'uncommon' } });
  expect(crafted.lesserPlate.equipment.base.def).toBeLessThan(crafted.plate.equipment.base.def);
  expect(crafted.shield).toMatchObject({ ic: 'shield_1', off: 20, equipment: { material: 'yew' } });
  expect(crafted.shield.name).toMatch(/Yew Shield$/);
  expect(crafted.shield.stats.learn).toBeUndefined();
  expect(crafted.staff).toMatchObject({ w: 'magery', equipment: { material: 'yew', enchantment: null } });
  expect([8, 9, 13]).toContain(crafted.staff.v);

  const sheet = page.locator('#sheet');
  const result = page.locator('#enc');
  for (const [slot, name, roll, remainder] of [
    ['ring', / Ring of (?:the Purse|Study|Fortune)$/, .01, 14],
    ['charm', / Amulet of (?:the Purse|Study|Fortune)$/, .02, 8],
  ]) {
    await approachBench(page);
    await sheet.locator(`[data-a=slot][data-s=${slot}]`).click();
    await sheet.locator('[data-a=craft][data-id=uncommon]').click();
    const sql = await page.evaluate(() => __bw.Q.task.sql);
    await result.locator('#sql').fill(sql);
    await page.evaluate(value => { window.__equipmentRoll = Math.random; Math.random = () => value; }, roll);
    try {
      await result.locator('#sql').press('Control+Enter');
      await expect(result.locator('.q-foot [data-a=qleave]')).toBeVisible();
      await expect(result).toContainText('Exceptional work');
    } finally {
      await page.evaluate(() => { Math.random = window.__equipmentRoll; delete window.__equipmentRoll; });
    }
    const actual = await page.evaluate(slot => ({ item: __bw.S.inv.find(piece => piece.slot === slot), materials: __bw.S.mats[1] }), slot);
    expect(actual.item.name).toMatch(name);
    expect(actual.materials).toBe(remainder);
    expect(Object.values(actual.item.stats)).toEqual([5]);
    await result.locator('.q-foot [data-a=qleave]').click();
    await expect(result).toBeHidden();
  }
  expect(errors).toEqual([]);
});
