const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/scene_b.js'), 'utf8');
const start = source.indexOf('  function restoreHomes(');
const end = source.indexOf('\n  function homeDoor(', start);
assert.ok(start >= 0 && end > start);
const restoreSource = source.slice(start, end);

function fixture([x, y]) {
  const w = 64, h = 64;
  const world = { solid: new Uint8Array(w * h).fill(1), keep: new Uint8Array(w * h),
    t: new Uint8Array(w * h), seen: new Uint8Array(w * h).fill(1), occ: new Map() };
  // There is exactly one footprint with the required roof clearance and door.
  for (let yy = y - 5; yy <= y + 4; yy++) for (let xx = x - 1; xx <= x + 4; xx++) world.solid[yy * w + xx] = 0;
  const added = [], towns = []; towns[5] = [24, 24];
  const geography = { region: (x, y) => x >= 0 && y >= 0 && x < w && y < h ? 5 : 0,
    inTown: (x, y) => Math.abs(x - 24) <= 3 && Math.abs(y - 24) <= 3 };
  const restore = new Function('world', 'WW', 'WH', 'TOWN', 'Geography', 'clearHomes', 'addHome',
    restoreSource + '\nreturn restoreHomes;')(world, w, h, towns, geography, () => {}, home => added.push(home));
  return { world, restore, added, index: y * w + x,
    home: { id: 'saved-home', r: 5, x: null, y: -10000, w: 4, h: 3, chest: [{ id: 'kept-item' }] } };
}

for (const [side, site] of [['north', [24, 12]], ['south', [24, 36]], ['west', [12, 24]], ['east', [36, 24]]]) {
  test('saved-house recovery searches the ' + side + ' edge of a relocation ring', () => {
    const f = fixture(site), chest = f.home.chest;
    assert.equal(f.restore([f.home]), true);
    assert.deepEqual([f.home.x, f.home.y], site);
    assert.equal(f.home.r, 5); assert.equal(f.home.id, 'saved-home'); assert.equal(f.home.chest, chest);
    assert.deepEqual(f.added, [f.home]);
  });
}

for (const blocker of ['solid', 'keep', 'water', 'unreachable', 'occupant']) {
  test('saved-house relocation still rejects ' + blocker + ' in its only candidate', () => {
    const f = fixture([24, 12]), i = f.index;
    if (blocker === 'solid' || blocker === 'keep') f.world[blocker][i] = 1;
    if (blocker === 'water') f.world.t[i] = 4;
    if (blocker === 'unreachable') f.world.seen[i] = 0;
    if (blocker === 'occupant') f.world.occ.set(i, { kind: 'folk' });
    assert.throws(() => f.restore([f.home]), /No safe house placement in region 5/);
    assert.equal(f.home.x, null); assert.equal(f.added.length, 0);
  });
}

test('a valid saved house remains fixed when a visitor occupies its plot', () => {
  const f = fixture([24, 12]), visitor = { kind: 'folk' };
  Object.assign(f.home, { x: 24, y: 12 }); f.world.occ.set(f.index, visitor);
  assert.equal(f.restore([f.home]), false);
  assert.deepEqual([f.home.x, f.home.y], [24, 12]); assert.equal(f.world.occ.get(f.index), visitor);
});
