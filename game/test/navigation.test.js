const { test } = require('node:test');
const assert = require('node:assert/strict');
const Navigation = require('../src/navigation');

function grid(rows) {
  return Navigation.create(rows[0].length, rows.length, (x, y) => rows[y][x] === '.');
}
function verifySteps(rows, path) {
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    assert.equal(rows[y][x], '.');
    if (i) assert.equal(Math.abs(path[i - 1][0] - x) + Math.abs(path[i - 1][1] - y), 1);
  }
}

test('ground steps take the shortest legal detour around connected walls and sea', () => {
  const rows = ['......', '.#~~..', '...#..', '...#..', '......'];
  const result = grid(rows).route([0, 2], [5, 2]);
  assert.equal(result.distance, 9);
  assert.equal(result.path.length, 10);
  assert.deepEqual(result.path.at(0), [0, 2]);
  assert.deepEqual(result.path.at(-1), [5, 2]);
  assert.equal(result.boarding, null);
  verifySteps(rows, result.path);
});
test('a chain of islands gives one walkable leg and an explicit boarding side at a time', () => {
  const rows = ['..~...~...', '..~...~...', '..~...~...'];
  const routes = [{ id: 'west', from: [1, 1], to: [3, 1] }, { id: 'east', from: [7, 1], to: [5, 1] }];
  const nav = grid(rows);
  for (const [start, last, boarding] of [
    [[0, 0], [1, 1], { route: 'west', side: 'from' }],
    [[3, 1], [5, 1], { route: 'east', side: 'to' }],
    [[7, 1], [9, 1], null],
  ]) {
    const result = nav.route(start, [9, 1], routes);
    assert.deepEqual(result.boarding, boarding);
    assert.deepEqual(result.path.at(0), start);
    assert.deepEqual(result.path.at(-1), last);
    verifySteps(rows, result.path);
  }
  assert.deepEqual(nav.route([1, 1], [9, 1], routes).path, [[1, 1]]);
});
test('the planner compares actual walking costs at competing ferries', () => {
  const rows = ['....~....', '.##.~.##.', '....~....'];
  const routes = [{ id: 'north', from: [3, 0], to: [5, 0] }, { id: 'south', from: [3, 2], to: [5, 2] }];
  const nav = grid(rows);
  const trip = nav.route([1, 2], [7, 2], routes);
  assert.deepEqual(trip.boarding, { route: 'south', side: 'from' });
  assert.equal(trip.distance, 5);
  assert.deepEqual(nav.route([7, 0], [0, 0], routes).boarding, { route: 'north', side: 'to' });
});
test('outside, unreachable and budget-exhausted routes terminate; the search can be reused', () => {
  const nav = grid(['...~..', '...~..']);
  assert.equal(nav.route([-1, 0], [1, 0]), null);
  assert.equal(nav.route([0, 0], [4, 1]), null);
  assert.equal(nav.route([0, 0], [2, 1], [], 1), null);
  assert.equal(nav.route([0, 0], [3, 0]), null);
  assert.equal(nav.route([0, 0], [2, 1]).distance, 3);
  assert.deepEqual(nav.route([1, 1], [1, 1]).path, [[1, 1]]);
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sceneFragment = fs.readFileSync(path.join(__dirname, '../src/scene_cartography.js'), 'utf8');

function canvas(width, height) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const ctx = {
    getImageData: () => ({ data: pixels.slice() }),
    createImageData: () => ({ data: new Uint8ClampedArray(pixels.length) }),
    putImageData: image => pixels.set(image.data),
  };
  return { pixels, getContext: () => ctx };
}

test('world and local charts share opaque fog, update changed cells, and isolate preview and character masks', () => {
  const mini = canvas(8, 4), reg = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    mini.pixels.set([150, 100, 60, 255], i * 4);
    reg[i] = i % 8 < 4 ? 1 : 2;
  }
  const draw = vm.runInNewContext(sceneFragment + '\ncartographyMap', {
    world: { w: 8, h: 4, mini, reg, cartography: {} }, Cartography: { cellSize: 4 }, mk: canvas,
  });
  const pixel = (c, x) => Array.from(c.pixels.subarray(x * 4, x * 4 + 4));
  const black = [0, 0, 0, 255], surface = [150, 100, 60, 255];
  const mask = new Uint8Array(1), map = draw(mask, {}, 0, 0);
  assert.deepEqual(pixel(map, 0), black);
  assert.deepEqual(pixel(map, 4), black);
  const preview = draw(mask, {}, 2, 0), surveyed = pixel(preview, 4);
  assert.deepEqual(pixel(preview, 0), black);
  assert.notDeepEqual(surveyed, black);
  assert.notDeepEqual(surveyed, surface);
  assert.deepEqual(pixel(map, 4), black);
  assert.equal(mask[0], 0);
  mask[0] = 1;
  assert.equal(draw(mask, {}, 0, 1), map);
  assert.deepEqual(pixel(map, 0), surface);
  assert.deepEqual(pixel(map, 4), black);
  draw(mask, { 2: true }, 0, 1);
  assert.deepEqual(pixel(map, 4), surveyed);
  const other = draw(new Uint8Array(1), {}, 0, 1);
  assert.deepEqual(pixel(other, 0), black);
  assert.deepEqual(pixel(other, 4), black);
});

test('moving a physical atlas restores the previous house, fits a tiny tower and retains an indoor approach', () => {
  const world = { w: 40, h: 30, cartography: {}, blds: [], ents: [], occ: new Map(), solid: new Uint8Array(1200), seen: new Uint8Array(1200) };
  const P = { x: 0, y: 0 };
  const api = vm.runInNewContext(sceneFragment + '\n({ install: cartographyAtlas, inside: cartographyInsideHome })', {
    world, map: world, P, T: 16, K: 3, CartographyArt: { at: { grand_atlas: { r: [0, 0, 288, 199] } } },
    addEnt(m, e) { m.ents.push(e); m.occ.set(e.y * m.w + e.x, e); return e; },
  });
  const homes = [[3, 2], [2, 2], [6, 4]].map(([w, h], i) => {
    const house = { id: 'house' + i, x: 3 + i * 10, y: 4, w, h, r: 1 };
    world.blds.push({ ...house, home: house });
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) world.solid[(house.y + yy) * world.w + house.x + xx] = 1;
    return house;
  });
  for (const [i, house] of homes.entries()) {
    const e = api.install(house);
    assert.equal(world.ents.length, 1);
    assert.equal(api.install(house), e);
    assert.ok(e.objectScale * 288 / 3 <= house.w * 16);
    P.x = e.x; P.y = house.y + house.h;
    assert.equal(api.inside(house), false);
    P.y = e.y + 1;
    assert.equal(world.solid[P.y * world.w + P.x], 0);
    assert.equal(api.inside(house), true);
    if (i) {
      const prior = homes[i - 1], door = prior.x + (prior.w >> 1);
      assert.equal(world.solid[(prior.y + prior.h - 1) * world.w + door], 1);
      assert.equal(api.inside(prior), false);
    }
  }
  api.install(null);
  assert.equal(world.ents.length, 0);
  assert.equal(world.occ.size, 0);
  assert.equal(api.inside(homes.at(-1)), false);
});
