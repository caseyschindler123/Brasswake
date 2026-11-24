const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function world(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  return page.frames().find(frame => frame.url().includes('visual_test=1'));
}

async function dismissCoach(frame) {
  const dismiss = frame.locator('[data-a=coachok]');
  if (await dismiss.isVisible()) await dismiss.click();
}

async function openMap(frame) {
  await frame.locator('#nav [data-t=map]').click();
  await dismissCoach(frame);
}

async function reopenSavedCharacter(page) {
  const game=page.frames().find(frame=>frame.url().includes('visual_test=1'));
  if(!game)throw Error('Missing game frame before deliberate save reload');
  // Finish the current view and stop old-world animation before navigation.
  // Otherwise an NPC can request a new body sheet after networkidle but
  // before the old document unloads, producing an expected ERR_ABORTED.
  await game.evaluate(()=>{Scene.debug().draw();Scene.pause();});
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await page.locator('[data-a=playslot]').first().click();
  await expect(page.locator('#title')).toBeHidden();
}

async function clickFerry(frame, id, side) {
  const position = await frame.evaluate(({ id, side }) => {
    const ferry = Scene.find(e => e.kind === 'ferry' && e.route === id && e.side === side);
    const { cam, zoom } = Scene.debug();
    return { x: (ferry.x * 16 + 8 - cam.x) * zoom, y: (ferry.y * 16 + 4 - cam.y) * zoom };
  }, { id, side });
  await frame.locator('#stage canvas.over').click({ position });
  const button = frame.locator('#say [data-a=ferryboard]');
  await expect(button).toBeVisible({ timeout: 10000 });
  return button;
}

test('legacy errand sites and lairs retain their IDs and walkable approaches', async ({ page }) => {
  const errors = observeErrors(page), frame = await world(page);
  const report = await frame.evaluate(() => {
    const map = Scene.debug().world, sites = Scene.sites(), host = __bw.HOST;
    const expected = { home: [], roam: [], poi: [], lair: host.lairs().map(lair => lair.id), fish: ['f1-pier'] };
    for (let r = 1; r <= 8; r++) {
      expected.home.push(...host.homeRoles(r).map((_, k) => `h${r}-${k}`));
      expected.roam.push(...host.roamRoles(r).map((_, k) => `w${r}-${k}`));
      expected.poi.push(...[0, 1, 2, 3, 4, 5, 6, 7, 'tower', 'shrine', 'ruin'].map(k => `p${r}-${k}`));
      expected.fish.push(...Array.from({ length: 9 }, (_, k) => `f${r}-${k}`));
    }
    const actual = Object.fromEntries(Object.keys(expected).map(kind =>
      [kind, sites.filter(site => site.kind === kind).map(site => site.id).sort()]));
    for (const ids of Object.values(expected)) ids.sort();
    const neighbors = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]];
    const unreachable = sites.filter(site => ['home', 'lair'].includes(site.kind) &&
      !neighbors.some(([dx, dy]) => {
        if (site.kind === 'home' && dx === 0 && dy === 0) return false;
        const x = site.x + dx, y = site.y + dy, i = y * map.w + x;
        return map.seen[i] && !map.solid[i] && map.t[i] !== 4 && map.reg[i] === site.r;
      })).map(site => site.id);
    const leaders = map.terr.filter(territory => territory.lair && territory.lead).map(territory => territory.lair).sort();
    return { actual, expected, unreachable, leaders };
  });
  expect(report.actual).toEqual(report.expected);
  expect(report.actual.home).toHaveLength(56);
  expect(report.actual.lair).toHaveLength(16);
  expect(report.unreachable).toEqual([]);
  expect(report.leaders).toEqual(report.expected.lair);
  expect(errors).toEqual([]);
});

test('all four ferry routes sail both ways for free and chart their actual sea lanes', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), frame = await world(page);
  const legs = await frame.evaluate(() => {
    __bw.ACT.closesheet();
    __bw.S.gold = 0;
    delete __bw.S.been[2];
    delete __bw.S.been[5];
    return Scene.ferries();
  });
  expect(legs).toHaveLength(4);
  const names = [null, 'Tallyport', 'Brackwater', 'Haverly', 'Four Fords', 'Cinderwick', 'Kell', 'Highwatch', 'Aldermoot'];
  for (const leg of legs) {
    const departure = await frame.evaluate(({ from }) => { const m=Scene.debug().world; const p=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>[from.at[0]+dx,from.at[1]+dy]).find(([x,y])=>!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x)&&m.t[y*m.w+x]!==4); if(!p)throw Error('No clear boarding approach'); Scene.load(p,from.r); return {expected:p,actual:Scene.pos()}; }, leg);
    expect(departure.actual).toEqual(departure.expected);
    await frame.waitForTimeout(650);
    const outbound = await clickFerry(frame, leg.id, 'from');
    await expect(outbound).toHaveText('Board for ' + names[leg.to.r]);
    await expect(frame.locator('#say-text')).toContainText('free crossing');
    const stale = await outbound.evaluate(button => ({ ...button.dataset }));
    await outbound.click();
    await expect.poll(() => frame.evaluate(() => ({ r: __bw.S.region, gold: __bw.S.gold, been: !!__bw.S.been[Scene.region()] })))
      .toEqual({ r: leg.to.r, gold: 0, been: true });
    const landed = await frame.evaluate(({ at }) => {
      const p = Scene.pos(), m = Scene.debug().world, i = p[1] * m.w + p[0];
      return { quayside: Math.abs(at[0] - p[0]) + Math.abs(at[1] - p[1]) === 1,
        blocked: !!(m.solid[i] || m.occ.has(i)), saved: p.join() === __bw.S.pos.join() };
    }, leg.to);
    expect(landed).toEqual({ quayside: true, blocked: false, saved: true });
    await frame.evaluate(data => __bw.ACT.ferryboard(data), stale);
    expect(await frame.evaluate(() => Scene.region())).toBe(leg.to.r);
    if (leg.to.r === 2 || leg.to.r === 5) await screenshot(page, info, 'ferry-arrival-' + names[leg.to.r].toLowerCase());

    await frame.waitForTimeout(650);
    const inbound = await clickFerry(frame, leg.id, 'to');
    await expect(inbound).toHaveText('Board for ' + names[leg.from.r]);
    await inbound.click();
    await expect.poll(() => frame.evaluate(() => Scene.region())).toBe(leg.from.r);
  }
  await openMap(frame);
  await frame.locator('[data-a=cmapview][data-mode=world]').click();
  await expect(frame.locator('.ferry-routes polyline[stroke-dasharray]')).toHaveCount(4);
  await frame.locator('[data-a=cmapview][data-mode=region]').click();
  await frame.locator('[data-a=cmapregion][data-r="8"]').first().click();
  await expect(frame.locator('#view')).toContainText('Ferry destinations');
  await expect(frame.locator('#view')).toContainText('Free crossing');
  await screenshot(page, info, 'world-map-ferries');
  expect(errors).toEqual([]);
});

test('regional town travel and a home pad save arrivals immediately and reject remote town travel', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), frame = await world(page);
  await frame.evaluate(() => {
    Sound.setMu(false);
    const [x, y] = Scene.towns()[1];
    __bw.S.homes.push({ id: 'h-travel', name: 'Travel Cottage', r: 1, x: x + 55, y: y - 38,
      w: 3, h: 2, shape: 0, mat: 1, wall: '#8c7858', roof: '#633a2c', pad: 1, chest: [] });
    Scene.restoreHomes(__bw.S.homes);
    __bw.S.pos = Scene.pos();
    __bw.S.been[2] = 1;
    __bw.S.cartography.maps[2] = true;
    __bw.save();
  });
  await openMap(frame);
  await frame.locator('[data-a=cmapregion][data-r="2"]').first().click();
  await expect(frame.locator('[data-a=cmaptravel]')).toHaveCount(0);
  const beforeRemote = await frame.evaluate(() => Scene.pos());
  await frame.evaluate(() => __bw.ACT.travel({r:2}));
  expect(await frame.evaluate(() => Scene.pos())).toEqual(beforeRemote);
  await frame.evaluate(() => { const t=Scene.towns()[2]; Scene.load([t[0]+10,t[1]+18],2); __bw.S.pos=Scene.pos(); });
  await openMap(frame);
  await frame.locator('[data-a=cmaptravel][data-id=town2]').click();
  const brackwater = await frame.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const world = saved.worlds[saved.world], slot = world.slots[world.cur];
    return { actual: Scene.pos(), stored: slot.pos, region: slot.region };
  });
  expect(brackwater.stored).toEqual(brackwater.actual);
  expect(brackwater.region).toBe(2);
  await reopenSavedCharacter(page);
  expect(await page.evaluate(() => ({ actual: Scene.pos(), region: Scene.region() })))
    .toEqual({ actual: brackwater.actual, region: 2 });

  await openMap(page);
  await page.locator('[data-a=tphome][data-h="h-travel"]').click();
  const cottage = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const world = saved.worlds[saved.world], slot = world.slots[world.cur];
    return { actual: Scene.pos(), stored: slot.pos, region: slot.region };
  });
  expect(cottage.stored).toEqual(cottage.actual);
  expect(cottage.region).toBe(1);
  const occupiedLanding = await page.evaluate(at => {
    const w = Scene.debug().world, index = at[1]*w.w+at[0];
    const e = w.ents.find(e => e.solid && e.wander && !e.busy && !e.hunt && !(e.chase > 0));
    if (!e) throw new Error('No wandering creature for the occupied landing regression');
    const old = e.y*w.w+e.x;
    if (w.occ.get(old) === e) w.occ.delete(old);
    e.x = e.fx = at[0]; e.y = e.fy = at[1]; e.tx = e.ty = null;
    w.occ.set(index,e);
    Scene.load(at,1);
    const moved = [e.x,e.y], occupied = w.occ.get(e.y*w.w+e.x) === e;
    const actual = Scene.pos(), clear = !w.occ.has(index), dry = !w.solid[e.y*w.w+e.x] && w.t[e.y*w.w+e.x] !== 4;
    const fixed = w.ents.find(e => e.r === 1 && e.solid && !e.wander && e.kind === 'npc');
    if (!fixed) throw new Error('No fixed story character for the landing guard regression');
    const anchor = [fixed.x,fixed.y];
    Scene.load(anchor,1);
    const fixedStayed = fixed.x === anchor[0] && fixed.y === anchor[1] && w.occ.get(anchor[1]*w.w+anchor[0]) === fixed;
    const avoidedFixed = Scene.pos().some((n,i) => n !== anchor[i]);
    Scene.load(at,1);
    return { actual, moved, clear, occupied, dry, fixedStayed, avoidedFixed };
  }, cottage.actual);
  expect(occupiedLanding.actual).toEqual(cottage.actual);
  expect(occupiedLanding.moved).not.toEqual(cottage.actual);
  expect(occupiedLanding).toMatchObject({clear:true,occupied:true,dry:true,fixedStayed:true,avoidedFixed:true});
  await reopenSavedCharacter(page);
  expect(await page.evaluate(() => ({ actual: Scene.pos(), region: Scene.region() })))
    .toEqual({ actual: cottage.actual, region: 1 });
  await screenshot(page, info, 'home-pad-restored');
  expect(errors).toEqual([]);
});

test('a cloud replacement invalidates an open ferry ticket at the same quay', async ({ page }) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), frame = await world(page);
  const trip = await frame.evaluate(() => {
    Sound.setMu(false);
    const ferry = Scene.ferries()[0], [x, y] = ferry.from.at;
    const at = [[x, y + 1], [x + 1, y], [x - 1, y], [x, y - 1]].find(p =>
      Scene.safePosition(p, 1)?.join() === p.join());
    if (!at) throw Error('No safe quayside position');
    __bw.S.pos = at;
    __bw.save();
    return { id: ferry.id, at };
  });
  await page.addInitScript(() => {
    if (location.pathname !== '/index.html') return;
    const account = new Promise(resolve => { window.__restoreFerryAccount = resolve; });
    window.__bwFast = true;
    window.claude = { use: async kind => {
      if (kind === 'user') return { id: async () => 'ferry-fixture' };
      const json = await account;
      return { doc: key => ({
        get: async () => key.endsWith('/acct') ? { exists: true, data: () => ({ json }) } : { exists: false },
        set: async () => {},
      }) };
    } };
  });
  await reopenSavedCharacter(page);
  await page.waitForTimeout(650);
  const button = await clickFerry(page, trip.id, 'from');
  const staleTicket = await button.evaluate(el => ({ ...el.dataset }));
  await page.evaluate(() => {
    const remote = JSON.parse(JSON.stringify(__bw.A));
    remote.rev += 10000;
    const world = remote.worlds[remote.world];
    world.slots[world.cur].name = 'Cloud Ferry Keeper';
    window.__restoreFerryAccount(JSON.stringify(remote));
  });
  await expect(page.locator('#hud')).toContainText('Cloud Ferry Keeper');
  await expect(page.locator('#say')).toBeHidden();
  await page.evaluate(data => __bw.ACT.ferryboard(data), staleTicket);
  expect(await page.evaluate(() => ({ at: Scene.pos(), r: Scene.region() }))).toEqual({ at: trip.at, r: 1 });
  expect(errors).toEqual([]);
});

test('Grand Market specialists sell their own goods at existing prices', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await world(page);
  const open = specialty => frame.evaluate(index => {
    __bw.ACT.closesheet();
    const e = Scene.find(n => n.kind === 'specialist' && n.specialty === index);
    __bw.HOST.interact(e);
  }, specialty);
  const shops = await frame.evaluate(() => {
    Scene.load(null, 8);
    __bw.S.gold = 1000;
    return Scene.ents().filter(e => e.kind === 'specialist').map(e => e.name);
  });
  expect(shops).toEqual(['Weaponsmith', 'Armourer', 'Fletcher', 'Bookseller', 'Apothecary', 'Baker',
    'Fishmonger', 'Clothier', 'Carpenter', 'Stonemason', 'Jeweller', 'Provisioner']);
  await open(2);
  await dismissCoach(frame);
  await expect(frame.locator('#sheet h2')).toHaveText('Fletcher');
  await expect(frame.locator('#sheet .goods')).toContainText('Archery');
  await expect(frame.locator('#sheet [data-a=buygear]')).toHaveCount(2);
  const price = await frame.locator('#sheet [data-a=buygear]').first().textContent();
  await frame.locator('#sheet [data-a=buygear]').first().click();
  expect(await frame.evaluate(() => ({ gold: __bw.S.gold, skill: __bw.S.inv.at(-1).w })))
    .toEqual({ gold: 1000 - parseInt(price, 10), skill: 'archery' });
  await expect(frame.locator('#sheet [data-a=buygear]')).toHaveCount(1);

  await open(5);
  await dismissCoach(frame);
  await expect(frame.locator('#sheet .goods')).toContainText('Dark bread');
  await expect(frame.locator('#sheet .goods')).toContainText('Meat pie');
  await expect(frame.locator('#sheet [data-a=buygear]')).toHaveCount(0);
  await open(9);
  await dismissCoach(frame);
  await frame.locator('#sheet [data-a=deeds]').click();
  await expect(frame.locator('#sheet [data-a=dmat]')).toHaveText(['Stone']);
  await expect(frame.locator('#sheet .goods')).toContainText('Stone cottage');
  await screenshot(page, info, 'stone-house-deeds');
  expect(errors).toEqual([]);
});
