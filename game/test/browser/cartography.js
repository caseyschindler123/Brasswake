const { test, expect } = require('@playwright/test');
const { PNG } = require('playwright-core/lib/utilsBundle');
const { observeErrors, screenshot } = require('./flow');

const nav = (frame, tab) => frame.locator(`#nav [data-t=${tab}]`);
const action = (frame, name, scope = '') => frame.locator(`${scope} [data-a=${name}]`.trim());
const position = frame => frame.evaluate(() => Scene.pos());

async function adventure(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  await frame.evaluate(() => {
    Sound.setMu(false);
    // Leave every actor in the real collision map. Keep unrelated patrols still.
    for (const actor of Scene.ents()) if (actor.wander) {
      actor.wander = 0;
      actor.tx = null;
      actor.fx = actor.x;
      actor.fy = actor.y;
    }
  });
  return frame;
}

async function dismissCoach(frame) {
  const coach = action(frame, 'coachok');
  if (await coach.isVisible()) await coach.click();
}

async function openTab(frame, tab) {
  await nav(frame, tab).click();
  await dismissCoach(frame);
}

async function closeSheet(frame) {
  await frame.locator('.sheet-x').click();
  await expect(frame.locator('#sheet')).toBeHidden();
}

async function reloadCharacter(page, slot = 0) {
  // Pause world events through the real menu before tearing down the document.
  // The old page's networkidle event may already have fired before a new ambient
  // fetch starts; waiting for that event again does not drain current effects.
  const active = page.frames().find(frame => frame.url().includes('visual_test=1'));
  await openTab(active, 'hero');
  await expect.poll(() => active.evaluate(() => {
    const effects = Sound.status().effects;
    return effects.loading.length + effects.queued.length;
  })).toBe(0);
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await page.locator(`[data-a=playslot][data-i="${slot}"]`).click();
  await expect(page.locator('#title')).toBeHidden();
}

async function standBy(frame, kind, fields = {}, interact = false) {
  const result = await frame.evaluate(({ kind, fields, interact }) => {
    const e = Scene.find(e => e.kind === kind && Object.entries(fields).every(([key, value]) => e[key] === value));
    if (!e) throw Error('Missing fixture entity ' + kind + JSON.stringify(fields));
    const { world } = Scene.debug();
    const at = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [e.x + dx, e.y + dy])
      .find(([x, y]) => {
        const tile = y * world.w + x;
        return world.reg[tile] === e.r && !world.solid[tile] && !world.occ.has(tile) && world.t[tile] !== 4;
      });
    if (!at) throw Error('No clear cardinal approach to ' + e.name);
    Scene.hop(...at);
    if (interact) __bw.HOST.interact(e);
    return { at, live: Scene.pos() };
  }, { kind, fields, interact });
  expect(result.live).toEqual(result.at);
  return result.at;
}

async function nativeStep(frame, target) {
  const from = await position(frame);
  const dx = target[0] - from[0], dy = target[1] - from[1];
  expect(Math.abs(dx) + Math.abs(dy), `Cardinal step from ${from} to ${target}`).toBe(1);
  const key = dx ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
  await frame.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  const keyboard = frame.page().keyboard;
  await keyboard.down(key);
  try {
    await frame.waitForFunction(({target,dx,dy}) => {
      const p=Scene.debug().P;
      return (dx?(p.fx-target[0])*dx>=0:Math.round(p.fx)===target[0]) &&
        (dy?(p.fy-target[1])*dy>=0:Math.round(p.fy)===target[1]);
    }, {target,dx,dy}, { timeout: 5000 });
  } finally {
    await keyboard.up(key);
  }
  await expect.poll(() => position(frame)).toEqual(target);
  await frame.waitForFunction(() => !Scene.traveling());
}

async function mapSamples(frame, points) {
  const image = frame.locator('#view .cmap-frame img');
  await expect(image).toBeVisible();
  const chart = await image.evaluate(async image => {
    await image.decode();
    return { src: image.currentSrc, size: Scene.size, width: image.naturalWidth, height: image.naturalHeight };
  });
  expect([chart.width, chart.height]).toEqual(chart.size);
  expect(chart.src).toMatch(/^data:image\/png;base64,/);
  // Check the displayed raster itself. WebKit can return an empty readback from
  // a second world-sized canvas even when this decoded PNG is fully opaque.
  const pixels = PNG.sync.read(Buffer.from(chart.src.split(',')[1], 'base64'));
  expect([pixels.width, pixels.height]).toEqual(chart.size);
  return points.map(([x,y]) => {
    expect(x >= 0 && y >= 0 && x < pixels.width && y < pixels.height).toBe(true);
    const index = 4 * (y * pixels.width + x);
    return Array.from(pixels.data.subarray(index,index+4));
  });
}

async function showWorldMap(frame) {
  await openTab(frame, 'map');
  const world = frame.locator('[data-a=cmapview][data-mode=world]');
  if (await world.getAttribute('aria-pressed') !== 'true') await world.click();
}

const black = [0, 0, 0, 255];

test('cartography · walking reveals the actual fog raster and persists by character', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await adventure(page);
  const { start, route, newlyRevealed, far } = await frame.evaluate(() => {
    const m = Scene.debug().world, start = Scene.pos(), { mask } = __bw.CMap.visual();
    const open = ([x, y]) => !m.solid[y * m.w + x] && !m.occ.has(y * m.w + x) && m.t[y * m.w + x] !== 4;
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const route = Array.from({ length: 5 }, (_, i) => [start[0] + (i + 1) * dx, start[1] + (i + 1) * dy]);
      if (!route.every(open)) continue;
      const last = route.at(-1), predicted = mask.slice();
      Cartography.reveal(predicted, ...last);
      for (let y = last[1] - 13; y <= last[1] + 13; y++) for (let x = last[0] - 13; x <= last[0] + 13; x++) {
        if (m.t[y * m.w + x] !== 4 && !Cartography.exploredAt(mask, x, y) && Cartography.exploredAt(predicted, x, y)) {
          return { start, route, newlyRevealed: [x, y], far: Scene.towns()[8] };
        }
      }
    }
    throw Error('No clear short walk toward unexplored land');
  });
  await showWorldMap(frame);
  const [local, before, remote] = await mapSamples(frame, [start, newlyRevealed, far]);
  expect(local).not.toEqual(black);
  expect(local[3]).toBe(255);
  expect(before).toEqual(black);
  expect(remote).toEqual(black);
  const exploredPointInView = await frame.locator('#view .cmap-frame img').evaluate((image, [x, y]) => {
    const chart = image.getBoundingClientRect(), panel = document.querySelector('#view').getBoundingClientRect();
    const screenX = chart.left + (x + 0.5) * chart.width / image.naturalWidth;
    const screenY = chart.top + (y + 0.5) * chart.height / image.naturalHeight;
    return screenX >= panel.left && screenX <= panel.right && screenY >= panel.top && screenY <= panel.bottom;
  }, start);
  expect(exploredPointInView, 'The world chart initially shows the explored ground around the player').toBe(true);
  await screenshot(page, info, 'cartography-fog');
  await openTab(frame, 'world');
  for (const tile of route) await nativeStep(frame, tile);
  await showWorldMap(frame);
  const [revealed, stillRemote] = await mapSamples(frame, [newlyRevealed, far]);
  expect(revealed).not.toEqual(black);
  expect(revealed[3]).toBe(255);
  expect(stillRemote).toEqual(black);

  await openTab(frame, 'hero');
  await action(frame, 'export').click();
  const code = await frame.locator('#savebox').inputValue();
  const exported = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  const world = exported.worlds[exported.world], walked = world.slots[world.cur];
  expect(walked.pos).toEqual(route.at(-1));
  expect(walked.cartography.explored.length).toBeGreaterThan(0);
  await closeSheet(frame);
  await action(frame, 'import').click();
  await frame.locator('#savebox').fill(code);
  await action(frame, 'doimport').click();
  await expect(frame.locator('#sheet')).toBeHidden();

  await reloadCharacter(page, world.cur);
  expect(await position(page)).toEqual(walked.pos);
  await showWorldMap(page);
  expect(await mapSamples(page, [newlyRevealed, far])).toEqual([revealed, black]);

  // Supply a supporting character at the original tile, then switch through the real title controls.
  await page.evaluate(start => {
    const snapshot = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const world = snapshot.worlds[snapshot.world];
    __bw.A.slots[1] = { ...world.slots[world.cur], name: 'Supporting Cartographer', pos: start,
      cartography: Cartography.create() };
    __bw.save();
  }, start);
  await openTab(page, 'hero');
  await action(page, 'reset').click();
  await page.getByRole('button', { name: /Supporting Cartographer/ }).click();
  expect(await position(page)).toEqual(start);
  await showWorldMap(page);
  expect(await mapSamples(page, [newlyRevealed])).toEqual([black]);
  expect(errors).toEqual([]);
});

test('cartography · eight real shops have reachable keepers and road signs read their approaches', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await adventure(page);
  const result = await frame.evaluate(() => {
    const { world: m } = Scene.debug(), cardinal = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const dry = (x, y) => !m.solid[y * m.w + x] && m.t[y * m.w + x] !== 4 && !m.occ.has(y * m.w + x);
    const regions = Array.from({ length: 8 }, (_, n) => n + 1);
    const shops = regions.map(r => {
      const b = m.blds.find(b => b.r === r && b.cartographer);
      const keeper = m.ents.find(e => e.r === r && e.kind === 'cartographer');
      const chart = m.ents.find(e => e.r === r && e.kind === 'regionchart');
      if (!b || !keeper || !chart) return { r, missing: true };
      const approach = Scene.spots()['cartographer' + r];
      const doors = b.plan.doors.some(d => [d.outside, d, d.inside].every(p => dry(b.x + p.x, b.y + p.y)));
      const route = new Set([approach.join()]), queue = [approach];
      for (let i = 0; i < queue.length; i++) for (const [dx, dy] of cardinal) {
        const x = queue[i][0] + dx, y = queue[i][1] + dy, id = [x, y].join();
        if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h || route.has(id) || !dry(x, y)) continue;
        route.add(id);
        queue.push([x, y]);
      }
      return { r, doors, linked: keeper.x >= b.x && keeper.x < b.x + b.w && keeper.y >= b.y && keeper.y < b.y + b.h,
        accessible: cardinal.some(([x, y]) => route.has([keeper.x + x, keeper.y + y].join())),
        chart: chart.name, compass: m.props.some(p => p.kind === 'compass_sign' && p.r === r) };
    });
    const sign = m.ents.find(e => e.kind === 'roadsign' && e.r === 1 && Scene.cartographySign(e).length >= 2);
    const labels = sign && Scene.cartographySign(sign).filter(arm => arm.direction !== 'Here').map(arm => {
      // A sign directs the next ground leg. The route planner may find a shorter
      // overall journey via a ferry, which is intentionally unavailable to this check.
      const target = m.cartography.named.get(arm.id).at;
      const plan = m.cartography.navigator.route([sign.x, sign.y], target, []);
      const delta = cardinal[['North', 'East', 'South', 'West'].indexOf(arm.direction)];
      return { name: arm.name, direction: arm.direction,
        consistent: !!plan && plan.path[1]?.join() === [sign.x + delta[0], sign.y + delta[1]].join() &&
          plan.path.at(-1).join() === target.join() && plan.path.every(([x, y]) => dry(x, y)) };
    });
    const sites = Scene.cartographyCatalogue();
    return { shops, sign: sign && { r: sign.r, name: sign.name, x: sign.x, y: sign.y }, labels,
      missingGateways: regions.filter(r => !['town', 'stairs'].every(kind => sites.some(d => d.r === r && d.kind === kind)) ||
        !['shop', 'civic'].every(prefix => sites.some(d => d.r === r && d.id === prefix + r))),
      leaks: sites.filter(d => !Cartography.isPublicDestination(d) || d.secret || /^(dlore|dsecret|lair|home)/.test(d.id)),
      blocked: sites.filter(d => !dry(...d.at)).map(d => d.id) };
  });
  expect(result.shops).toHaveLength(8);
  for (const shop of result.shops) {
    expect(shop, `Region ${shop.r}`).toMatchObject({ doors: true, linked: true, accessible: true, compass: true });
    expect(shop.chart).toContain('wall chart');
  }
  expect(result.missingGateways).toEqual([]);
  expect(result.leaks).toEqual([]);
  expect(result.blocked).toEqual([]);
  expect(result.labels.length).toBeGreaterThan(0);
  for (const label of result.labels) expect(label.consistent, label.name).toBe(true);
  await standBy(frame, 'roadsign', result.sign, true);
  await expect(frame.locator('#sheet h2')).toHaveText(result.sign.name);
  for (const label of result.labels) await expect(frame.locator('#sheet li').filter({ hasText: label.name })).toContainText(label.direction);
  await screenshot(page, info, 'cartography-road-sign');
  expect(errors).toEqual([]);
});

test('cartography · consulting the shop chart sets a safe waypoint without spending or revealing', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await adventure(page);
  await standBy(frame, 'cartographer', { r: 1 }, true);
  await expect(frame.locator('#sheet h2')).toHaveText('Cartographer');
  const before = await frame.evaluate(() => ({ gold: __bw.S.gold, explored: __bw.CMap.snapshot().explored }));
  await action(frame, 'cmapchart', '#sheet').click();
  await expect(frame.locator('#sheet h2')).toHaveText('Tallyport wall chart');
  await expect(frame.locator('#sheet .cmap-frame img')).toBeVisible();
  await expect(action(frame, 'cmaptravel', '#sheet')).toHaveCount(0);
  const obscured = await frame.locator('#sheet .cmap-destinations li').evaluateAll(rows => rows.flatMap(row => {
    const label = row.querySelector('b'), button = row.querySelector('button').getBoundingClientRect();
    const text = document.createRange();
    text.selectNodeContents(label);
    const overlaps = [...text.getClientRects()].some(rect => rect.left < button.right && rect.right > button.left &&
      rect.top < button.bottom && rect.bottom > button.top);
    return overlaps ? [label.textContent] : [];
  }));
  expect(obscured, 'Waypoint buttons leave destination names readable').toEqual([]);
  const publicIds = await frame.evaluate(() => Scene.cartographyCatalogue().filter(d => d.r === 1).map(d => d.id));
  expect(await action(frame, 'cmapwaypoint', '#sheet').evaluateAll(buttons => buttons.map(b => b.dataset.id))).toEqual(publicIds);
  await screenshot(page, info, 'cartography-free-shop-chart');
  await frame.locator('#sheet [data-a=cmapwaypoint][data-id=stairs1]').click();
  await expect(frame.locator('#sheet')).toBeHidden();
  const active = await frame.evaluate(() => {
    const m = Scene.debug().world, route = Scene.cartographyRoute('stairs1'), guide = __bw.CMap.guide();
    const state = __bw.CMap.snapshot();
    return { gold: __bw.S.gold, explored: state.explored, maps: state.maps, target: state.waypoint,
      dry: route.path.every(([x, y]) => !m.solid[y * m.w + x] && m.t[y * m.w + x] !== 4),
      end: route.path.at(-1), destination: route.target.at, next: route.path[1], guide };
  });
  expect(active).toMatchObject({ ...before, maps: {}, target: { id: 'stairs1' }, dry: true, end: active.destination });
  expect(active.guide.name).toContain('Bilge Vaults');
  expect(active.guide.distance).toBeGreaterThan(3);
  await nativeStep(frame, active.next);
  expect(await frame.evaluate(() => __bw.CMap.guide().distance)).toBeLessThan(active.guide.distance);
  await screenshot(page, info, 'cartography-ground-waypoint');
  expect(errors).toEqual([]);
});

test('cartography · buying a map charges once and only permits local regional travel', async ({ page }) => {
  const errors = observeErrors(page), frame = await adventure(page);
  await frame.evaluate(() => { __bw.S.gold = 599; });
  const original = await standBy(frame, 'cartographer', { r: 1 }, true);
  const buy = action(frame, 'cmapbuy', '#sheet');
  await expect(buy).toBeDisabled();
  const poor = await buy.evaluate(button => ({ ...button.dataset }));
  await frame.evaluate(ticket => __bw.ACT.cmapbuy(ticket), poor);
  expect(await frame.evaluate(() => __bw.S.gold)).toBe(599);
  await closeSheet(frame);

  await frame.evaluate(() => { __bw.S.gold = 1000; });
  await standBy(frame, 'cartographer', { r: 1 }, true);
  await expect(buy).toContainText('600 gold');
  const ticket = await buy.evaluate(button => ({ ...button.dataset }));
  await buy.click();
  await expect(frame.locator('#sheet')).toContainText('Map owned by this character');
  await frame.evaluate(ticket => __bw.ACT.cmapbuy(ticket), ticket);
  expect(await frame.evaluate(() => ({ gold: __bw.S.gold, maps: __bw.S.cartography.maps })))
    .toEqual({ gold: 400, maps: { 1: true } });
  await closeSheet(frame);
  // Ownership of a second region is deliberately present. It still grants no travel from here.
  await frame.evaluate(() => { __bw.S.cartography.maps[2] = true; });
  await openTab(frame, 'map');
  await frame.locator('[data-a=cmapregion][data-r="2"]').click();
  await expect(action(frame, 'cmaptravel', '#view')).toHaveCount(0);
  await frame.evaluate(() => __bw.ACT.cmaptravel({ id: 'stairs2' }));
  expect(await position(frame)).toEqual(original);

  await frame.locator('[data-a=cmapregion][data-r="1"]').click();
  const arrival = await frame.evaluate(() => Scene.cartographyCatalogue().find(d => d.id === 'stairs1').at);
  await frame.locator('#view [data-a=cmaptravel][data-id=stairs1]').click();
  await expect.poll(() => position(frame)).toEqual(arrival);
  expect(await frame.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const world = stored.worlds[stored.world], s = world.slots[world.cur];
    return { at: s.pos, region: s.region, gold: s.gold, owns: s.cartography.maps[1], surface: !Scene.inDungeon() };
  })).toEqual({ at: arrival, region: 1, gold: 400, owns: true, surface: true });
  await reloadCharacter(page);
  expect(await page.evaluate(() => ({ at: Scene.pos(), gold: __bw.S.gold, owns: __bw.S.cartography.maps[1] })))
    .toEqual({ at: arrival, gold: 400, owns: true });
  expect(errors).toEqual([]);
});

test('cartography · the Grand Atlas is a single installed household feature gated per character', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await adventure(page);
  await frame.evaluate(() => {
    __bw.S.gold = 31500;
    for (let r = 1; r <= 7; r++) __bw.S.cartography.maps[r] = true;
  });
  await standBy(frame, 'cartographer', { r: 1 }, true);
  await expect(action(frame, 'cmapbuyatlas', '#sheet')).toHaveCount(0);
  await closeSheet(frame);
  await standBy(frame, 'cartographer', { r: 8 }, true);
  const buy = action(frame, 'cmapbuyatlas', '#sheet');
  await expect(buy).toBeDisabled();
  await expect(frame.locator('#sheet')).toContainText('Collect all eight regional maps');
  const early = await buy.evaluate(button => ({ ...button.dataset }));
  await frame.evaluate(ticket => __bw.ACT.cmapbuyatlas(ticket), early);
  expect(await frame.evaluate(() => __bw.S.gold)).toBe(31500);
  await closeSheet(frame);
  await frame.evaluate(() => { __bw.S.cartography.maps[8] = true; });
  await standBy(frame, 'cartographer', { r: 8 }, true);
  await expect(buy).toHaveText('Buy atlas · 30,000 gold');
  const buyTicket = await buy.evaluate(button => ({ ...button.dataset }));
  await buy.click();
  await expect(frame.locator('#sheet')).toContainText('Your household owns the atlas');
  await frame.evaluate(ticket => __bw.ACT.cmapbuyatlas(ticket), buyTicket);
  expect(await frame.evaluate(() => ({ gold: __bw.S.gold, owned: __bw.A.atlas.owned, installed: __bw.A.atlas.homeId,
    entity: !!Scene.find(e => e.kind === 'homeatlas') }))).toEqual({ gold: 1500, owned: true, installed: null, entity: false });
  await closeSheet(frame);

  const home = await frame.evaluate(() => {
    const [cx, cy] = Scene.towns()[1], {world:m} = Scene.debug();
    const width = 6, height = 4, lairs = Scene.sites().filter(s => s.kind === 'lair');
    const plots = [];
    for (let y = Math.max(6,cy-160); y <= Math.min(m.h-height-3,cy+160); y++) for (let x = Math.max(2,cx-160); x <= Math.min(m.w-width-3,cx+160); x++) {
      if (m.reg[y*m.w+x] !== 1 || lairs.some(s => Math.hypot(s.x-x-width/2,s.y-y-height/2) < 15)) continue;
      plots.push({x,y,score:Math.abs(x-(cx+55))+Math.abs(y-(cy-38))});
    }
    plots.sort((a,b) => a.score-b.score);
    // A separate discovery lesson must not interrupt the actual keyboard walk.
    const at = plots.find(({x,y}) => {
      for (let yy=y-5; yy<=y+height+1; yy++) for (let xx=x-1; xx<=x+width; xx++) {
        const i=yy*m.w+xx;
        if (!m.seen[i] || m.solid[i] || m.keep[i] || m.t[i]>1 || m.occ.has(i) || Geography.inTown(xx,yy,4)) return false;
      }
      return !Scene.homeFits(x,y,width,height);
    });
    if (!at) throw Error('No legal Atlas Cottage parcel clear of lair lessons');
    const h = { id: 'h-atlas', name: 'Atlas Cottage', r: 1, x: at.x, y: at.y, w: width, h: height,
      shape: 9, mat: 1, wall: '#8c7858', roof: '#633a2c', chest: [] };
    __bw.S.homes.push(h);
    if (Scene.restoreHomes(__bw.S.homes)) throw Error('The Atlas Cottage moved off the selected parcel');
    __bw.CMap.restore();
    return h;
  });
  const outside = await standBy(frame, 'myhome', { hid: home.id }, true);
  await expect(frame.locator('#sheet h2').first()).toHaveText(home.name);
  await action(frame, 'cmapinstall', '#sheet').click();
  await expect(frame.locator('#sheet')).toBeHidden();
  expect(await frame.evaluate(() => ({ home: __bw.A.atlas.homeId, entities: Scene.ents().filter(e => e.kind === 'homeatlas').length })))
    .toEqual({ home: home.id, entities: 1 });
  await openTab(frame, 'map');
  await expect(action(frame, 'cmapatlastravel', '#view')).toHaveCount(0);
  await frame.evaluate(() => __bw.ACT.cmapatlastravel({ id: 'town8' }));
  expect(await position(frame)).toEqual(outside);
  await openTab(frame, 'world');

  const entrance = await frame.evaluate(id => {
    const b = Scene.debug().world.blds.find(b => b.home?.id === id);
    const x = b.x + b.room.door;
    return { door: [x, b.y + b.h], path: [[x, b.y + b.h - 1], [x, b.y + b.h - 2], [x, b.y + 1]] };
  }, home.id);
  await frame.evaluate(([x, y]) => Scene.hop(x, y), entrance.door);
  expect(await position(frame)).toEqual(entrance.door);
  for (const tile of entrance.path) await nativeStep(frame, tile);
  expect(await frame.evaluate(home => Scene.cartographyInsideHome(home), home)).toBe(true);
  await expect(frame.locator('#toast [role=status]')).toHaveCount(0);
  await screenshot(page, info, 'cartography-atlas-installed');
  await frame.evaluate(() => __bw.HOST.interact(Scene.find(e => e.kind === 'homeatlas')));
  await expect(frame.locator('#sheet h2')).toHaveText('Grand Atlas of Brasswake');
  await frame.locator('#sheet .cmap-regions [data-a=cmapregion][data-r="8"]').click();
  const travel = frame.locator('#sheet [data-a=cmapatlastravel][data-id=town8]');
  const atlasTicket = await travel.evaluate(button => ({ ...button.dataset }));
  const standing = await position(frame);

  // A still-open ticket cannot authorize travel from the yard or with missing character maps.
  await frame.evaluate(({ outside, atlasTicket }) => { Scene.hop(...outside); __bw.ACT.cmapatlastravel(atlasTicket); }, { outside, atlasTicket });
  expect(await position(frame)).toEqual(outside);
  await frame.evaluate(({ standing, atlasTicket }) => {
    Scene.hop(...standing);
    delete __bw.S.cartography.maps[8];
    __bw.ACT.cmapatlastravel(atlasTicket);
  }, { standing, atlasTicket });
  expect(await position(frame)).toEqual(standing);
  await frame.evaluate(() => { __bw.S.cartography.maps[8] = true; });
  await travel.click();
  const target = await frame.evaluate(() => Scene.cartographyCatalogue().find(d => d.id === 'town8').at);
  await expect.poll(() => position(frame)).toEqual(target);
  await frame.evaluate(ticket => __bw.ACT.cmapatlastravel({ ...ticket, id: 'town2' }), atlasTicket);
  expect(await position(frame)).toEqual(target);

  await reloadCharacter(page);
  expect(await page.evaluate(() => ({ at: Scene.pos(), house: __bw.A.atlas.homeId, gold: __bw.S.gold, restored: !!Scene.find(e => e.kind === 'homeatlas') })))
    .toEqual({ at: target, house: home.id, gold: 1500, restored: true });
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const world = stored.worlds[stored.world];
    __bw.A.slots[1] = { ...world.slots[world.cur], name: 'Supporting Atlas Reader', cartography: Cartography.create() };
    __bw.save();
  });
  await openTab(page, 'hero');
  await action(page, 'reset').click();
  await page.getByRole('button', { name: /Supporting Atlas Reader/ }).click();
  await page.evaluate(({ tile, home }) => {
    Scene.hop(...tile);
    if (!Scene.cartographyInsideHome(home)) throw Error('Supporting character is outside the installed house');
    __bw.HOST.interact(Scene.find(e => e.kind === 'homeatlas'));
  }, { tile: entrance.path.at(-1), home });
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#toast')).toContainText('Collect all eight');
  expect(errors).toEqual([]);
});

test('cartography · a waypoint leads to a real ferry and completes after the island foot leg', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await adventure(page);
  const setup = await frame.evaluate(() => {
    __bw.S.cartography.maps[2] = true;
    const route = Scene.cartographyRoute('town2');
    if (!route?.boarding || route.path.length < 5) throw Error('No usable initial ferry route');
    const approach = route.path.slice(-4);
    Scene.hop(...approach[0]);
    return { approach, crossing: route.boarding };
  });
  expect(await position(frame)).toEqual(setup.approach[0]);
  await openTab(frame, 'map');
  await frame.locator('[data-a=cmapregion][data-r="2"]').click();
  await frame.locator('#view [data-a=cmapwaypoint][data-id=town2]').click();
  await openTab(frame, 'world');
  expect(await frame.evaluate(() => __bw.CMap.guide().boarding)).toEqual(setup.crossing);
  for (const tile of setup.approach.slice(1)) await nativeStep(frame, tile);
  const board = await frame.evaluate(({ route, side }) => {
    const e = Scene.find(e => e.kind === 'ferry' && e.route === route && e.side === side);
    const { cam, zoom } = Scene.debug();
    return { guide: __bw.CMap.guide(), tile: [e.x, e.y], screen: { x: (e.x * 16 + 8 - cam.x) * zoom, y: (e.y * 16 + 4 - cam.y) * zoom } };
  }, setup.crossing);
  expect(board.guide).toMatchObject({ at: board.tile, distance: 0, name: 'Board the ferry to Brackwater' });
  await expect(frame.locator('#toast [role=status]')).toHaveCount(0);
  await screenshot(page, info, 'cartography-ferry-waypoint');
  await frame.locator('#stage canvas.over').click({ position: board.screen });
  const crossing = action(frame, 'ferryboard', '#say');
  await expect(crossing).toHaveText('Board for Brackwater');
  await crossing.click();
  await expect.poll(() => frame.evaluate(() => Scene.region())).toBe(2);
  const after = await frame.evaluate(() => ({ guide: __bw.CMap.guide(), state: __bw.S.cartography.waypoint }));
  expect(after.state).toEqual({ id: 'town2' });
  expect(after.guide.name).toBe('Brackwater');
  expect(after.guide.boarding).toBeFalsy();
  expect(after.guide.distance).toBeGreaterThan(0);
  const final = await frame.evaluate(() => {
    const { path } = Scene.cartographyRoute('town2');
    Scene.hop(...path.at(-2));
    return path.slice(-2);
  });
  expect(await position(frame)).toEqual(final[0]);
  await nativeStep(frame, final[1]);
  await expect.poll(() => frame.evaluate(() => __bw.S.cartography.waypoint)).toBeNull();
  expect(await frame.evaluate(() => __bw.CMap.guide())).toBeNull();
  expect(errors).toEqual([]);
});
