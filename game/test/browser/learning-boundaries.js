const { test, expect } = require('@playwright/test');
const { open: openDev } = require('./dev-helper');
const { observeErrors, screenshot } = require('./flow');
const { speech } = require('./first-day-helper');

const nav = (page, tab) => page.locator('#nav [data-t="' + tab + '"]');
const sheet = page => page.locator('#sheet');
const state = page => page.evaluate(() => {
  const s = __bw.S;
  return { gold: s.gold, hides: s.mats.hide || 0, equipment: { ...s.eq }, keys: s.hints,
    sigils: s.mats.sigil, items: s.inv.map(item => item.id), scrolls: { ...s.scr } };
});

test('first-day boundaries · damage labels expire while the Hero view pauses Adventure', async ({ page }) => {
  const errors = observeErrors(page);
  await openDev(page);
  await expect(page.locator('#movement-joystick')).toHaveAttribute('aria-disabled', 'false');
  const hero = nav(page, 'hero'), adventure = nav(page, 'world');
  await hero.evaluate(button => button.addEventListener('click', () => {
    const marker = '−913';
    Scene.FX.hit('me', marker);
    const { map, effects } = Scene.debug();
    window.__pausedLabel = { marker, map, began: performance.now(), clock: Scene.tacticalTime(),
      recorded: effects.floats.some(float => float.e === 'me' && float.txt === marker) };
  }, { once: true }));
  await hero.click();
  await expect(hero).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#view')).toBeVisible();
  await page.waitForFunction(() => performance.now() - window.__pausedLabel.began >= 1100, null, { timeout: 4000 });
  expect(await page.evaluate(() => ({
    recorded: window.__pausedLabel.recorded,
    paused: Scene.tacticalTime() === window.__pausedLabel.clock
  }))).toEqual({ recorded: true, paused: true });

  await adventure.evaluate(button => button.addEventListener('click', () => {
    // Inspect the first returned scene frames, before active animation time
    // could expire a label that survived the pause.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const { map, effects } = Scene.debug(), before = window.__pausedLabel;
      window.__returnedLabel = { sameScene: map === before.map,
        present: effects.floats.some(float => float.txt === before.marker) };
    }));
  }, { once: true }));
  await adventure.click();
  await expect(adventure).toHaveAttribute('aria-current', 'page');
  await page.waitForFunction(() => !!window.__returnedLabel, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__returnedLabel)).toEqual({ sameScene: true, present: false });
  expect(errors).toEqual([]);
});

test('first-day boundaries · guided Deposit all keeps the bank open and advances the objective once', async ({ page }) => {
  const errors = observeErrors(page);
  await openDev(page);
  const prepared = await page.evaluate(() => {
    Dev.teleport({ region: 1 });
    Dev.resources({ gold: 73 });
    const s = __bw.S;
    s.gd = 9;
    s.tut = 2;
    s.gbk = 0;
    s.bank.gold = 11;
    const { map } = Scene.debug(), banker = Scene.find(e => e.r === 1 && e.kind === 'banker');
    if (!banker) throw Error('Missing Tallyport banker');
    const room = map.blds.find(b => b.r === 1 && b.slot === 'bank' &&
      banker.x >= b.x && banker.x < b.x + b.w && banker.y >= b.y && banker.y < b.y + b.h);
    for (const [dx, dy] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
      const x = banker.x + dx, y = banker.y + dy, i = y * map.w + x;
      if (map.solid[i] || map.occ.has(i) || map.t[i] === 4) continue;
      if (room && (x < room.x || x >= room.x + room.w || y < room.y || y >= room.y + room.h)) continue;
      if (map.ents.some(e => e !== banker && !e.hidden && Math.hypot(e.fx - x, e.fy - y) < 1)) continue;
      Scene.hop(x, y);
      return { name: banker.name, at: [x, y] };
    }
    throw Error('The banker has no clear prepared approach');
  });
  const context = page.locator('#ctx');
  await expect(context).toContainText(prepared.name);
  await context.click();
  // The normal town interaction introduces Deposit all through the banker.
  await speech(page, '#say [data-a="bankopen"]');
  const coach = page.locator('[data-a="coachok"]');
  if (await coach.isVisible()) await coach.click();
  const deposit = sheet(page).getByRole('button', { name: 'Deposit all', exact: true });
  await expect(deposit).toBeEnabled();
  await expect(sheet(page)).toContainText('On you 73 · in the bank 11');
  await deposit.click();
  await expect(sheet(page)).toContainText('On you 0 · in the bank 84');
  // The old handler closed this sheet 700ms after Deposit all.
  await page.waitForTimeout(950);
  await expect(sheet(page)).toBeVisible();
  await expect(deposit).toBeDisabled();
  await expect(sheet(page).getByRole('button', { name: 'Take 50', exact: true })).toBeEnabled();
  await expect(page.locator('#say')).toBeHidden();
  await expect(nav(page, 'world')).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => ({ gd: __bw.S.gd, gold: __bw.S.gold, bank: __bw.S.bank.gold, at: Scene.pos() })))
    .toEqual({ gd: 10, gold: 0, bank: 84, at: prepared.at });
  expect(errors).toEqual([]);
});

test('first-day boundaries · selling requires a nearby vendor and preserves unselected goods', async ({ page }, info) => {
  const errors = observeErrors(page);
  await openDev(page);
  const fixtures = await page.evaluate(() => {
    Dev.resources({ gold: 73 });
    const s = __bw.S;
    s.hints = 4;
    s.mats.sigil = 2;
    s.mats.hide = 3;
    s.pages.a1=1;s.scr.a1=2;
    // Loot generation may promote a nominal common piece when it rolls an
    // enchantment. Create this fixture without loot enchantments.
    const item = (rarity, slot) => __bw.makeItem(rarity, 1, slot, 'swords', { source: 'starter' });
    const armor = item('common', 'armor'), ring = item('common', 'ring'), rare = item('rare', 'charm');
    s.inv.push(armor, ring, rare);
    const worn = s.inv.find(it => it.id === s.eq.weapon);
    if (armor.rarity !== 'common' || ring.rarity !== 'common' ||
        rare.rarity !== 'rare' || worn?.rarity !== 'common') throw Error('Invalid sale comparison inventory');
    const quotation = it => Math.round(Object.values(it.stats).reduce((sum, value) => sum + value, 0) * 3 + 4);
    return { armor, ring, rare, worn, armorGold: quotation(armor), ringGold: quotation(ring) };
  });
  await nav(page, 'bag').click();
  await expect(nav(page, 'bag')).toHaveAttribute('aria-current', 'page');
  for (const [name, description] of [
    ['Hint Keys', 'A Hint Key pays for a priced exercise hint.'],
    ['Brass Sigils', 'Brass Sigils are earned from regional challenges']
  ]) {
    const counter = page.locator('#view').getByRole('button', { name: new RegExp(name) });
    await expect(counter).toBeVisible();
    if (info.project.use.hasTouch) await counter.tap();
    else await counter.click();
    await expect(sheet(page).getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(sheet(page)).toContainText(description);
    await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  }

  const before = await state(page);
  await expect(page.locator('#view [data-a="sellcommon"]')).toHaveCount(0);
  await page.locator('#view [data-a=item][data-id="'+fixtures.ring.id+'"]').click();
  await expect(sheet(page).locator('[data-a=sell]')).toHaveCount(0);
  await sheet(page).getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>__bw.ACT.sellcommon());
  await page.evaluate(id=>__bw.ACT.sell({id}),fixtures.ring.id);
  await page.evaluate(()=>__bw.ACT.sellscroll({id:'a1'}));
  await expect(sheet(page)).toBeHidden();
  expect(await state(page)).toEqual(before);
  await nav(page,'world').click();
  const vendor=await page.evaluate(()=>{
    const {map:m}=Scene.debug(),e=m.ents.find(e=>e.kind==='stallkeep'&&e.r===1);
    for(const [dx,dy]of [[0,1],[1,0],[-1,0],[0,-1]]){
      const x=e.x+dx,y=e.y+dy,i=y*m.w+x;
      if(m.solid[i]||m.occ.has(i))continue;
      Scene.hop(x,y);return e.name;
    }
    throw Error('No vendor approach');
  });
  await expect(page.locator('#ctx')).toContainText(vendor);
  await page.locator('#ctx').click();
  const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await sheet(page).locator('[data-a=sellcommon]').click();
  await expect(sheet(page)).toContainText('Choose goods to sell');
  await expect(sheet(page).locator('[data-a=sellpick][data-id="'+fixtures.worn.id+'"]')).toHaveCount(0);
  await sheet(page).locator('[data-a=sellpick][data-id="'+fixtures.armor.id+'"]').click();
  await expect(sheet(page).locator('li')).toHaveText([fixtures.armor.name+' · '+fixtures.armorGold+' gold']);
  await screenshot(page,info,'individual-vendor-sale');
  const confirm=sheet(page).getByRole('button',{name:'Sell for '+fixtures.armorGold+' gold',exact:true});
  expect(await state(page)).toEqual(before);
  await sheet(page).getByRole('button',{name:'Keep my items',exact:true}).click();
  expect(await state(page)).toEqual(before);
  await page.evaluate(()=>__bw.ACT.sellcommon());
  await sheet(page).locator('[data-a=sellpick][data-id="'+fixtures.armor.id+'"]').click();
  await confirm.click();
  await expect(sheet(page)).toBeHidden();
  expect(await state(page)).toEqual({...before,gold:before.gold+fixtures.armorGold,items:before.items.filter(id=>id!==fixtures.armor.id)});

  await page.evaluate(()=>__bw.ACT.sellcommon());
  await sheet(page).locator('[data-a=sellpick][data-id="scroll:a1"]').click();
  await expect(sheet(page).locator('li')).toContainText('scroll ×1');
  await sheet(page).locator('[data-a=sellconfirm]').click();
  expect((await state(page)).scrolls.a1).toBe(1);

  // A review cannot be reused after moving away from the vendor.
  await page.evaluate(()=>__bw.ACT.sellcommon());
  await sheet(page).locator('[data-a=sellpick][data-id="'+fixtures.ring.id+'"]').click();
  await page.evaluate(()=>{const p=Scene.pos();Scene.hop(p[0]+8,p[1]+8);});
  const after=await state(page);
  await sheet(page).locator('[data-a=sellconfirm]').click();
  expect(await state(page)).toEqual(after);
  expect(errors).toEqual([]);
});

test('first-day boundaries · Recover requires a resource deficit and restores missing stamina at full mana', async ({ page }) => {
  const errors = observeErrors(page);
  await openDev(page);
  const before = await page.evaluate(() => {
    Dev.skills({ meditation: 12 });
    const s = __bw.S;
    Dev.resources({ mana: Progression.maxMana(s), stamina: Progression.maxStamina(s) });
    return { meditation: s.sk.meditation, mana: s.mana, stamina: s.stamina };
  });
  const recover = page.locator('#hud [data-a="outrecover"]');
  await recover.click();
  await expect(page.locator('#toast')).toContainText('Mana and stamina are full.');
  await expect(page.locator('#enc')).toBeHidden();
  expect(await page.evaluate(() => ({ query: __bw.Q, meditation: __bw.S.sk.meditation })))
    .toEqual({ query: null, meditation: before.meditation });

  const deficit = await page.evaluate(() => {
    Dev.resources({ stamina: Progression.maxStamina(__bw.S) - 15 });
    return __bw.S.stamina;
  });
  await recover.click();
  await expect(page.locator('#enc')).toBeVisible();
  const task = await page.evaluate(() => {
    const { kind, work, csk, task } = __bw.Q;
    return { kind, work, csk, sql: task.sql };
  });
  expect(task).toMatchObject({ kind: 'skillwork', work: 'recover', csk: 'meditation' });
  await page.locator('#sql').fill(task.sql);
  await page.locator('#kb [data-fn="run"]').click();
  await expect(page.locator('#enc h2')).toHaveText('Success');
  await expect(page.locator('#enc .q-body')).toContainText('Recovered 0 mana and 12 stamina.');
  await expect(page.locator('#enc .practice-gains')).toContainText('Meditation');
  await expect(page.locator('#enc .practice-gains')).toContainText(/\d+\.\d → \d+\.\d \(\+\d+\.\d\)/);
  const after = await page.evaluate(() => ({
    meditation: __bw.S.sk.meditation, mana: __bw.S.mana, stamina: __bw.S.stamina
  }));
  expect(after.mana).toBe(before.mana);
  expect(after.stamina).toBe(deficit + 12);
  expect(after.meditation).toBeGreaterThan(before.meditation);
  expect(errors).toEqual([]);
});

async function openVendor(page, kind, index) {
  const name = await page.evaluate(({ kind, index }) => {
    const { map } = Scene.debug();
    const vendor = Scene.find(e => e.kind === kind && e.r === 1 && (index == null || e.i === index));
    if (!vendor) throw Error('Missing vendor ' + kind);
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const x = vendor.x + dx, y = vendor.y + dy, i = y * map.w + x;
      if (map.solid[i] || map.occ.has(i)) continue;
      Scene.hop(x, y);
      return vendor.name;
    }
    throw Error('No clear vendor approach for ' + kind);
  }, { kind, index });
  const ctx = page.locator('#ctx');
  await expect(ctx).toBeVisible();
  await expect(ctx).toContainText(name);
  await ctx.click();
}

async function shopIcons(page) {
  const icons = sheet(page).locator('li.good > .ico');
  await expect(icons.first()).toBeVisible();
  return icons.evaluateAll(async icons => Promise.all(icons.map(async icon => {
    const css = getComputedStyle(icon), match = css.backgroundImage.match(/^url\(["']?(.+?)["']?\)$/);
    if (!match || icon.classList.contains('none')) return { source: 'missing' };
    const image = new Image();
    image.src = match[1];
    await image.decode();
    const atlas = new URL(image.src, location.href).pathname.endsWith('/art/icons.webp');
    const source = atlas ? 'atlas' : image.src.startsWith('data:image/png') ? 'material' : 'other';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 44;
    const context = canvas.getContext('2d');
    if (atlas) {
      const scale = image.naturalWidth / parseFloat(css.backgroundSize);
      context.drawImage(image, -parseFloat(css.backgroundPositionX) * scale,
        -parseFloat(css.backgroundPositionY) * scale, 44 * scale, 44 * scale, 0, 0, 44, 44);
    } else context.drawImage(image, 0, 0, 44, 44);
    const bytes = context.getImageData(0, 0, 44, 44).data;
    return { source, painted: bytes.some((value, i) => i % 4 === 3 && value > 127) };
  })));
}

test('first-day boundaries · stall gear and Odalys’s pages show loaded item icons', async ({ page }, info) => {
  const errors = observeErrors(page);
  await openDev(page);
  await page.evaluate(() => {
    const s = __bw.S;
    // Armor and jewelry both have material previews in the painted renderer.
    const armor = __bw.makeItem('common', 1, 'armor', 'swords', { source: 'starter' });
    const ring = __bw.makeItem('common', 1, 'ring', 'swords', { source: 'starter' });
    s.stall = { r: 1, n: 0, stock: [armor, ring] };
    s.letter = 1;
    s.seen.trade = s.seen.shop = 1;
  });
  // The material renderer lazily loads the icon atlas. Verify the material
  // presentation once its art is ready. Pages below retain atlas coverage.
  await page.waitForFunction(() => !!Scene.equipmentIcon(__bw.S.stall.stock[0]), null, { timeout: 5000 });
  await openVendor(page, 'stallkeep');
  await expect(sheet(page).locator('[data-a="buy"]')).toHaveCount(2);
  const stallIcons = await shopIcons(page);
  await expect(page.locator('#toast [role="status"]')).toHaveCount(0, { timeout: 5000 });
  await screenshot(page, info, 'stall-material-and-atlas-icons');
  await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();

  await openVendor(page, 'npc', 0);
  await speech(page, '#say [data-a="pages"]');
  await expect(sheet(page).getByRole('heading', { name: /^Pages for sale/ })).toBeVisible();
  await expect(sheet(page).locator('[data-a="buypage"]').first()).toBeVisible();
  const pageIcons = await shopIcons(page);
  await screenshot(page, info, 'odalys-page-icons');
  expect(pageIcons.length).toBeGreaterThan(1);
  expect.soft(pageIcons).toEqual(Array.from({ length: pageIcons.length }, () => ({ source: 'atlas', painted: true })));
  expect(stallIcons).toEqual([
    { source: 'material', painted: true },
    { source: 'material', painted: true }
  ]);
  expect(errors).toEqual([]);
});


test('first-day boundaries · Journal leads with the guide and separates optional records',async({page},info)=>{
  await openDev(page);
  await expect(page.locator('#toast [role=status]')).toHaveCount(0);
  await page.evaluate(()=>{__bw.S.gd=8;__bw.S.met['1.0']=1;__bw.S.seen['intro.practice']=1;__bw.SH.journal();});
  await expect(sheet(page).getByRole('heading',{name:'Your next step',exact:true})).toBeVisible();
  await expect(sheet(page).locator('.journal-next')).toContainText('Visit Odalys and buy another ability');
  await expect(sheet(page).locator('details[open]')).toHaveCount(0);
  await expect(sheet(page).locator('summary').first()).toContainText('Optional SQL practice');
  await screenshot(page,info,'journal-next-step');
  await sheet(page).locator('summary').filter({hasText:'Ilva’s story'}).click();
  await expect(sheet(page)).toContainText('separate from the ability pages');
  await sheet(page).getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{const e=Scene.guideEnt()||{name:'Tamsin'};__bw.SH.guide(e);});
  await page.locator('#say').click();
  await expect(page.locator('#say-text')).toContainText('We call an ability a page');
  await screenshot(page,info,'tamsin-explains-ability-pages');
  await speech(page);
  await page.evaluate(()=>Dev.resources({gold:1000}));
  await openVendor(page,'npc',0);
  await speech(page,'#say [data-a=pages]');
  const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await sheet(page).locator('[data-a=buypage]:not([disabled])').first().click();
  expect(await page.evaluate(()=>__bw.S.gd)).toBe(9);
  await sheet(page).locator('[data-a=buypage]:not([disabled])').first().click();
  expect(await page.evaluate(()=>__bw.S.gd)).toBe(9);
});

test('first-day boundaries · paid skill training shows the before, after and gain',async({page},info)=>{
  await openDev(page);
  await expect(page.locator('#toast [role=status]')).toHaveCount(0);
  await page.evaluate(()=>{Dev.skills({swords:12});Dev.resources({gold:10000});__bw.ACT.djtrain();});
  await sheet(page).locator('[data-a=train][data-id=swords][data-n="1"]').click();
  const gain=sheet(page).locator('.practice-gains');
  await expect(gain).toContainText('Swordsmanship');
  await expect(gain).toContainText('12.0 → 13.0 (+1.0)');
  await expect.poll(()=>page.evaluate(()=>__bw.S.sk.swords)).toBe(13);
  await screenshot(page,info,'visible-skill-training-gain');
});

test('first-day boundaries · battle gains stay visible after an exchange and victory',async({page},info)=>{
  await openDev(page);
  await expect(page.locator('#toast [role=status]')).toHaveCount(0);
  await page.evaluate(()=>{Dev.skills({swords:40});const ids=Dev.spawn({monster:'b102'});Dev.battle(ids[0]);__bw.F.foe.hp=__bw.F.foe.max=10000;});
  const submit=async()=>{
    await page.locator('[data-a=fpage][data-id=a1]').click();
    const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    const before=await page.evaluate(()=>__bw.S.sk.swords);
    await page.locator('#sql').fill(await page.evaluate(()=>__bw.F.task.sql));
    await page.evaluate(()=>{window.gainTestRandom=Math.random;Math.random=()=>.01;});
    try{await page.locator('#kb [data-fn=run]').click();await page.waitForFunction(()=>__bw.F&&!__bw.F.busy);}finally{await page.evaluate(()=>{Math.random=window.gainTestRandom;});}
    const after=await page.evaluate(()=>__bw.S.sk.swords);
    expect(after).toBeGreaterThan(before);
    const gain=page.locator('#fight .practice-gains');
    await expect(gain).toBeVisible();
    await expect(gain).toContainText(`${before.toFixed(1)} → ${after.toFixed(1)} (+${(after-before).toFixed(1)})`);
  };
  await submit();
  await screenshot(page,info,'battle-exchange-skill-gain');
  await page.locator('[data-a=fchoose]').click();
  await page.evaluate(()=>{__bw.F.foe.hp=1;});
  await submit();
  expect(await page.evaluate(()=>__bw.F.over)).toBeTruthy();
  await screenshot(page,info,'battle-victory-skill-gain');
});
