const assert = require('node:assert/strict');
const { test } = require('node:test');
const Geography = require('../src/geography');
const WorldProgress = require('../src/world_progress');

const oldTowns = [, [100, 892], [448, 872], [416, 642], [154, 618],
  [134, 388], [448, 368], [420, 138], [144, 126]];
const offset = ([x, y], dx, dy) => [x + dx, y + dy];
const oldPoint = (r, dx, dy) => offset(oldTowns[r], dx, dy);
const newPoint = (r, dx, dy) => offset(Geography.towns[r], dx, dy);

test('saved errand directions and place names follow moved sites without changing progress or rewards', () => {
  const find = { id: 'h2-5', type: 'find', at: 'p2-shrine', from: 'Robin', who: 'the fallen statue', where: 'east',
    what: 'Find the hammer near the fallen statue, east of Robin’s place',
    line: 'At least look east, near the fallen statue.', found: true, gold: 48, bonus: 'key' };
  const deliver = { id: 'w2-0', type: 'deliver', to: 'h2-6', from: 'May', who: 'Old Ash', where: 'north',
    what: 'Carry a parcel to Old Ash, north of May’s place', line: 'Take this to Old Ash, north of here.', gold: 44 };
  const hunt = { id: 'h2-6', type: 'hunt', have: 2, n: 3, tpl: 'b201', gold: 52 };
  const s = { er: { a: { 'h2-5': find, 'w2-0': deliver, 'h2-6': hunt }, d: { old: 'done' }, n: 9 }, boss: { 1: true } };
  const sites = [{ id: 'h2-5', name: 'Robin', x: 10, y: 10 }, { id: 'p2-shrine', name: 'Old shrine', x: 10, y: 0 },
    { id: 'w2-0', name: 'May', x: 0, y: 10 }, { id: 'h2-6', name: 'Ash', x: 10, y: 10 }];
  const beforeHunt = { ...hunt };
  assert.equal(WorldProgress.reconcileErrands(s, sites), true);
  assert.equal(find.line, 'At least look north, near the old shrine.');
  assert.equal(find.what, 'Find the hammer near the old shrine, north of Robin’s place');
  assert.equal(deliver.what, 'Carry a parcel to Ash, east of May’s place');
  assert.equal(find.found, true); assert.equal(find.gold, 48); assert.equal(find.bonus, 'key');
  assert.equal(deliver.to, 'h2-6'); assert.equal(deliver.gold, 44);
  assert.deepEqual(hunt, beforeHunt); assert.deepEqual(s.er.d, { old: 'done' }); assert.equal(s.er.n, 9);
  assert.equal(s.er.a['h2-5'], find);
  assert.equal(WorldProgress.reconcileErrands(s, sites), false);
});

test('an unknown saved errand target is retained without rewriting or paying it', () => {
  const s = { er: { a: { old: { id: 'old', type: 'find', at: 'unknown', found: false, gold: 20 } } } };
  const before = structuredClone(s);
  assert.equal(WorldProgress.reconcileErrands(s, []), false);
  assert.deepEqual(s, before);
});

test('translates all five slots and preserves character progress in place', () => {
  const regions = [1, 2, 4, 5, 8];
  const slots = regions.map((region, slot) => ({
    v: slot === 2 ? 5 : 6, wv: 2, name: `Slot ${slot}`, region, pos: oldPoint(region, 5, -3),
    gold: 0, inv: [{ id: 'g1', name: 'Iron axe' }], eq: { weapon: 'g1' }, skills: { select: { v: .85 } },
    seen: { firstDayManifest: true }, boss: { 1: true }, done: { firstLesson: true }, gd: 8, gn: 3,
    bank: { gold: 19, items: [{ id: 'b1' }] }, dungeons: { 1: { seen: { 0: 'b1:D' }, keeper: true } },
    extra: { test: 1 },
  }));
  const account = { v: 7, cur: 1, main: 0, rev: 56, slots, codex: { u1: true }, cmds: { SELECT: true }, homes: [] };
  const previous = JSON.parse(JSON.stringify(account));
  const originalSlots = [...slots];
  const originalInventory = slots[0].inv;
  const result = WorldProgress.migrateAccount(account);
  assert.equal(result, account);
  assert.equal(account.wv, 3);
  assert.equal(account.slots, slots);
  for (const [slot, region] of regions.entries()) {
    assert.equal(account.slots[slot], originalSlots[slot]);
    previous.slots[slot].pos = newPoint(region, 5, -3);
    previous.slots[slot].wv = 3;
  }
  assert.equal(slots[0].inv, originalInventory);
  previous.wv = 3;
  assert.deepEqual(account, previous);
});

test('shared homes translate once with their IDs, items, material and paint preserved', () => {
  const [x, y] = oldPoint(5, -36, 31);
  const house = {
    id: 'h1', name: 'Workshop', r: 5, x, y, w: 4, h: 3, pad: 1,
    shape: 7, mat: 1, wall: '#887766', roof: '#353535', chest: [{ id: 'axe', quantity: 1 }],
    archive: { wood: 12 },
  };
  const chest = house.chest;
  const account = { v: 6, slots: [null, null, null, null, null], homes: [house] };
  const expected = { ...house };
  [expected.x, expected.y] = newPoint(5, -36, 31);
  WorldProgress.migrateAccount(account);
  assert.deepEqual(house, expected);
  assert.equal(house.chest, chest);
  assert.equal(account.homes[0], house);

  // Legacy inactive slots can arrive with an already-migrated shared account.
  account.slots[4] = { wv: 2, region: 2, pos: oldPoint(2, 4, 8) };
  WorldProgress.migrateAccount(account);
  assert.deepEqual(account.slots[4].pos, newPoint(2, 4, 8));
  assert.deepEqual(house, expected);
  const migrated = JSON.stringify(account);
  WorldProgress.migrateAccount(account);
  assert.equal(JSON.stringify(account), migrated);
});

test('surface returns and corpses move while floor-local positions and loot do not', () => {
  const surfaceLoot = { gold: 0, items: [{ id: 'worn', was: 'weapon' }], scrolls: ['s2r'] };
  const floorBody = { x: 18, y: 21, loot: { gold: 40 }, until: 200000 };
  const [x, y] = oldPoint(5, -9, 23);
  const character = {
    v: 6, wv: 2, region: 2,
    pos: oldPoint(2, 10, -6),
    dungeon: { r: 2, f: 1, x: 28, y: 19, back: oldPoint(2, 15, -9), tutorial: false },
    dungeons: { 2: { seen: { 0: [18, 19], 1: 'b1:Ux' }, bodies: { guard: floorBody } } },
    remains: { x, y, loot: surfaceLoot, until: 300000 },
  };
  const floorProgress = character.dungeons[2];
  assert.equal(WorldProgress.migrateCharacter(character), character);
  assert.deepEqual(character.pos, newPoint(2, 10, -6));
  assert.deepEqual(character.dungeon, { r: 2, f: 1, x: 28, y: 19, back: newPoint(2, 15, -9), tutorial: false });
  assert.equal(character.dungeons[2], floorProgress);
  assert.deepEqual(floorProgress.seen, { 0: [18, 19], 1: 'b1:Ux' });
  assert.equal(floorProgress.bodies.guard, floorBody);
  assert.deepEqual(floorBody, { x: 18, y: 21, loot: { gold: 40 }, until: 200000 });
  assert.deepEqual([character.remains.x, character.remains.y], newPoint(5, -9, 23));
  assert.equal(character.remains.loot, surfaceLoot);
  assert.equal(character.remains.until, 300000);
  const saved = JSON.stringify(character);
  WorldProgress.migrateCharacter(character);
  assert.equal(JSON.stringify(character), saved);
});

test('a pending death recovers beside its region healer and preserves a live corpse', () => {
  const oldHealer = oldPoint(2, -13, 10);
  const [x, y] = oldPoint(2, 31, -3);
  const character = {
    wv: 2, region: 2, hp: 0, gold: 0, pos: oldHealer, deathPending: { r: 2, at: oldHealer },
    remains: { x, y, until: 1700000000, loot: { gold: 0, items: [{ id: 'sword' }] } },
  };
  const nextHealer = newPoint(2, -13, 10);
  WorldProgress.migrateCharacter(character);
  assert.deepEqual(character.deathPending, { r: 2, at: nextHealer });
  assert.deepEqual(character.pos, nextHealer);
  assert.deepEqual([character.remains.x, character.remains.y], newPoint(2, 31, -3));
  assert.deepEqual(character.remains.loot.items, [{ id: 'sword' }]);
  assert.equal(character.remains.until, 1700000000);
  assert.equal(character.hp, 0);
  assert.equal(character.gold, 0);
});

test('out-of-range legacy coordinates use safe regional candidates and keep first arrival null', () => {
  const loot = { gold: 6 };
  const malformed = {
    wv: 1, region: 5, pos: [9000, -1], deathPending: { r: 5, at: null },
    remains: { x: Infinity, y: 2, loot, until: 9999999 },
    dungeon: { r: 5, f: 1, x: 28, y: 12, back: ['4', '5'] },
  };
  const home = { id: 'x', r: 8, x: -80, y: NaN, w: 6, h: 4, chest: [{ id: 'kept' }] };
  const fresh = { v: 6, region: 1, pos: null, intro: 0 };
  const pending = { region: 1, deathPending: true, remains: 'old' };
  const future = { region: 2, wv: 4, pos: [640, 1010] };
  const account = { slots: [malformed, null, fresh, pending, future], homes: [null, home] };
  WorldProgress.migrateAccount(account);
  assert.deepEqual(malformed.pos, newPoint(5, 0, 3));
  assert.deepEqual(malformed.deathPending.at, newPoint(5, -13, 10));
  assert.deepEqual(malformed.dungeon.back, newPoint(5, 0, 3));
  assert.deepEqual([malformed.remains.x, malformed.remains.y], newPoint(5, 0, 3));
  assert.equal(malformed.remains.loot, loot);
  assert.equal(fresh.pos, null);
  assert.equal(fresh.intro, 0);
  assert.equal(fresh.wv, WorldProgress.revision);
  assert.equal(pending.deathPending, null);
  assert.equal(pending.remains, null);
  assert.deepEqual(future, { region: 2, wv: 4, pos: [640, 1010] });
  assert.equal(account.homes[0], null);
  assert.equal(home.id, 'x');
  assert.deepEqual(home.chest, [{ id: 'kept' }]);
  for (let dy = -1; dy <= home.h + 1; dy++) {
    for (let dx = -1; dx <= home.w; dx++) {
      assert.ok(Geography.land(home.x + dx, home.y + dy));
      assert.equal(Geography.inTown(home.x + dx, home.y + dy), 0);
    }
  }
});

test('an old countryside position translated into sea stays on the same island', () => {
  const character = { wv: 2, region: 2, pos: oldPoint(2, 111, 31) };
  assert.equal(Geography.land(...newPoint(2, 111, 31)), false);
  WorldProgress.migrateCharacter(character);
  assert.equal(Geography.landmass(...character.pos), 2);
  assert.equal(Geography.region(...character.pos), 2);
});
