const { test, expect } = require('@playwright/test');
const { open: openDev } = require('./dev-helper');
const { observeErrors, screenshot } = require('./flow');
const { speech } = require('./first-day-helper');

const nav = (page, tab) => page.locator(tab==='world'?'#view .pclose':'#nav [data-t="' + tab + '"]');
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
  await expect(page.locator('#stage')).toBeVisible();
  await expect(page.locator('#view')).toBeHidden();
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
  const recover = page.locator('#combat-bar [data-a="combatbegin"][data-id="recover"]');
  await expect(recover).toHaveAttribute('aria-disabled', 'true');
  expect(await page.evaluate(() => __bw.Combat.begin('recover'))).toBe(false);
  await expect(page.locator('#toast')).toContainText('Mana and stamina are already full.');
  await expect(page.locator('#enc')).toBeHidden();
  expect(await page.evaluate(() => ({ query: __bw.Q, fight: __bw.F, meditation: __bw.S.sk.meditation })))
    .toEqual({ query: null, fight: null, meditation: before.meditation });

  const deficit = await page.evaluate(() => {
    Dev.resources({ stamina: Progression.maxStamina(__bw.S) - 15 });
    // Keep fixture setup time out of the exact restoration delta. Opening the
    // real action resumes Scene into its own authoritative SQL pause.
    Scene.pause();
    return __bw.S.stamina;
  });
  await expect(recover).toHaveAttribute('aria-disabled', 'false');
  await recover.click();
  await expect(page.locator('#fight #sql')).toBeVisible();
  const task = await page.evaluate(() => {
    const f = __bw.F;
    return { live: f.live, action: f.actionId, discipline: f.definition.discipline, effect: f.definition.effect, sql: f.task.sql };
  });
  expect(task).toMatchObject({ live: true, action: 'recover', discipline: 'support', effect: 'recover' });
  await page.locator('#fight #sql').fill(task.sql);
  await page.locator('#kb [data-fn="run"]').evaluate(button => {
    const read = () => ({ meditation: __bw.S.sk.meditation, mana: __bw.S.mana, stamina: __bw.S.stamina,
      q: __bw.S.stats.q, ok: __bw.S.stats.ok, sqlPractice: Object.values(__bw.S.skills).reduce((n, s) => n + (s.n || 0), 0) });
    // The keyboard commits on pointerdown and can replace its Run button before
    // click. Observe the real handler synchronously; do not substitute a result.
    const run = __bw.ACT.run;
    __bw.ACT.run = function(...args) {
      const before = read();
      try {
        const result = run.apply(this, args);
        window.recoverCommit = { before, after: read(), action: __bw.F.actionId, grade: __bw.F.res.grade };
        return result;
      } finally { __bw.ACT.run = run; }
    };
  });
  await page.locator('#kb [data-fn="run"]').click();
  const result = await page.evaluate(() => window.recoverCommit);
  expect(result.action).toBe('recover'); expect(result.grade).toBe('correct');
  expect(result.before.stamina).toBe(deficit);
  expect(result.after.mana).toBe(before.mana);
  expect(result.after.stamina).toBe(deficit + 12);
  expect(result.after.meditation).toBeGreaterThan(before.meditation);
  expect(result.after.q).toBe(result.before.q + 1);
  expect(result.after.ok).toBe(result.before.ok + 1);
  expect(result.after.sqlPractice).toBeGreaterThan(result.before.sqlPractice);
  await expect(page.locator('#combat-result')).toContainText('Recovered 0 mana and 12 stamina.');
  await page.locator('[data-a="combatdetails"]').click();
  await expect(sheet(page).locator('.practice-gains')).toContainText('Meditation');
  await expect(sheet(page).locator('.practice-gains')).toContainText(/\d+\.\d → \d+\.\d \(\+\d+\.\d\)/);
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
  await expect(sheet(page).locator('.journal-next')).toContainText('Complete Odalys’s free technique training');
  await expect(sheet(page).locator('details[open]')).toHaveCount(0);
  await expect(sheet(page).locator('summary').first()).toContainText('Optional SQL practice');
  await screenshot(page,info,'journal-next-step');
  await sheet(page).locator('summary').filter({hasText:'Ilva’s story'}).click();
  await expect(sheet(page)).toContainText('separate from your Technique Book');
  await sheet(page).getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>{const e=Scene.guideEnt()||{name:'Tamsin'};__bw.SH.guide(e);});
  await page.locator('#say').click();
  await expect(page.locator('#say-text')).toContainText('Dojo training teaches special techniques');
  await screenshot(page,info,'tamsin-explains-techniques');
  await speech(page);
  await page.evaluate(()=>Dev.resources({gold:1000}));
  await openVendor(page,'npc',0);
  await expect(page.locator('#say [data-a=learnpractice]')).toHaveCount(0);
  await page.locator('#say-text').click();
  await expect(page.locator('#say-text')).toContainText('inside the dojo');
  await speech(page);
  await openVendor(page,'dojo');
  await expect.poll(()=>page.evaluate(()=>!!Scene.inHall())).toBe(true);
  await openVendor(page,'odalys');
  await speech(page,'#say [data-a=learnpractice]');
  await expect(page.locator('#enc #sql')).toBeVisible();
  const before=await page.evaluate(()=>({gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana,stamina:__bw.S.stamina,sk:JSON.stringify(__bw.S.sk),attr:JSON.stringify(__bw.S.attr)}));
  let learned;
  for(let bout=0;bout<2;bout++){
    for(let i=0;i<3;i++){
      await page.locator('#enc #sql').fill(await page.evaluate(()=>__bw.Q.task.sql));
      await page.locator('#enc #kb [data-fn=run]').click();
      await expect(page.locator('#enc')).toContainText('Your query gives the requested result.');
      expect(await page.evaluate(()=>__bw.Q.practiceScore[0])).toBe(i+1);
      if(i<2){await page.waitForTimeout(350);await page.locator('#enc [data-a=learnnext]').click();}
    }
    expect(await page.evaluate(()=>__bw.S.gd)).toBe(9);
    const knowledge=await page.evaluate(()=>Object.keys(__bw.S.techniques.learned));
    expect(knowledge).toEqual(expect.arrayContaining(['swords.cross-cut','fencing.stop-thrust','archery.true-shot','magery.frost-dart']));
    if(bout===0){learned=knowledge;await page.waitForTimeout(350);await page.locator('#enc [data-a=learnnext]').click();}else expect(knowledge).toEqual(learned);
  }
  expect(await page.evaluate(()=>({gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana,stamina:__bw.S.stamina,sk:JSON.stringify(__bw.S.sk),attr:JSON.stringify(__bw.S.attr)}))).toEqual(before);
  await page.locator('#enc .q-head [data-a=qleave]').click();
  await page.evaluate(()=>{__bw.S.gd=99;__bw.S.done={};__bw.SH.journal();});
  await expect(sheet(page).locator('.journal-next h3')).toContainText('Speak to Odalys Brine about');
  await expect(page.locator('#toast [role=status]')).toHaveCount(0);
  await screenshot(page,info,'journal-after-the-guide');
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
  await page.evaluate(()=>{Dev.skills({swords:40});const ids=Dev.spawn({monster:'b102'});Dev.battle(ids[0]);const e=Scene.find(e=>e.id===ids[0]);e.combat.hp=e.combat.max=10000;e.combat.profile.attackTime=100;});
  const submit=async()=>{
    await page.waitForFunction(()=>__bw.Combat.descriptor('basic.swords').ready);
    await page.locator('#combat-bar [data-id="basic.swords"]').click();
    const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    const before=await page.evaluate(()=>__bw.S.sk.swords);
    await page.locator('#sql').fill(await page.evaluate(()=>__bw.F.task.sql));
    await page.evaluate(()=>{window.gainTestRandom=Math.random;Math.random=()=>.01;});
    try{await page.locator('#kb [data-fn=run]').click();await page.waitForFunction(()=>__bw.F&&!__bw.F.busy);}finally{await page.evaluate(()=>{Math.random=window.gainTestRandom;});}
    const after=await page.evaluate(()=>__bw.S.sk.swords);
    expect(after).toBeGreaterThan(before);
    if(!await page.evaluate(()=>__bw.F.over))await page.locator('#combat-result [data-a=combatdetails]').click();
    const gain=page.locator('#fight .practice-gains, #sheet .practice-gains').filter({visible:true});
    await expect(gain).toBeVisible();
    await expect(gain).toContainText(`${before.toFixed(1)} → ${after.toFixed(1)} (+${(after-before).toFixed(1)})`);
  };
  await submit();
  await screenshot(page,info,'battle-exchange-skill-gain');
  await page.locator('#sheet .sheet-x').click();
  await page.evaluate(()=>{__bw.F.ent.combat.hp=1;});
  await submit();
  expect(await page.evaluate(()=>__bw.F.over)).toBeTruthy();
  await screenshot(page,info,'battle-victory-skill-gain');
});
