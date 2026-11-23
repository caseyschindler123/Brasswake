const assert = require('node:assert/strict');
const { test } = require('node:test');
const Cartography = require('../src/cartography');

const town = { id: 'town-1', kind: 'town', r: 1, x: 320, y: 930 };
const filledState = () => {
  const state = Cartography.create();
  for (let r = 1; r <= 8; r++) state.maps[r] = true;
  return state;
};

test('walking adds a bounded circle of cells and retains previously charted ground', () => {
  const mask = Cartography.createMask();
  assert.equal(Cartography.exploredAt(mask, 160, 300), false);
  assert.equal(Cartography.reveal(mask, 160, 300), true);
  assert.equal(Cartography.reveal(mask, 160, 300), false);
  assert.equal(Cartography.exploredAt(mask, 160, 300), true);
  assert.equal(Cartography.exploredAt(mask, 172, 300), true);
  assert.equal(Cartography.exploredAt(mask, 176, 300), false);
  assert.equal(Cartography.exploredAt(mask, 172, 312), false);

  assert.equal(Cartography.reveal(mask, 0, 0, 9999), true);
  assert.equal(Cartography.exploredAt(mask, 0, 0), true);
  assert.equal(Cartography.exploredAt(mask, 16, 0), false);
  assert.equal(Cartography.exploredAt(mask, 767, 1151), false);
  assert.equal(Cartography.reveal(mask, 768, 300), false);
  assert.equal(Cartography.reveal(mask, NaN, 300), false);
  assert.equal(Cartography.exploredAt(mask, -1, 0), false);
  assert.equal(Cartography.exploredAt(mask, 160, 300), true);
});

test('the packed form round-trips edge and sparsely revealed cells', () => {
  const mask = Cartography.createMask();
  assert.equal(Cartography.encode(mask), '');
  for (const [x, y] of [[0, 0], [360, 600], [767, 1151]]) Cartography.reveal(mask, x, y);
  const packed = Cartography.encode(mask);
  const loaded = Cartography.decode(JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(loaded, mask);
  assert.equal(Cartography.exploredAt(loaded, 767, 1151), true);
  assert.equal(Cartography.exploredAt(loaded, 767, 0), false);
  assert.equal(Cartography.exploredAt(loaded, 360, 600), true);
  assert.equal(Cartography.exploredAt(loaded, 361, 650), false);
});

test('corrupt and oversize discovery strings cannot reveal terrain or expand slot storage', () => {
  const blank = Cartography.createMask();
  for (const explored of ['B B', 'B\n', '/+', '_'.repeat(blank.length + 1), [], {}]) {
    const restored = Cartography.normalize({ v: 1, explored, maps: { 1: true }, waypoint: { id: 'town-1' } });
    assert.deepEqual(restored, { v: 1, explored: '', maps: { 1: true }, waypoint: { id: 'town-1' } });
    assert.deepEqual(Cartography.decode(explored), blank);
  }
  assert.equal(Cartography.encode(Cartography.decode('BAAA')), 'B');
  assert.equal(Cartography.exploredAt(Cartography.decode('B'), 0, 0), true);
});

test('all five fully explored slots serialize compactly and remain independent', () => {
  const full = Cartography.createMask().fill(63);
  const explored = Cartography.encode(full);
  const save = JSON.stringify(Array.from({ length: 5 }, () => ({ cartography: { ...filledState(), explored } })));
  assert.ok(Buffer.byteLength(save, 'utf8') < 48_000);
  const states = JSON.parse(save).map(slot => Cartography.normalize(slot.cartography));
  for (const state of states) {
    const mask = Cartography.decode(state.explored);
    assert.deepEqual(mask, full);
    assert.equal(Cartography.exploredAt(mask, 767, 1151), true);
  }
  const firstOnly = Cartography.decode(states[0].explored);
  firstOnly.fill(0);
  states[0].explored = Cartography.encode(firstOnly);
  states[0].waypoint = { id: 'town-1' };
  delete states[0].maps[1];
  assert.equal(Cartography.exploredAt(Cartography.decode(states[1].explored), 767, 1151), true);
  assert.equal(Cartography.ownsMap(states[1], 1), true);
  assert.equal(states[1].waypoint, null);
  assert.notEqual(Cartography.create().maps, Cartography.create().maps);
});

test('normalization accepts only current map booleans and a stable, coordinate-free waypoint', () => {
  const saved = {
    v: 1, explored: 'BAAA', maps: { 0: true, 1: true, 2: 1, 3: 'true', 8: true, 9: true, '02': true },
    waypoint: { id: 'ferry:tallyport-brackwater:from', x: 25, y: 30, teleport: true }
  };
  const state = Cartography.normalize(saved);
  assert.deepEqual(state, { v: 1, explored: 'B', maps: { 1: true, 8: true }, waypoint: { id: saved.waypoint.id } });
  state.maps[1] = false;
  state.waypoint.id = 'town-1';
  assert.equal(saved.maps[1], true);
  assert.equal(saved.waypoint.id, 'ferry:tallyport-brackwater:from');
  assert.deepEqual(Cartography.normalize({ ...saved, v: 999 }), Cartography.create());
  assert.deepEqual(Cartography.normalize(undefined), Cartography.create());
  for (const waypoint of [{ x: 1, y: 2 }, { id: 'X'.repeat(65) }, { id: 'town-1\n' }, { id: '../town-1' }, 'town-1']) {
    assert.equal(Cartography.normalizeWaypoint(waypoint), null);
  }
  assert.equal(Cartography.ownsMap({ v: 1, maps: Object.create({ 1: true }) }, 1), false);
});

test('regional purchase quotes recheck the shop, gold and ownership after each purchase', () => {
  const state = Cartography.create();
  let wallet = 13200;
  assert.deepEqual(Cartography.quoteMap(state, 1, 599, 1), { ok: false, cost: 600, reason: 'gold' });
  assert.equal(Cartography.quoteMap(state, 1, wallet, 2).reason, 'shop');
  assert.equal(Cartography.quoteMap(state, 9, wallet, 9).reason, 'region');
  assert.equal(Cartography.quoteMap(state, 1, Infinity, 1).reason, 'gold');
  for (let r = 1; r <= 8; r++) {
    assert.equal(Cartography.allMaps(state), false);
    const quote = Cartography.quoteMap(state, r, wallet, r);
    assert.equal(quote.ok, true);
    assert.equal(Cartography.ownsMap(state, r), false);
    wallet -= quote.cost;
    state.maps[r] = true;
    assert.equal(Cartography.quoteMap(state, r, wallet, r).reason, 'owned');
  }
  assert.equal(wallet, 0);
  assert.equal(Cartography.allMaps(state), true);
  assert.equal(Cartography.price(8), 2700);
  assert.equal(Cartography.price('8'), null);
  assert.equal(state.explored, '');
});

test('atlas purchase is available in Aldermoot only after all eight maps, and is shared once bought', () => {
  const state = filledState();
  assert.equal(Cartography.quoteAtlas(state, 50000, 7, false).reason, 'shop');
  assert.equal(Cartography.quoteAtlas(state, 29999, 8, false).reason, 'gold');
  assert.deepEqual(Cartography.quoteAtlas(state, 30000, 8, false), { ok: true, cost: 30000, reason: null });
  delete state.maps[4];
  assert.equal(Cartography.quoteAtlas(state, 30000, 8, false).reason, 'maps');
  assert.equal(Cartography.quoteAtlas(filledState(), 30000, 8, true).reason, 'owned');
  assert.equal(Cartography.quoteAtlas(Cartography.create(), 30000, 8, true).reason, 'owned');
});

test('only registered public surface kinds are eligible and a regional map works in its own region', () => {
  const state = Cartography.create();
  const here = { mode: 'regional', surface: true, region: 1 };
  assert.equal(Cartography.canTravel(state, town, here), false);
  state.maps[1] = true;
  for (const kind of ['town', 'stairs', 'poi', 'fish', 'ferry']) {
    assert.equal(Cartography.canTravel(state, { ...town, kind }, here), true, kind);
  }
  for (const site of [{ kind: 'home' }, { kind: 'lair' }, { kind: 'roam' }, { kind: 'dtravel' }, { kind: 'mon' },
    { kind: 'poi', secret: true }, { id: '' }, { x: -1 }, { y: 0.5 }]) {
    assert.equal(Cartography.isPublicDestination({ ...town, ...site }), false, JSON.stringify(site));
    assert.equal(Cartography.canTravel(state, { ...town, ...site }, here), false);
  }
  state.maps[2] = true;
  assert.equal(Cartography.canTravel(state, { ...town, id: 'town-2', r: 2 }, here), false);
  for (const context of [{ mode: 'preview' }, { surface: false }, { blocked: true }, { region: 2 }]) {
    assert.equal(Cartography.canTravel(state, town, { ...here, ...context }), false);
  }
});

test('atlas travel requires the installed house, safe context and the using character’s collection', () => {
  const state = filledState();
  const use = { mode: 'atlas', surface: true, region: 8, houseId: 'home-a', installedHouseId: 'home-a' };
  assert.equal(Cartography.canTravel(state, town, use), true);
  for (const context of [{ houseId: null }, { houseId: 'home-b' }, { installedHouseId: null }, { blocked: true },
    { surface: false }, { mode: 'regional' }]) {
    assert.equal(Cartography.canTravel(state, town, { ...use, ...context }), false);
  }
  assert.equal(Cartography.canTravel(state, { ...town, kind: 'home' }, use), false);
  assert.equal(Cartography.canTravel(Cartography.create(), town, use), false);
  delete state.maps[8];
  assert.equal(Cartography.canTravel(state, town, use), false);
});
