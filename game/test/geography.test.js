const assert = require('node:assert/strict');
const { test } = require('node:test');
const Geography = require('../src/geography');

const [width, height] = Geography.size;
const total = width * height;
const at = (x, y) => y * width + x;
const mask = new Uint8Array(total);
const counts = new Map();
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const id = Geography.landmass(x, y);
    mask[at(x, y)] = id;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
}

// Cardinal walking connectivity ignores region boundaries within a landmass.
function flood(x, y, walkable) {
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const start = at(x, y);
  assert.ok(walkable(start));
  visited[start] = 1;
  queue[0] = start;
  let tail = 1;
  function visit(i) {
    if (visited[i] || !walkable(i)) return;
    visited[i] = 1;
    queue[tail++] = i;
  }
  for (let head = 0; head < tail; head++) {
    const i = queue[head];
    const column = i % width;
    if (column > 0) visit(i - 1);
    if (column < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < total - width) visit(i + width);
  }
  return { visited, area: tail };
}

test('the mask is deterministic when compiled in a fresh module and is bounded', () => {
  const file = require.resolve('../src/geography');
  delete require.cache[file];
  const fresh = require(file);
  assert.deepEqual(fresh.size, [768, 1152]);
  // Read in reverse order so a different first query triggers compilation.
  let mismatches = 0;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      if (fresh.landmass(x, y) !== mask[at(x, y)]) mismatches++;
    }
  }
  assert.equal(mismatches, 0);
  for (const [x, y] of [[-1, 0], [0, -1], [-.1, 0], [width, 0], [0, height], [NaN, 0], [0, Infinity]]) {
    assert.equal(Geography.landmass(x, y), 0);
    assert.equal(Geography.land(x, y), false);
    assert.equal(Geography.region(x, y), 0);
  }
  assert.equal(Geography.landmass(330.5, 200.5), Geography.landmass(330, 200));
});

test('a mainland and two substantial inhabited islands have separate walking components', () => {
  const allTowns = Geography.towns.slice(1);
  for (const id of [1, 2, 5]) {
    const component = flood(...Geography.towns[id], i => mask[i] !== 0);
    assert.equal(component.area, counts.get(id), `landmass ${id} is continuous and isolated`);
    for (let r = 1; r <= allTowns.length; r++) {
      const mass = r === 2 || r === 5 ? r : 1;
      assert.equal(component.visited[at(...allTowns[r - 1])], Number(mass === id), `town ${r}`);
    }
  }
  assert.ok(counts.get(1) > 350000);
  assert.ok(counts.get(2) > 20000);
  assert.ok(counts.get(5) > 25000);
  const skerries = [...counts].filter(([id]) => id > 8);
  assert.ok(skerries.length >= 3);
  assert.ok(skerries.every(([, tiles]) => tiles < 1000));
});

test('settlement envelopes are dry, including the 160 by 130 tile capital extent', () => {
  const capital = Geography.city(8);
  assert.equal(capital[2] - capital[0], 160);
  assert.equal(capital[3] - capital[1], 130);
  assert.equal(Geography.city(0), null);
  assert.equal(Geography.city(9), null);
  for (let r = 1; r < Geography.towns.length; r++) {
    assert.equal(Geography.region(...Geography.towns[r]), r);
    assert.equal(Geography.inTown(...Geography.towns[r]), r);
    const [x0, y0, x1, y1] = Geography.city(r);
    const expected = r === 2 || r === 5 ? r : 1;
    let unsuitable = 0;
    for (let y = y0 - 1; y <= y1 + 1; y++) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (Geography.landmass(x, y) !== expected || Geography.inTown(x, y, 1) !== r) unsuitable++;
      }
    }
    assert.equal(unsuitable, 0, `town ${r} and its one-tile clearance stay on land`);
  }
});

test('shoreline has margins, inlets and headlands, with no enclosed sea', () => {
  for (let i = 0; i < 12; i++) {
    for (let x = 0; x < width; x++) assert.equal(mask[at(x, i)] + mask[at(x, height - 1 - i)], 0);
    for (let y = 0; y < height; y++) assert.equal(mask[at(i, y)] + mask[at(width - 1 - i, y)], 0);
  }
  const coast = y => mask.subarray(at(0, y), at(width, y)).indexOf(1);
  assert.ok(coast(345) - coast(405) >= 45, 'northwest bay cuts inland');
  assert.ok(coast(595) - coast(700) >= 45, 'western headland projects beyond the next bay');
  assert.ok(coast(1015) - coast(900) >= 45, 'southern coast narrows away from Tallyport');
  const sea = flood(0, 0, i => mask[i] === 0);
  assert.equal(sea.area, counts.get(0));
});

test('region identities match mainland proximity and island boundaries', () => {
  let invalid = 0;
  const mainland = new Set([1, 3, 4, 6, 7, 8]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const id = mask[at(x, y)], r = Geography.region(x, y);
      if (id === 2 || id === 5 ? r !== id : !mainland.has(r)) invalid++;
    }
  }
  assert.equal(invalid, 0);
});

test('mainland links cover all mainland towns and ferry landings adjoin the open sea', () => {
  const mainland = new Set([1, 3, 4, 6, 7, 8]);
  const joined = new Set([1]);
  for (const [a, b] of Geography.roadLinks) assert.ok(mainland.has(a) && mainland.has(b));
  for (let pass = 1; pass < mainland.size; pass++) {
    for (const [a, b] of Geography.roadLinks) {
      if (joined.has(a)) joined.add(b);
      if (joined.has(b)) joined.add(a);
    }
  }
  assert.deepEqual(joined, mainland);

  const connections = [];
  for (const { from, to } of Geography.ferries) {
    assert.notEqual(from.landmass, to.landmass);
    connections.push([from.region, to.region]);
    for (const { region, landmass, tile: [x, y] } of [from, to]) {
      assert.equal(Geography.landmass(x, y), landmass);
      assert.equal(Geography.region(x, y), region);
      let sea = false;
      for (let dy = -16; dy <= 16 && !sea; dy++) {
        for (let dx = -16; dx <= 16; dx++) {
          if (dx * dx + dy * dy <= 16 * 16 && !Geography.land(x + dx, y + dy)) { sea = true; break; }
        }
      }
      assert.ok(sea, `the landing for region ${region} is within a pier length of sea`);
    }
  }
  assert.deepEqual(connections, [[1, 2], [2, 3], [4, 5], [5, 8]]);
});
