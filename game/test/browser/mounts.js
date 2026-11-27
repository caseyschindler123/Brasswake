const { test, expect } = require('@playwright/test');
const Worlds = require('../../src/character_worlds');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');
const { open: openDev } = require('./dev-helper');

const named = (page, action) => page.locator(`[data-a="${action}"]`);
const heroAction = (page, action) => page.locator(`#view [data-a="${action}"]`);
const slot = (page, index) => page.locator(`#title [data-a=playslot][data-i="${index}"]`);
const horse = page => page.evaluate(() => ({ ...__bw.S.horse, gold: __bw.S.gold }));
const position = page => page.evaluate(() => Scene.pos());

async function hero(page) {
  await page.locator('#nav [data-t=hero]').click();
  if (await named(page, 'coachok').isVisible()) await named(page, 'coachok').click();
}

async function toggleHorse(page, label) {
  await hero(page);
  const toggle = heroAction(page, 'mounttoggle');
  await expect(toggle).toHaveText(label);
  await toggle.click();
  await page.locator('#nav [data-t=world]').click();
}

async function stage(page, at) {
  await page.evaluate(at => Scene.hop(...at), at);
  await page.waitForFunction(() => !Scene.debug().map.pending);
  await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled', 'false');
  expect(await position(page)).toEqual(at);
}

async function ready(page) {
  await page.waitForFunction(() => Scene.pos() && !Scene.debug().map.pending, null, { timeout: 45000 });
  await page.evaluate(() => {
    Sound.setMu(false);
    for (const actor of Scene.ents()) if (actor.wander) {
      actor.wander = 0;
      actor.tx = null;
      actor.fx = actor.x;
      actor.fy = actor.y;
    }
  });
}

function stableFixture(page) {
  return page.evaluate(() => {
    const { world } = Scene.debug();
    const keeper = Scene.find(e => e.r === 1 && e.kind === 'stablekeep');
    const stable = keeper && world.blds.find(b => b.plan?.id === keeper.venueId);
    if (!stable) throw Error('Missing Tallyport stable or keeper');
    const door = stable.plan.doors.find(d => d.side === 'south');
    const outside = [stable.x + door.outside.x, stable.y + door.outside.y];
    const inside = [stable.x + door.inside.x, stable.y + door.inside.y];
    const threshold = [stable.x + door.x, stable.y + door.y];
    const far = [outside[0], outside[1] + 1];
    const id = (x, y) => y * world.w + x;
    const free = (x, y) => !world.solid[id(x, y)] && !world.occ.has(id(x, y)) && world.t[id(x, y)] !== 4;
    if (![far, outside, threshold, inside].every(([x, y]) => free(x, y)))
      throw Error('Blocked stable doorway');
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const start = id(...far), queue = [start], previous = new Map([[start, start]]);
    let route;
    for (const cell of queue) {
      const x = cell % world.w, y = Math.floor(cell / world.w);
      if (Math.abs(x - keeper.x) + Math.abs(y - keeper.y) === 1) {
        route = [];
        for (let at = cell; at !== start; at = previous.get(at)) route.unshift([at % world.w, Math.floor(at / world.w)]);
        break;
      }
      for (const [dx, dy] of steps) {
        const X = x + dx, Y = y + dy, next = id(X, Y);
        if (X < stable.x || X >= stable.x + stable.w || Y < stable.y || Y > far[1] ||
          previous.has(next) || !free(X, Y)) continue;
        previous.set(next, cell);
        queue.push(next);
      }
    }
    if (!route) throw Error('No walkable approach to the stable keeper');
    const wall = Array.from({ length: stable.w - 2 }, (_, i) => [stable.x + i + 1, threshold[1]])
      .find(([x, y]) => world.solid[id(x, y)] && free(x, y + 1) && free(x, y + 2));
    if (!wall) throw Error('No accessible solid stable wall');
    const road = [];
    for (let y = stable.y + stable.h + 1; y <= stable.y + stable.h + 13 && !road.length; y++)
      for (let x = stable.x - 8; x <= stable.x + stable.w + 8 && !road.length; x++) {
        const cells = Array.from({ length: 10 }, (_, i) => x + i);
        if (cells.every(X => world.reg[id(X, y)] === 1 && free(X, y) &&
          !world.blds.some(b => b.enter && X >= b.x && X < b.x + b.w && y >= b.y && y < b.y + b.h)))
          road.push(x, y);
      }
    if (!road.length) throw Error('No clear road near the stable');
    return { far, outside, inside, threshold, route, wall, road };
  });
}

async function actor(page, point) {
  const canvas = page.locator('#stage canvas.over');
  const offset = await page.evaluate(([x, y]) => {
    const { cam, zoom } = Scene.debug();
    return { x: (x * 16 + 8 - cam.x) * zoom, y: (y * 16 + 4 - cam.y) * zoom };
  }, point);
  await canvas.click({ position: offset });
}

async function approachStable(page, fixture) {
  await stage(page, fixture.far);
  await drivePath(page, fixture.route, false);
  expect(await position(page)).toEqual(fixture.route.at(-1));
  await expect.poll(() => page.evaluate(() => Scene.outdoors())).toBe(false);
  await expect(page.locator('#ctx')).toHaveText('Stable keeper');
  await page.locator('#ctx').click();
  await expect(page.locator('#sheet')).toContainText('Bay riding horse');
  if (await named(page, 'coachok').isVisible()) await named(page, 'coachok').click();
}

async function buyHorse(page) {
  const buy = named(page, 'buyhorse');
  await expect(buy).toHaveText('650 gold');
  await buy.click();
  await expect(buy).toBeDisabled();
  await page.locator('.sheet-x').click();
}

async function joystickRun(page, dx, dy, milliseconds) {
  const stick = page.locator('.movement-joystick'), box = await stick.boundingBox();
  if (!box) throw Error('The movement joystick has no bounds');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await page.mouse.move(x + dx * box.width * .42, y + dy * box.height * .42);
    await expect(stick).toHaveAttribute('data-mode', 'run');
    return await page.evaluate(ms => new Promise((resolve, reject) => {
      const { P } = Scene.debug(), start = Scene.tacticalTime(), x = P.fx, y = P.fy;
      const deadline = performance.now() + 10000;
      function tick() {
        const elapsed = Scene.tacticalTime() - start;
        if (elapsed >= ms) resolve({ speed: Math.hypot(P.fx - x, P.fy - y) * 1000 / elapsed, x: P.fx, y: P.fy });
        else if (performance.now() > deadline) reject(new Error('The scene stopped advancing while running'));
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }), milliseconds);
  } finally { await page.mouse.up(); }
}

test('mounts · the stable sells one horse, outdoor riding is faster and obstacles and combat stay safe', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page);
  await openDev(page);
  await page.evaluate(() => {
    Dev.resources({ gold: 1450 });
    __bw.S.seen.shop = 1;
  });
  await ready(page);
  const fixture = await stableFixture(page);
  await approachStable(page, fixture);
  await buyHorse(page);
  expect(await horse(page)).toEqual({ owned: true, mounted: false, gold: 800 });
  await page.locator('#ctx').click();
  await expect(named(page, 'buyhorse')).toBeDisabled();
  await named(page, 'buyhorse').evaluate(button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  expect(await horse(page)).toEqual({ owned: true, mounted: false, gold: 800 });
  await page.locator('.sheet-x').click();
  await toggleHorse(page, 'Mount horse');
  expect(await horse(page)).toMatchObject({ owned: true, mounted: false });

  await stage(page, fixture.road);
  const running = await joystickRun(page, 1, 0, 500);
  // The reference run covers 2.183366 tiles per 21-frame source cycle at 30 FPS.
  expect(running.speed).toBeCloseTo(2.183366 * 30 / 21, 1);
  await stage(page, fixture.road);
  await toggleHorse(page, 'Mount horse');
  expect(await horse(page)).toMatchObject({ owned: true, mounted: true });
  const riding = await joystickRun(page, 1, 0, 500);
  expect(riding.speed / running.speed).toBeCloseTo(1.7, 1);
  await page.evaluate(() => MountView.preload().decode());
  await page.waitForFunction(() => Scene.debug().P.spr?.idle8);
  const riderDrawn = await page.evaluate(() => {
    const { P, draw } = Scene.debug();
    const ctx = document.querySelector('#stage canvas.game').getContext('2d'), drawImage = ctx.drawImage;
    const direction = P.d8 || 0;
    const expected = MountView.frame(P.spr.idle8[direction][0], { direction });
    let painted = false;
    ctx.drawImage = function (image, ...args) {
      if (image === expected) painted = true;
      return drawImage.call(this, image, ...args);
    };
    try { draw(); } finally { ctx.drawImage = drawImage; }
    return painted;
  });
  expect(riderDrawn).toBe(true);
  await expect(page.locator('#toast > div')).toHaveCount(0);
  await screenshot(page, info, 'horse-mounted-east');
  await page.evaluate(() => { Scene.debug().P.d8 = 0; Scene.debug().draw(); });
  await screenshot(page, info, 'horse-mounted-south');
  await page.evaluate(() => { Scene.debug().P.d8 = 5; Scene.debug().draw(); });
  await screenshot(page, info, 'horse-mounted-northeast');

  const [wallX, wallY] = fixture.wall;
  await stage(page, [wallX, wallY + 2]);
  const blocked = await joystickRun(page, 0, -1, 550);
  expect(blocked.y).toBeLessThan(wallY + 1);
  expect(blocked.y).toBeGreaterThan(wallY + .5);
  expect(await horse(page)).toMatchObject({ owned: true, mounted: true });

  await stage(page, fixture.far);
  await drivePath(page, [fixture.outside, fixture.threshold, fixture.inside], false);
  expect(await position(page)).toEqual(fixture.inside);
  await expect.poll(() => horse(page)).toMatchObject({ owned: true, mounted: false });

  await stage(page, [fixture.road[0] + 2, fixture.road[1]]);
  await toggleHorse(page, 'Mount horse');
  const encounter = await page.evaluate(() => {
    const [id] = Dev.spawn({ monster: 'b102' });
    const [x, y] = Scene.pos();
    const entity = Scene.find(e => e.id === id);
    return { xy: [entity.x, entity.y],
      approach: Math.abs(entity.x - x) + Math.abs(entity.y - y) > 1 ? [[entity.x, y]] : [] };
  });
  await drivePath(page, encounter.approach, false);
  await actor(page, encounter.xy);
  await expect(page.locator('#combat-bar')).toBeVisible();
  await expect(page.locator('#combat-bar [data-id="basic.magery"]')).toBeEnabled();
  await page.locator('#combat-bar [data-id="basic.magery"]').click();
  await expect(page.locator('#fight #sql')).toBeVisible();
  expect(await horse(page)).toMatchObject({ owned: true, mounted: false });
  expect(errors).toEqual([]);
});

test('mounts · a purchased horse survives device reload and import in its original world and slot', async ({ page }) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), account = Worlds.fresh();
  const character = name => ({
    v: 8, wv: 3, name, path: 'warrior', look: 0, tut: 3, g: 'done', gd: 99, hp: 80,
    region: 1, gold: 700, tabs: { hero: 1 }, seen: { hero: 1, shop: 1 },
  });
  for (const world of account.worlds.slice(0, 2)) world.cur = world.main = 0;
  account.worlds[0].slots[0] = character('Rider');
  account.worlds[0].slots[1] = character('Townsmith');
  account.worlds[1].slots[0] = character('Other Rider');
  await page.addInitScript(value => {
    if (!localStorage.getItem('brasswake.acct.v9')) localStorage.setItem('brasswake.acct.v9', JSON.stringify(value));
  }, JSON.parse(JSON.stringify(account)));
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await slot(page, 0).click();
  await ready(page);
  const fixture = await stableFixture(page);
  await approachStable(page, fixture);
  await buyHorse(page);
  await stage(page, fixture.road);
  await toggleHorse(page, 'Mount horse');
  await hero(page);
  await heroAction(page, 'savenow').click();
  await heroAction(page, 'backup').click();
  await page.getByRole('button', { name: 'Copy a save code', exact: true }).click();
  const code = await page.locator('#savebox').inputValue();
  const saved = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  expect(saved.worlds[0].slots[0].horse).toEqual({ owned: true, mounted: true });
  expect(saved.worlds[0].slots[1].horse?.owned).not.toBe(true);
  expect(saved.worlds[1].slots[0].horse?.owned).not.toBe(true);

  await page.reload();
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await slot(page, 0).click();
  await ready(page);
  expect(await horse(page)).toEqual({ owned: true, mounted: true, gold: 50 });
  await toggleHorse(page, 'Dismount');
  await hero(page);
  await heroAction(page, 'import').click();
  await page.locator('#savebox').fill(code);
  await named(page, 'doimport').click();
  await expect(page.locator('#sheet')).toBeHidden();
  expect(await horse(page)).toEqual({ owned: true, mounted: true, gold: 50 });

  const returnToSlots = async () => {
    if (!(await page.locator('#view').isVisible())) await hero(page);
    await heroAction(page, 'reset').click();
    await expect(page.locator('#title')).toBeVisible();
  };
  await returnToSlots();
  await expect(slot(page, 1)).toContainText('Townsmith');
  await slot(page, 1).click();
  expect(await horse(page)).toEqual({ owned: false, mounted: false, gold: 700 });
  await returnToSlots();
  await page.locator('[data-a=worldpick][data-i="1"]').click();
  await expect(slot(page, 0)).toContainText('Other Rider');
  await slot(page, 0).click();
  expect(await horse(page)).toEqual({ owned: false, mounted: false, gold: 700 });
  await returnToSlots();
  await page.locator('[data-a=worldpick][data-i="0"]').click();
  await expect(slot(page, 0)).toContainText('Rider');
  await slot(page, 0).click();
  expect(await horse(page)).toEqual({ owned: true, mounted: true, gold: 50 });

  await ready(page);
  const entrance = await page.evaluate(() => {
    const { world } = Scene.debug();
    const stairs = Scene.find(e => e.r === 1 && e.kind === 'stairs');
    const approach = [[1, 0], [0, 1], [-1, 0], [0, -1]]
      .map(([dx, dy]) => [stairs.x + dx, stairs.y + dy])
      .find(([x, y]) => {
        const k = y * world.w + x;
        return !world.solid[k] && !world.occ.has(k) && world.t[k] !== 4;
      });
    if (!approach) throw new Error('Missing safe dungeon approach');
    return { approach, name: stairs.name };
  });
  await stage(page, entrance.approach);
  await expect(page.locator('#ctx')).toContainText(entrance.name);
  await page.locator('#ctx').click();
  expect(await horse(page)).toMatchObject({ owned: true, mounted: true });
  await page.evaluate(() => {
    // Game's delegated handler runs before this one. Read the device snapshot
    // in the same click turn, before Scene's next animation frame can fix it.
    function afterDescend(event) {
      if (!event.target.closest('[data-a=start][data-k=dungeon]')) return;
      document.removeEventListener('click', afterDescend);
      const account = JSON.parse(localStorage.getItem('brasswake.acct.v9'));
      const world = account.worlds[account.world];
      const { horse, dungeon } = world.slots[world.cur];
      window.__firstMountedDungeonSave = { horse, dungeon };
    }
    document.addEventListener('click', afterDescend);
  });
  await page.locator('[data-a=start][data-k=dungeon]').click();
  expect(await page.evaluate(() => window.__firstMountedDungeonSave)).toMatchObject({
    horse: { owned: true, mounted: false },
    dungeon: { r: 1, f: 0 },
  });
  expect(errors).toEqual([]);
});
