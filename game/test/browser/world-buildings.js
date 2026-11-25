const { test, expect } = require('@playwright/test');
const { observeErrors, screenshot } = require('./flow');

async function surface(page) {
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'tallyport', { timeout: 45000 });
  const frame = page.frames().find(f => f.url().includes('visual_test=1'));
  const coach = frame.locator('[data-a=coachok]');
  if (await coach.isVisible()) await coach.click();
  return frame;
}

const at = frame => frame.evaluate(() => Scene.pos());
const arrow = ([dx, dy]) => dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp';

async function press(frame, delta, target) {
  const before = await at(frame), key = arrow(delta);
  const keyboard = frame.page().keyboard;
  // The harness is inside an iframe. Focus it before sending native keyboard input.
  await frame.locator('body').evaluate(body => { body.tabIndex = -1; body.focus({ preventScroll: true }); });
  await keyboard.down(key);
  try {
    if (before.every((value, i) => value === target[i])) {
      // Continuous motion can approach a wall within the current cell. Give
      // that approach time to finish, then require collision to stop it.
      await frame.waitForTimeout(280);
      expect(await frame.evaluate(() => Scene.traveling())).toBe(false);
    } else {
      await frame.waitForFunction(at=>Scene.pos().every((n,i)=>n===at[i]),target,{timeout:3500});
    }
  } finally {
    await keyboard.up(key);
  }
  await expect.poll(() => at(frame)).toEqual(target);
  await frame.waitForFunction(() => !Scene.traveling());
}

async function stage(frame, tile) {
  await frame.evaluate(tile => Scene.hop(...tile), tile);
  await frame.waitForFunction(() => !Scene.debug().map.pending);
  expect(await at(frame)).toEqual(tile);
}

test('raised roof faces share continuous creases and respect structural holes', async ({ page }) => {
  const errors = observeErrors(page), frame = await surface(page);
  const result = await frame.evaluate(() => {
    const build = (spec, piece = () => null) => {
      const plan = Buildings.compile({ id: 'roof-fixture', doors: [], ...spec });
      return { plan, ...BuildingView.create(plan, { piece }) };
    };
    const rectangle = build({ w: 10, h: 4 });
    const elbow = build({ w: 8, h: 8, shape: 'L' });
    const courtyard = build({ w: 11, h: 11, shape: 'courtyard' });
    const ctx = rectangle.roof.getContext('2d');
    const luma = (x, y) => {
      const [r, g, b] = ctx.getImageData(x * 3, Math.round(y * 3), 1, 1).data;
      return (r + 2 * g + b) / 4;
    };
    const ridge = rectangle.roofLift(80, 32);
    const longitudinal = [39, 47, 48, 49, 72, 97, 119].map(x => ({
      height: rectangle.roofLift(x, 32), ridge: luma(x, 32 - ridge),
      back: luma(x, 12), front: luma(x, 32),
    }));
    // A seven-pixel repeat crosses the sixteen-pixel floor grid out of phase.
    // The roof material keeps the same repeat through that boundary.
    const stripe = document.createElement('canvas');
    stripe.width = 21;
    stripe.height = 3;
    const paint = stripe.getContext('2d');
    paint.fillStyle = '#73382a'; paint.fillRect(0, 0, 21, 3);
    paint.fillStyle = '#d08356'; paint.fillRect(9, 0, 9, 3);
    const textured = build({ w: 10, h: 4 }, name => name === 'wr1_0' ? stripe : null);
    const texture = textured.roof.getContext('2d');
    const repeat = [45, 46, 47, 48, 49, 50, 51].map(x =>
      [x, x + 7].map(px => texture.getImageData(px * 3 + 1, 96, 1, 1).data[0]));
    const maskMismatches = [];
    for (const { plan, roof } of [rectangle, elbow, courtyard]) {
      const pixels = roof.getContext('2d').getImageData(0, 0, roof.width, roof.height).data;
      const tileSize = roof.width / plan.w;
      for (let i = 0; i < pixels.length / 4; i++) {
        const tile = Math.floor(i / roof.width / tileSize) * plan.w + Math.floor(i % roof.width / tileSize);
        if (pixels[i * 4 + 3] === plan.roof[tile] * 255) continue;
        maskMismatches.push(plan.shape);
        break;
      }
    }
    return { ridge, longitudinal, repeat, maskMismatches,
      eaves: [rectangle.roofLift(0, 32), rectangle.roofLift(80, 0), rectangle.roofLift(80, 64)],
      valley: [elbow.roofLift(64, 64), elbow.roofLift(56, 72), elbow.roofLift(48, 80)],
    };
  });
  expect(result.maskMismatches).toEqual([]);
  expect(result.eaves).toEqual([0, 0, 0]);
  expect(result.ridge).toBeGreaterThan(8);
  expect(result.ridge).toBeLessThan(20);
  expect(result.valley[0]).toBe(0);
  expect(result.valley[1]).toBeGreaterThan(2);
  expect(result.valley[2]).toBeGreaterThan(result.valley[1]);
  expect(new Set(result.repeat.map(([shade]) => shade)).size).toBeGreaterThan(1);
  for (const [first, next] of result.repeat) expect(Math.abs(first - next)).toBeLessThan(3);
  for (const face of result.longitudinal) {
    expect(face.height).toBeCloseTo(result.ridge);
    expect(face.front - face.back).toBeGreaterThan(25);
    expect(face.ridge).toBeGreaterThan(face.back);
  }
  for (const which of ['ridge', 'back', 'front']) {
    const values = result.longitudinal.map(face => face[which]);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThan(3);
  }
  expect(errors).toEqual([]);
});

test('door leaves stay within their fitted thresholds through every swing frame', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const samples = await frame.evaluate(() => {
    return ['north', 'south', 'west', 'east'].map(side => {
      const frames = Array.from({ length: 9 }, (_, i) => {
        const { c, ax, ay } = BuildingView.doorLeaf(Interiors.timber[1], side, i);
        const rgba = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, count = 0, centre = 0, brightest = 0;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const idx = (y * c.width + x) * 4;
          if (rgba[idx + 3] < 128) continue;
          const px = (x + .5) / 3 - ax, py = (y + .5) / 3 - ay;
          left = Math.min(left, px); right = Math.max(right, px);
          top = Math.min(top, py); bottom = Math.max(bottom, py);
          brightest = Math.max(brightest, (rgba[idx] + 2 * rgba[idx + 1] + rgba[idx + 2]) / 4);
          centre += px; count++;
        }
        return { left, right, top, bottom, count, centre: centre / count, brightest };
      });
      return { side, frames };
    });
  });
  for (const { side, frames } of samples) {
    const sideOn = side === 'west' || side === 'east';
    for (const leaf of frames) {
      expect(leaf.count).toBeGreaterThan(100);
      expect(leaf.top).toBeGreaterThanOrEqual(-33);
      expect(leaf.bottom).toBeLessThanOrEqual(sideOn ? 16 : 0);
      expect(leaf.left).toBeGreaterThanOrEqual(side === 'west' ? 0 : sideOn ? -16 : -8);
      expect(leaf.right).toBeLessThanOrEqual(side === 'east' ? 0 : sideOn ? 16 : 8);
      expect(leaf.brightest).toBeLessThan(145);
    }
    const [closed, , , , middle, , , , open] = frames;
    if (sideOn) {
      expect(closed.right - closed.left).toBeLessThan(3);
      expect(Math.abs(open.centre)).toBeGreaterThan(Math.abs(closed.centre) + 5);
      expect(open.bottom).toBeLessThan(closed.bottom - 14);
    } else {
      expect(closed.right - closed.left).toBeGreaterThan(14);
      expect(open.count).toBeLessThan(middle.count / 4);
    }
  }

  const approach = await frame.evaluate(async () => {
    await Scene.preload(8);
    const { world } = Scene.debug();
    const inn = world.blds.find(b => b.r === 8 && b.slot === 'inn' && b.modular);
    const door = inn.plan.doors.find(d => d.side === 'south');
    return Scene.safePosition([inn.x + door.outside.x - 1, inn.y + door.outside.y + 1], 8);
  });
  await stage(frame, approach);
  await frame.waitForTimeout(3400); // Capture the closed door after the arrival banner clears.
  await screenshot(page, info, 'capital-inn-raised-roof-and-door');
  expect(errors).toEqual([]);
});

test('surface roads join the mainland towns and connect each island town to its ferry piers', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const facts = await frame.evaluate(() => {
    const { world: m } = Scene.debug(), towns = Scene.towns(), legs = Scene.ferries();
    const neighbours = [[-1, 0], [0, -1], [1, 0], [0, 1]];
    const index = (x, y) => y * m.w + x;
    const passable = i => !m.solid[i] && m.t[i] !== 4;
    const townTile = r => towns[r].slice(0, 2).map((n, i) => i === 1 ? n + 3 : n);
    // Read live surface collision, including walls and pier stamps. Ignore moving occupants in
    // long-distance connectivity, then check that a currently empty boarding tile exists.
    const flood = ([sx, sy]) => {
      const seen = new Uint8Array(m.w * m.h), queue = new Int32Array(seen.length);
      const start = index(sx, sy);
      if (!passable(start)) return seen;
      seen[start] = 1; queue[0] = start;
      for (let head = 0, tail = 1; head < tail; head++) {
        const i = queue[head], x = i % m.w, y = Math.floor(i / m.w);
        for (const [dx, dy] of neighbours) {
          const nx = x + dx, ny = y + dy, j = index(nx, ny);
          if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[j] || !passable(j)) continue;
          seen[j] = 1; queue[tail++] = j;
        }
      }
      return seen;
    };
    const mainland = flood(townTile(1)), brackwater = flood(townTile(2)), cinderwick = flood(townTile(5));
    const townGroups = [mainland, brackwater, cinderwick].map(seen =>
      towns.slice(1).map((_, i) => i + 1).filter(r => !!seen[index(...townTile(r))]));
    const landings = legs.flatMap(leg => ['from', 'to'].map(side => {
      const { r, at: [x, y] } = leg[side], seen = r === 2 ? brackwater : r === 5 ? cinderwick : mainland;
      const ferryman = m.ents.some(e => e.kind === 'ferry' && e.side === side && e.route === leg.id && e.x === x && e.y === y);
      const open = neighbours.some(([dx, dy]) => {
        const i = index(x + dx, y + dy);
        return seen[i] && passable(i) && !m.occ.has(i);
      });
      return { route: leg.id, side, pier: m.t[index(x, y)] === 6, ferryman, open };
    }));
    const districts = Scene.districts().filter(d => d.r === 8).map(d => {
      const [x0, y0, x1, y1] = d.box;
      let walkable = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) walkable += mainland[index(x, y)];
      return { name: d.name, walkable };
    });
    const ships = m.props.filter(p => p.r === 1 && p.kind.startsWith('ship_')).map(p => ({ kind: p.kind,
      water: m.t[index(p.x, p.y)] === 4 || neighbours.some(([dx, dy]) => m.t[index(p.x + dx, p.y + dy)] === 4),
      atlas: WorldArt.at[p.kind]?.f,
    }));
    const dryShips = m.props.filter(p => p.kind.startsWith('ship_')).filter(p => {
      const half = WorldArt.at[p.kind].r[2] / 3 * (p.sc || 1) / 16 / 2;
      for (let x = Math.floor(p.x + .5 - half); x < Math.ceil(p.x + .5 + half); x++)
        if (m.t[index(x, p.y)] !== 4 || m.b[index(x, p.y)] !== 0) return true;
      return false;
    }).map(p => ({ kind: p.kind, r: p.r, x: p.x, y: p.y }));
    const services = m.ents.filter(e => e.r === 8 && e.kind === 'specialist');
    const flagship = m.props.find(p => p.r === 1 && p.kind === 'ship_three');
    const shipTile = flagship && neighbours.map(([dx, dy]) => [flagship.x + dx, flagship.y + dy])
      .find(([x, y]) => m.t[index(x, y)] === 6 && mainland[index(x, y)] && !m.occ.has(index(x, y)));
    const reachFor = r => r === 2 ? brackwater : r === 5 ? cinderwick : mainland;
    const serviceEntries = [];
    for (let r = 1; r <= 8; r++) for (const slot of ['tavern', 'shop', 'bank']) {
      const b = m.blds.find(b => b.r === r && b.slot === slot && b.modular && b.enter);
      const open = !!b?.plan.doors.some(d => [d.outside, d, d.inside].every(p => {
        const i = index(b.x + p.x, b.y + p.y);
        return reachFor(r)[i] && passable(i);
      }));
      serviceEntries.push({ r, slot, open });
    }
    const dungeonEntries = m.ents.filter(e => e.kind === 'stairs').map(e => {
      const adjacent = neighbours.map(([dx, dy]) => index(e.x + dx, e.y + dy));
      const roads = adjacent.filter(i => m.t[i] === 2);
      return { r: e.r, open: adjacent.some(i => reachFor(e.r)[i] && passable(i) && !m.occ.has(i)),
        clearRoads: roads.length > 0 && roads.every(passable),
      };
    });
    const fish = m.ents.find(e => e.kind === 'fish' && e.fid === 'f1-pier');
    const guidedFishing = !!fish && m.t[index(fish.x, fish.y)] === 4 && neighbours.some(([dx, dy]) => {
      const i = index(fish.x + dx, fish.y + dy);
      return mainland[i] && passable(i) && m.t[i] === 6 && !m.occ.has(i);
    });
    const [cx0, cy0, cx1, cy1] = Geography.city(8);
    return { townGroups, landings, districts, ships, dryShips, serviceEntries, dungeonEntries, guidedFishing,
      capital: m.blds.filter(b => b.x >= cx0 && b.y >= cy0 && b.x + b.w - 1 <= cx1 && b.y + b.h - 1 <= cy1).length,
      specialists: services.map(e => ({ name: e.name,
        reachable: neighbours.some(([dx, dy]) => mainland[index(e.x + dx, e.y + dy)] && !m.occ.has(index(e.x + dx, e.y + dy))),
      })), marigold: m.ents.some(e => e.kind === 'landmark' && e.name === 'The Marigold'),
      shipTile,
    };
  });
  expect(facts.townGroups).toEqual([[1, 3, 4, 6, 7, 8], [2], [5]]);
  expect(facts.landings).toHaveLength(8);
  for (const port of facts.landings) {
    expect(port, `${port.route} · ${port.side}`).toMatchObject({ pier: true, ferryman: true, open: true });
  }
  for (const service of facts.serviceEntries) expect(service.open, `${service.r} · ${service.slot}`).toBe(true);
  expect(facts.dungeonEntries.map(entry => entry.r)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  for (const entry of facts.dungeonEntries) expect(entry, `Dungeon ${entry.r}`).toMatchObject({ open: true, clearRoads: true });
  expect(facts.guidedFishing).toBe(true);
  expect(facts.capital).toBeGreaterThanOrEqual(60);
  expect(facts.capital).toBeLessThanOrEqual(80);
  expect(facts.districts.map(d => d.name)).toEqual(expect.arrayContaining([
    'Council Terrace', 'Temple & Gardens', 'Grand Market', 'Merchants’ Quarter', 'Harbour', 'Residential Wards',
  ]));
  expect(facts.districts).toHaveLength(6);
  for (const district of facts.districts) expect(district.walkable, district.name).toBeGreaterThan(50);
  expect(new Set(facts.specialists.map(e => e.name)).size).toBe(12);
  for (const specialist of facts.specialists) expect(specialist.reachable, specialist.name).toBe(true);
  expect(facts.ships.map(p => p.kind)).toEqual(expect.arrayContaining(['ship_three', 'ship_cog', 'ship_ferry']));
  expect(facts.marigold).toBe(true);
  expect(facts.dryShips).toEqual([]);
  for (const ship of facts.ships) expect(ship, ship.kind).toMatchObject({ atlas: 'world/ships.webp', water: true });
  expect(facts.shipTile).toBeTruthy();
  await stage(frame, facts.shipTile);
  await frame.waitForTimeout(650); // Let the scene fade finish before capturing the harbour.
  await screenshot(page, info, 'tallyport-working-harbour');
  expect(errors).toEqual([]);
});

test('building canvases stay within 32 MiB after visiting every modular building', async ({ page }) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), frame = await surface(page);
  const facts = await frame.evaluate(async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => Scene.preload(i + 1)));
    Scene.pause();
    const { world, draw, buildingCache } = Scene.debug();
    const buildings = world.blds.filter(b => b.modular).sort((a, b) => (b.r === 8) - (a.r === 8) || a.r - b.r || a.y - b.y || a.x - b.x);
    let peakBytes = 0;
    const missing = [];
    for (const b of buildings) {
      const d = b.plan.doors[0], outside = d ? [b.x + d.outside.x, b.y + d.outside.y] : [b.x + (b.w >> 1), b.y + b.h];
      Scene.hop(...Scene.safePosition(outside, b.r));
      draw();
      if (!b.view?.floor.width || !b.view?.roof.width) missing.push(b.plan.id);
      peakBytes = Math.max(peakBytes, buildingCache().bytes);
    }
    const canvases = new Set();
    let retained = 0;
    for (const b of buildings) if (b.view) {
      retained++;
      for (const c of [b.view.floor, b.view.roof, ...b.view.walls.map(w => w.image), ...b.view.furniture.map(f => f.image)]) canvases.add(c);
    }
    const observedBytes = Array.from(canvases, c => c.width * c.height * 4).reduce((total, bytes) => total + bytes, 0);
    return { peakBytes, missing, visited: buildings.length, retained, cache: buildingCache(), observedBytes, canvasCount: canvases.size };
  });
  expect(facts.visited).toBeGreaterThan(130);
  expect(facts.missing).toEqual([]);
  expect(facts.cache.budgetBytes).toBe(32 * 1024 * 1024);
  expect(facts.peakBytes).toBeLessThanOrEqual(facts.cache.budgetBytes);
  expect(facts.cache).toMatchObject({ bytes: facts.observedBytes, views: facts.retained, canvases: facts.canvasCount });
  expect(facts.retained).toBeLessThan(facts.visited);
  expect(errors).toEqual([]);
});

async function sideDoor(frame, r, slot, side) {
  return frame.evaluate(({ r, slot, side }) => {
    const { world: m } = Scene.debug();
    for (const b of m.blds.filter(b => b.r === r && b.slot === slot && b.modular && b.enter)) {
      const point = ({ x, y }) => [b.x + x, b.y + y];
      const free = ([x, y]) => {
        const i = y * m.w + x;
        return m.seen[i] && !m.solid[i] && !m.occ.has(i) && m.t[i] !== 4;
      };
      for (const d of b.plan.doors.filter(d => d.side === side)) {
        const door = point(d), inside = point(d.inside), outside = point(d.outside);
        const neighbour = [-1, 1].map(dy => ({ edge: point({ x: d.x, y: d.y + dy }),
          approach: point({ x: d.outside.x, y: d.outside.y + dy }),
        })).find(({ edge: [x, y], approach }) => m.solid[y * m.w + x] && free(approach));
        if (neighbour && [door, inside, outside].every(free)) {
          return { id: b.plan.id, door, inside, outside, neighbour, facing: [d.facing.x, d.facing.y] };
        }
      }
    }
    throw new Error(`No reachable ${side} entrance to a ${slot} in region ${r}`);
  }, { r, slot, side });
}

test('side entrances use the same walls and cutaway as a walkable courtyard inn', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  const west = await sideDoor(frame, 1, 'warehouse', 'west');
  const east = await sideDoor(frame, 8, 'inn', 'east');
  for (const { id, door, inside, outside, facing, neighbour } of [west, east]) {
    const entering = facing.map(n => -n);
    await stage(frame, neighbour.approach);
    await press(frame, entering, neighbour.approach);
    await stage(frame, outside);
    await press(frame, entering, door);
    await press(frame, entering, inside);
    await frame.waitForFunction(id => Scene.debug().map.blds.some(b => b.plan?.id === id && b.inside && b.fa === 0), id);
    await screenshot(page, info, id === west.id ? 'warehouse-west-cutaway' : 'capital-inn-east-cutaway');
    await press(frame, facing, door);
    await press(frame, facing, outside);
    await frame.waitForFunction(id => Scene.debug().map.blds.some(b => b.plan?.id === id && !b.inside && b.fa === 1), id);
  }

  const court = await frame.evaluate(id => {
    const { world: m, TS } = Scene.debug(), b = m.blds.find(b => b.plan?.id === id);
    const p = b.plan, pixel = (canvas, x, y) => canvas.getContext('2d').getImageData(
      x * TS + TS / 2, y * TS + TS / 2, 1, 1).data[3];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w - 1; x++) {
      if (p.tiles[y * p.w + x] !== Buildings.FLOOR || p.tiles[y * p.w + x + 1] !== Buildings.COURT) continue;
      return { covered: [b.x + x, b.y + y], yard: [b.x + x + 1, b.y + y],
        opacity: [pixel(b.view.roof, x, y), pixel(b.view.roof, x + 1, y), pixel(b.view.floor, x + 1, y)],
        blocked: !!m.solid[(b.y + y) * m.w + b.x + x + 1],
      };
    }
    throw new Error('Capital inn has no open courtyard inside its roof field');
  }, east.id);
  expect(court.opacity).toEqual([255, 0, 255]);
  expect(court.blocked).toBe(false);
  await stage(frame, court.covered);
  await frame.waitForFunction(id => Scene.debug().map.blds.some(b => b.plan?.id === id && b.inside && b.fa === 0), east.id);
  await press(frame, [1, 0], court.yard);
  await frame.waitForFunction(id => Scene.debug().map.blds.some(b => b.plan?.id === id && !b.inside && b.fa === 1), east.id);
  const depth = await frame.evaluate(id => {
    Scene.pause();
    const d = Scene.debug(), b = d.map.blds.find(b => b.plan?.id === id), order = [];
    const furniture = new Set(b.view.furniture.map(f => f.image));
    const hero = new Set(Object.values(d.P.spr).flat(Infinity));
    const context = document.querySelector('#stage canvas.game').getContext('2d'), original = context.drawImage;
    context.drawImage = function(image, ...args) {
      if (image === b.view.roof) order.push('roof');
      if (furniture.has(image)) order.push('furniture');
      if (hero.has(image)) order.push('hero');
      return original.call(this, image, ...args);
    };
    try { d.draw(); } finally { context.drawImage = original; Scene.resume(); }
    return order;
  }, east.id);
  expect(depth).toContain('furniture');
  expect(depth.indexOf('roof')).toBeGreaterThan(depth.lastIndexOf('furniture'));
  expect(depth.indexOf('hero')).toBeGreaterThan(depth.indexOf('roof'));
  await screenshot(page, info, 'capital-open-courtyard');
  expect(errors).toEqual([]);
});

test('a player boards the two island ferries from the pier and lands safely without paying', async ({ page }, info) => {
  const errors = observeErrors(page), frame = await surface(page);
  for (const [route, target, region] of [['tallyport-brackwater', 'Brackwater', 2], ['four-fords-cinderwick', 'Cinderwick', 5]]) {
    const dock = await frame.evaluate(route => {
      const { world: m } = Scene.debug(), e = m.ents.find(e => e.kind === 'ferry' && e.route === route && e.side === 'from');
      const f = Scene.ferries().find(f => f.id === route);
      const free = (x, y) => {
        const i = y * m.w + x;
        return m.seen[i] && !m.solid[i] && !m.occ.has(i) && m.t[i] !== 4;
      };
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const start = [e.x + 2 * dx, e.y + 2 * dy], adjacent = [e.x + dx, e.y + dy];
        if (free(...start) && free(...adjacent)) return { start, adjacent, direction: [-dx, -dy], landing: f.to.at };
      }
      throw new Error('No open approach to ' + route);
    }, route);
    const gold = await frame.evaluate(() => __bw.S.gold);
    expect(await frame.evaluate(region => !!__bw.S.been[region], region)).toBe(false);
    await stage(frame, dock.start);
    await press(frame, dock.direction, dock.adjacent);
    const context = frame.locator('#ctx');
    await expect(context).toContainText('Ferryman');
    await context.click();
    const boarding = frame.getByRole('button', { name: `Board for ${target}` });
    if (!await boarding.isVisible()) await frame.locator('#say-text').click();
    await expect(frame.locator('#say')).toContainText('free crossing');
    await boarding.click();
    const arrived = await frame.evaluate(([x, y]) => {
      const { world: m } = Scene.debug(), [px, py] = Scene.pos(), i = py * m.w + px;
      return { saved: __bw.S.pos, position: [px, py], region: __bw.S.region, visited: !!__bw.S.been[__bw.S.region],
        dist: Math.abs(px - x) + Math.abs(py - y), pier: m.t[i] === 6, free: !m.solid[i] && !m.occ.has(i), gold: __bw.S.gold,
      };
    }, dock.landing);
    expect(arrived).toMatchObject({ region, visited: true, pier: true, free: true, gold });
    expect(arrived.saved).toEqual(arrived.position);
    expect(arrived.dist).toBeLessThanOrEqual(2);
    await frame.waitForFunction(() => !Scene.debug().map.pending);
    await frame.waitForTimeout(650); // Capture the quay after the arrival fade.
    await screenshot(page, info, `${target.toLowerCase()}-ferry-arrival`);
  }
  expect(errors).toEqual([]);
});

test('a displaced saved house relocates once without altering permanent collision', async ({ page }) => {
  const errors = observeErrors(page), frame = await surface(page);
  const result = await frame.evaluate(() => {
    const { world: m } = Scene.debug(), town = Scene.towns()[1], base = m.solid.slice(), baseLights = m.lights.length;
    const home = { id: 'legacy-home', shape: 0, mat: 0, r: 1, x: town[0], y: town[1], w: 4, h: 3,
      wall: '#e0c9ab', roof: '#95533a', pad: 0, chest: [], name: 'Old house',
    };
    const a = Scene.restoreHomes([home]), movedTo = [home.x, home.y];
    const first = m.solid.slice(), lightsAfterFirst = m.lights.length;
    const visitor = home.y * m.w + home.x - 1;
    m.occ.set(visitor, { kind: 'folk', x: home.x - 1, y: home.y });
    const b = Scene.restoreHomes([home, null, { ...home, id: 'invalid-size', w: 1.5 }]);
    const visitorRetained = m.occ.get(visitor)?.kind === 'folk';
    m.occ.delete(visitor);
    const door = Scene.homeDoor(home.id), di = door[1] * m.w + door[0];
    const inhabitable = !m.solid[di] && m.t[di] !== 4 && !m.occ.has(di) && !!m.seen[di];
    const buildings = m.blds.filter(b => b.home?.id === home.id).length;
    const contacts = m.ents.filter(e => e.hid === home.id).length;
    const repeatCollision = m.solid.every((value, i) => value === first[i]);
    const repeatLights = lightsAfterFirst === m.lights.length;
    const position = [home.x, home.y];
    const city = Geography.inTown(...position);
    const invalid = { ...home, id: 'invalid-coordinate', r: 5, x: null, y: -10000 };
    const repaired = Scene.restoreHomes([home, invalid]);
    const invalidRegion = Geography.region(invalid.x, invalid.y);
    Scene.restoreHomes([]);
    return { a, b, movedTo, position, city, inhabitable, buildings, contacts, repeatCollision, repeatLights,
      repaired, invalidRegion, visitorRetained, lightsRestored: m.lights.length === baseLights,
      collisionRestored: m.solid.every((value, i) => value === base[i]),
    };
  });
  expect(result).toMatchObject({ a: true, b: false, city: 0, buildings: 1, contacts: 1, inhabitable: true,
    repeatCollision: true, repeatLights: true, repaired: true, invalidRegion: 5, visitorRetained: true,
    lightsRestored: true, collisionRestored: true,
  });
  expect(result.position).toEqual(result.movedTo);
  expect(errors).toEqual([]);
});
