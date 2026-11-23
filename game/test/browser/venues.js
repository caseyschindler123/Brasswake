const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');
const { drivePath } = require('./movement');

const position = frame => frame.evaluate(() => Scene.pos());

async function surface(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  await frame.evaluate(() => {
    Sound.setMu(false);
    for (const actor of Scene.ents()) if (actor.wander) {
      actor.wander = 0;
      actor.tx = null;
      actor.fx = actor.x;
      actor.fy = actor.y;
    }
  });
  return frame;
}

async function stage(frame, at) {
  await frame.evaluate(at => Scene.hop(...at), at);
  await frame.waitForFunction(() => !Scene.debug().map.pending);
  expect(await position(frame)).toEqual(at);
}

async function approach(frame, kind, fields = {}) {
  const target = await frame.evaluate(({ kind, fields }) => {
    const e = Scene.find(e => e.kind === kind && Object.entries(fields).every(([key, value]) => e[key] === value));
    if (!e) throw Error('Missing venue actor: ' + kind + JSON.stringify(fields));
    const { map } = Scene.debug(), candidates = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    const at = candidates.map(([dx, dy]) => [e.x + dx, e.y + dy]).find(([x, y]) => {
      const i = y * map.w + x;
      return x >= 0 && y >= 0 && x < map.w && y < map.h && !map.solid[i] && map.t[i] !== 4 && !map.occ.has(i);
    });
    if (!at) throw Error('No open approach to ' + e.name);
    return { at, xy: [e.x, e.y], name: e.name };
  }, { kind, fields });
  await stage(frame, target.at);
  return target;
}

async function clickActor(frame, [x, y]) {
  await frame.waitForFunction(([x, y]) => {
    const { cam, zoom } = Scene.debug(), canvas = document.querySelector('#stage canvas.over');
    const px = (x * 16 + 8 - cam.x) * zoom, py = (y * 16 + 4 - cam.y) * zoom;
    return px > 24 && px < canvas.clientWidth - 24 && py > 34 && py < canvas.clientHeight - 34;
  }, [x, y]);
  const point = await frame.evaluate(([x, y]) => {
    const { cam, zoom } = Scene.debug();
    return { x: (x * 16 + 8 - cam.x) * zoom, y: (y * 16 + 4 - cam.y) * zoom };
  }, [x, y]);
  await frame.locator('#stage canvas.over').click({ position: point });
}

async function drive(frame, path) {
  await drivePath(frame, path, false);
  await expect.poll(() => position(frame)).toEqual(path.at(-1));
  await frame.waitForFunction(() => !Scene.traveling());
}

async function hero(frame) {
  await frame.locator('#nav [data-t=hero]').click();
  const coach = frame.locator('[data-a=coachok]');
  if (await coach.isVisible()) await coach.click();
}

async function restoreCharacter(page, name) {
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await page.getByRole('button', { name }).click();
  await expect(page.locator('#title')).toBeHidden();
}

test('venues · all eight towns have correctly staffed and furnished public buildings', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), frame = await surface(page);
  const result = await frame.evaluate(() => {
    const { world } = Scene.debug();
    const free = (x, y) => !world.solid[y * world.w + x] && !world.occ.has(y * world.w + x) && world.t[y * world.w + x] !== 4;
    const cardinal = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    const roles = [['healer', 'healer'], ['banker', 'bank'], ['shopkeep', 'shop'], ['tavern', 'tavern'],
      ['casino', 'casino'], ['registrar', 'guild'], ['bench', 'work']];
    return Array.from({ length: 8 }, (_, i) => i + 1).flatMap(r => roles.map(([kind, slot]) => {
      const person = world.ents.find(e => e.r === r && e.kind === kind);
      const room = person && world.blds.find(b => b.plan?.id === person.venueId && b.r === r && b.slot === slot);
      if (!room) return { r, kind, missingRoom: true };
      const { x, y, w, h, plan } = room, index = (xx, yy) => yy * world.w + xx;
      const occupied = world.occ.get(index(person.x, person.y)) === person;
      const inside = plan.tiles[(person.y - y) * w + person.x - x] === Buildings.FLOOR;
      const door = plan.doors.find(d => [d, d.outside, d.inside].every(p => free(x + p.x, y + p.y)));
      if (!door) return { r, kind, failedApproaches: plan.doors.map(d => ({ side: d.side,
        blockers: [d.outside, d, d.inside].flatMap(p => {
          const at = [x + p.x, y + p.y], i = index(...at), actor = world.occ.get(i);
          return free(...at) ? [] : [{ at, wall: !!world.solid[i], water: world.t[i] === 4, actor: actor?.kind }];
        }) })) };
      const start = [x + door.inside.x, y + door.inside.y], queue = [start], seen = new Set([index(...start)]);
      for (let j = 0; j < queue.length; j++) for (const [dx, dy] of cardinal) {
        const xx = queue[j][0] + dx, yy = queue[j][1] + dy, i = index(xx, yy);
        if (xx < x || yy < y || xx >= x + w || yy >= y + h || seen.has(i) || !free(xx, yy)) continue;
        queue.push([xx, yy]); seen.add(i);
      }
      return { r, kind, inside, occupied, accessible: cardinal.some(([dx, dy]) => seen.has(index(person.x + dx, person.y + dy))),
        name: room.name, pieces: room.furniture.map(p => p.p) };
    }));
  });
  expect(result).toHaveLength(56);
  expect(result.filter(room => !room.inside || !room.occupied || !room.accessible)).toEqual([]);
  const purpose = { healer: [/Infirmary/, 'bed'], banker: [/Counting House/, 'bankctr'], shopkeep: [/Provisioners/, 'counter'],
    tavern: [/./, 'bar'], casino: [/Card Room/, 'rtable'], registrar: [/Guildhall/, 'ltable'], bench: [/Workshop/, 'chest'] };
  const missingFittings = [];
  for (const room of result) {
    const [label, fitting] = purpose[room.kind];
    expect(room.name).toMatch(label);
    const required = [`f${room.r}_${fitting}`, ...(room.kind === 'healer' ? ['venue_medicine'] : [])];
    for (const piece of required) if (!room.pieces.includes(piece)) missingFittings.push({ room: room.name, piece });
  }
  expect(missingFittings).toEqual([]);
  if (info.project.name !== 'phone-webkit') for (let r = 1; r <= 8; r++) {
    await approach(frame, 'healer', { r });
    await frame.waitForFunction(r => Scene.debug().world.blds.some(b => b.r === r && b.slot === 'healer' && b.inside && b.fa === 0), r);
    await screenshot(page, info, `venue-regional-infirmary-${r}`);
  }
  expect(errors).toEqual([]);
});

test('venues · civic layouts have real open space and preserve existing roads and site IDs', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors = observeErrors(page), frame = await surface(page);
  const facts = await frame.evaluate(() => {
    const { world } = Scene.debug(), registry = Scene.venues();
    const civic = [1, 2, 3].map(r => {
      const b = registry.find(v => v.type === 'civic' && v.r === r).building, p = b.plan;
      const open = [...p.tiles].flatMap((t, i) => t === Buildings.VOID || t === Buildings.COURT ? [i] : []);
      const yard = open.filter(i => p.tiles[i] === Buildings.COURT).map(i => [b.x + i % b.w, b.y + Math.floor(i / b.w)])
        .find(([x, y]) => !world.occ.has(y * world.w + x));
      return { shape: p.shape, open: open.length, court: p.tiles.includes(Buildings.COURT),
        freeAndOpen: open.every(i => !world.solid[(b.y + Math.floor(i / b.w)) * world.w + b.x + i % b.w] && !p.roof[i]),
        doors: p.doors.length, yard };
    });
    const capitalBounds = Geography.city(8);
    const capital = world.blds.filter(b => b.x >= capitalBounds[0] && b.y >= capitalBounds[1] &&
      b.x + b.w - 1 <= capitalBounds[2] && b.y + b.h - 1 <= capitalBounds[3]).length;
    const roads = Geography.roadLinks.map(pair => [...pair]);
    const streets = registry.filter(v => v.type === 'civic').map(({ building: b, r }) => {
      const free = ([x, y]) => {
        const i = y * world.w + x;
        return !world.solid[i] && world.t[i] !== 4 && !world.occ.has(i);
      };
      const door = b.plan.doors.find(d => d.side === 'south') || b.plan.doors[0];
      const x = b.x + door.outside.x, y = b.y + door.outside.y;
      const at = [[x, y + 3], [x, y + 2], [x - 1, y + 2], [x + 1, y + 2], [x, y]].find(free);
      return { r, at };
    });
    const named = world.cartography.named, navigator = world.cartography.navigator;
    const clearRoads = [[1, 4], [7, 8]].map(([a, b]) => {
      const path = navigator.route(named.get('town' + a).at, named.get('town' + b).at, [])?.path;
      return !!path && path.every(([x, y]) => !world.solid[y * world.w + x] && world.t[y * world.w + x] !== 4) &&
        path.some(([x, y]) => world.t[y * world.w + x] === 2);
    });
    return { civic, capital, roads, streets, clearRoads, stairs: registry.length, distinctStairs: new Set(registry.map(v => v.id)).size,
      dungeons: Scene.cartographyCatalogue().filter(d => d.kind === 'stairs').map(d => d.id),
      ferries: Scene.ferries().map(f => f.id) };
  });
  expect(facts.civic[0]).toMatchObject({ shape: 'L', court: false, freeAndOpen: true, doors: 2 });
  expect(facts.civic[1]).toMatchObject({ shape: 'courtyard', court: true, freeAndOpen: true, doors: 2 });
  expect(facts.civic[2]).toMatchObject({ court: false, freeAndOpen: true, doors: 2 });
  for (const b of facts.civic) expect(b.open).toBeGreaterThan(4);
  expect(facts.capital).toBeGreaterThanOrEqual(60);
  expect(facts.capital).toBeLessThanOrEqual(80);
  expect(facts.roads).toEqual([[1, 4], [1, 3], [3, 4], [3, 6], [4, 8], [4, 6], [6, 7], [6, 8], [7, 8]]);
  expect(facts.clearRoads).toEqual([true, true]);
  expect(facts.stairs).toBe(24);
  expect(facts.distinctStairs).toBe(facts.stairs);
  expect(facts.dungeons).toEqual(Array.from({ length: 8 }, (_, i) => 'stairs' + (i + 1)));
  expect(facts.ferries).toEqual(['tallyport-brackwater', 'brackwater-haverly', 'four-fords-cinderwick', 'cinderwick-aldermoot']);
  expect(facts.civic[1].yard).toBeTruthy();
  expect(facts.streets).toHaveLength(8);
  if (info.project.name !== 'phone-webkit') {
    for (const street of facts.streets) {
      await stage(frame, street.at);
      await frame.waitForTimeout(650); // Capture the street once the region fade clears.
      await screenshot(page, info, `venue-regional-civic-${street.r}`);
    }
    await stage(frame, facts.civic[1].yard);
    await frame.waitForTimeout(650);
    await screenshot(page, info, 'venue-reedworkers-courtyard');
  }
  expect(errors).toEqual([]);
});

test('venues · the joystick opens a real door, reveals the infirmary and triggers one cue each way', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const door = await frame.evaluate(() => {
    const { world } = Scene.debug(), clinic = world.blds.find(b => b.r === 1 && b.slot === 'healer');
    const index = clinic.plan.doors.findIndex(d => d.side === 'south'), d = clinic.plan.doors[index];
    const at = p => [clinic.x + p.x, clinic.y + p.y];
    const outside = at(d.outside), threshold = at(d), inside = at(d.inside), far = [outside[0], outside[1] + 1];
    for (const [x, y] of [far, outside, threshold, inside]) {
      const i = y * world.w + x;
      if (world.solid[i] || world.occ.has(i) || world.t[i] === 4) throw Error('Blocked clinic doorway fixture');
    }
    return { index, id: clinic.plan.id, far, outside, threshold, inside };
  });
  await stage(frame, door.far);
  const readDoor = () => frame.evaluate(({ id, index }) => {
    const b = Scene.debug().world.blds.find(b => b.plan?.id === id);
    return { open: b.doorMotion?.[index].open, amount: b.doorMotion?.[index].amount, inside: !!b.inside, cues: window.__venueDoorCues || 0 };
  }, door);
  const renderedLeaf = () => frame.evaluate(([x, y]) => {
    const { cam, draw } = Scene.debug();
    const g = document.querySelector('#stage canvas.game').getContext('2d'), original = g.drawImage;
    let leaf = null;
    g.drawImage = function (image, px, py, w, h, ...rest) {
      if (w === 32 && h === 34 && Math.abs(px + cam.x - (16 * x - 8)) < 0.6 &&
        Math.abs(py + cam.y - (16 * y - 14)) < 0.6) leaf = image.toDataURL();
      return original.call(this, image, px, py, w, h, ...rest);
    };
    try { draw(); } finally { g.drawImage = original; }
    return leaf;
  }, door.threshold);
  await expect.poll(readDoor).toEqual({ open: false, amount: 0, inside: false, cues: 0 });
  const closed = await renderedLeaf();
  expect(closed, 'The closed south door is drawn on the live canvas').toBeTruthy();
  await frame.waitForTimeout(3300); // Let the surface transition and town banner clear before the door captures.
  await frame.evaluate(() => {
    Sound.setFx(true);
    const play = Sound.sfx;
    window.__venueDoorCues = 0;
    Sound.sfx = (...args) => { if (args[0] === 'door') window.__venueDoorCues++; return play(...args); };
  });
  await screenshot(page, info, 'venue-infirmary-closed-door');
  await drive(frame, [door.outside]);
  await expect.poll(readDoor).toEqual({ open: true, amount: 1, inside: false, cues: 1 });
  const opened = await renderedLeaf();
  expect(opened, 'The open south door is drawn on the live canvas').toBeTruthy();
  expect(opened).not.toBe(closed);
  await screenshot(page, info, 'venue-infirmary-open-door');
  await drive(frame, [door.threshold, door.inside]);
  await expect.poll(readDoor).toEqual({ open: true, amount: 1, inside: true, cues: 1 });
  await frame.waitForFunction(id => Scene.debug().world.blds.find(b => b.plan?.id === id).fa === 0, door.id);
  await screenshot(page, info, 'venue-infirmary-treatment-room');
  await drive(frame, [door.threshold, door.outside, door.far]);
  await expect.poll(readDoor).toEqual({ open: false, amount: 0, inside: false, cues: 2 });
  expect(await renderedLeaf()).toBe(closed);
  expect(errors).toEqual([]);
});

test('venues · the first dojo uses modular construction and Odalys still teaches', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  await frame.evaluate(() => {
    __bw.S.gd = 3;
    delete __bw.S.met['1.0'];
    delete __bw.S.seen['intro.practice'];
  });
  await approach(frame, 'dojo', { r: 1 });
  await frame.getByRole('button', { name: 'Go in: Dojo' }).click();
  await expect.poll(() => frame.evaluate(() => Scene.inHall())).toBe(1);
  await expect(frame.locator('#say-text')).toContainText('have a look at you.');
  await frame.locator('#say-text').click();
  await expect(frame.locator('#say')).toBeHidden();
  const hall = await frame.evaluate(() => {
    const { map } = Scene.debug(), room = map.blds.find(b => b.modular && b.indoor && b.slot === 'dojo');
    return { modular: !!room, floors: room ? room.plan.tiles.filter(t => t === Buildings.FLOOR).length : 0,
      walls: room ? room.plan.edges.length : 0, mats: room ? room.furniture.filter(p => p.p === 'venue_training_mat').length : 0,
      positions: map.ents.filter(e => e.kind === 'odalys' || (e.kind === 'dummy' && e.i === 9)).map(e => [e.kind, e.x, e.y]) };
  });
  expect(hall).toMatchObject({ modular: true, mats: 3 });
  expect(hall.floors).toBeGreaterThan(20);
  expect(hall.walls).toBeGreaterThan(10);
  expect(hall.positions).toEqual(expect.arrayContaining([['odalys', 6, 6], ['dummy', 5, 8]]));
  await approach(frame, 'odalys');
  await frame.waitForTimeout(650); // Capture the hall after the scene fade.
  await screenshot(page, info, 'venue-dojo-modular-hall');
  await frame.getByRole('button', { name: /Talk: Odalys/ }).click();
  await expect(frame.locator('#say')).toContainText('Odalys Brine');
  const lesson = frame.getByRole('button', { name: 'Learn SQL first' });
  for (let beat = 0; beat < 4 && !await lesson.isVisible(); beat++) await frame.locator('#say-text').click();
  await expect(lesson).toBeVisible();
  expect(errors).toEqual([]);
});

test('venues · a real staircase restores the same upper room and returns safely downstairs', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const id = await frame.evaluate(() => Scene.venues().find(v => v.r === 1 && v.type === 'healer').id);
  const stairs = await approach(frame, 'venueup', { venueId: id });
  const from = await frame.evaluate(({ at: [x, y], xy }) => {
    const { world } = Scene.debug();
    return [[x, y + 1], [x + 1, y], [x - 1, y], [x, y - 1]].find(([xx, yy]) => {
      const i = yy * world.w + xx;
      return (xx !== xy[0] || yy !== xy[1]) && !world.solid[i] && !world.occ.has(i) && world.t[i] !== 4;
    });
  }, stairs);
  expect(from).toBeTruthy();
  await stage(frame, from);
  await drive(frame, [stairs.at]);
  await clickActor(frame, stairs.xy);
  await expect.poll(() => frame.evaluate(() => Scene.inInterior())).toBe(true);
  const upstairs = await frame.evaluate(() => {
    const { map } = Scene.debug(), at = Scene.pos(), down = Scene.find(e => e.kind === 'venuedown');
    const building = map.venue.building, upper = map.blds[0];
    const footprint = plan => [...plan.tiles].map(t => t === Buildings.VOID || t === Buildings.COURT ? t : Buildings.FLOOR);
    const walk = [[1, 0], [0, -1], [0, 1], [-1, 0]].map(([dx, dy]) => [at[0] + dx, at[1] + dy]).find(([x, y]) => {
      const i = y * map.w + x;
      return x > 0 && y > 0 && x < map.w - 1 && y < map.h - 1 && !map.solid[i] && !map.occ.has(i);
    });
    return { state: Scene.venueState(), at, walk, down: [down.x, down.y], dungeon: Scene.inDungeon(),
      floors: [{ w: upper.w, h: upper.h, form: footprint(upper.plan) },
        { w: building.w, h: building.h, form: footprint(building.plan) }],
      furnishings: upper.furniture.map(f => f.p) };
  });
  expect(upstairs.state).toMatchObject({ id, v: 1, r: 1, f: 1, back: stairs.at });
  expect(upstairs.dungeon).toBe(false);
  expect(upstairs.floors[0]).toEqual(upstairs.floors[1]);
  expect(upstairs.furnishings).toEqual(expect.arrayContaining(['f1_bed', 'venue_medicine']));
  expect(upstairs.walk).toBeTruthy();
  await drive(frame, [upstairs.walk]);
  await screenshot(page, info, 'venue-upstairs-recovery-ward');
  const expected = { ...upstairs.state, x: upstairs.walk[0], y: upstairs.walk[1] };
  await expect.poll(() => frame.evaluate(() => {
    const account = JSON.parse(localStorage.getItem('brasswake.acct.v7'));
    return account.slots[account.cur].interior;
  }), { message: 'Upstairs walking updates the device save without another interaction' }).toEqual(expected);
  await hero(frame);
  await frame.locator('[data-a=export]').click();
  const code = await frame.locator('#savebox').inputValue(), save = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  const traveler = save.slots[save.cur];
  expect(traveler.interior).toEqual(expected);
  expect(traveler.pos).toEqual(stairs.at);

  // The second slot uses ordinary surface coordinates while the first retains its upper room.
  await frame.evaluate(({ traveler, at }) => {
    __bw.A.slots[1] = { ...traveler, name: 'Ground-floor Visitor', interior: null, pos: at };
    __bw.save();
  }, { traveler, at: stairs.at });
  await restoreCharacter(page, /Ground-floor Visitor/);
  expect(await page.evaluate(() => ({ inside: Scene.inInterior(), at: Scene.pos() }))).toEqual({ inside: false, at: stairs.at });
  await hero(page);
  await page.locator('[data-a=reset]').click();
  await page.getByRole('button', { name: new RegExp(traveler.name) }).click();
  await expect.poll(() => page.evaluate(() => Scene.venueState())).toEqual(expected);
  expect(await position(page)).toEqual(upstairs.walk);
  await drive(page, [upstairs.at]);
  await clickActor(page, upstairs.down);
  await expect.poll(() => page.evaluate(() => Scene.inInterior())).toBe(false);
  const returned = await page.evaluate(() => {
    const at = Scene.pos(), { world } = Scene.debug(), i = at[1] * world.w + at[0];
    const account = JSON.parse(localStorage.getItem('brasswake.acct.v7')), slot = account.slots[account.cur];
    return { at, safe: !world.solid[i] && !world.occ.has(i) && world.t[i] !== 4,
      saved: slot.pos, floor: slot.interior ?? null, liveFloor: Scene.venueState() };
  });
  expect(returned).toEqual({ at: stairs.at, safe: true, saved: stairs.at, floor: null, liveFloor: null });
  expect(errors).toEqual([]);
});

test('venues · rendered harbor basins are deep while neighboring natural coast is shallow', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const facts = await frame.evaluate(() => {
    const { world: m, GCL, gclass } = Scene.debug(), cardinal = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    const scene = r => {
      const berth = Scene.ferries().flatMap(f => [f.from, f.to]).find(b => b.r === r);
      const [bx, by] = berth.at, dock = [], shore = [];
      for (let y = by - 50; y <= by + 50; y++) for (let x = bx - 50; x <= bx + 50; x++) {
        const i = y * m.w + x;
        if (m.t[i] !== 4) continue;
        const neighbors = cardinal.map(([dx, dy]) => (y + dy) * m.w + x + dx);
        const artifact = neighbors.some(j => m.t[j] === 6 || m.surface[j] === 1 || m.surface[j] === 2);
        let natureClose = false;
        for (let dy = -2; dy <= 2 && !natureClose; dy++) for (let dx = -2; dx <= 2; dx++) {
          const j = (y + dy) * m.w + x + dx;
          if ([0, 1, 5, 9].includes(m.t[j]) && !m.surface[j]) { natureClose = true; break; }
        }
        const color = GCL[gclass(m, m.b[i], m.gk[i])].name;
        if (artifact && !natureClose) dock.push(color);
        if (!artifact && neighbors.some(j => [0, 1, 5, 9].includes(m.t[j]) && !m.surface[j])) shore.push(color);
      }
      const pier = [];
      for (let y = by - 2; y <= by + 2; y++) for (let x = bx - 6; x <= bx; x++) {
        const i = y * m.w + x;
        if (m.t[i] === 6 && !m.solid[i] && !m.occ.has(i)) pier.push([x, y]);
      }
      // Frame the water and its built edge in the narrow phone view.
      const at = pier.sort((a, b) => a[0] - b[0] || Math.abs(a[1] - by) - Math.abs(b[1] - by))[0];
      return { r, at, depth: [...new Set(dock)], shallow: [...new Set(shore)], count: dock.length };
    };
    return [scene(1), scene(8)];
  });
  for (const basin of facts) {
    expect(basin.count).toBeGreaterThan(10);
    expect(basin.depth).toEqual(['deep']);
    expect(basin.shallow).toEqual(['shallow']);
    expect(basin.at).toBeTruthy();
    await stage(frame, basin.at);
    await frame.waitForFunction(() => Scene.debug().map.chunks.size > 0);
    await frame.waitForTimeout(650); // Capture the water after the scene fade clears.
    await screenshot(page, info, `venue-deep-harbor-${basin.r}`);
  }
  expect(errors).toEqual([]);
});
