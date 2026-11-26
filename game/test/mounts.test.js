const assert = require('node:assert/strict');
const test = require('node:test');
const Mounts = require('../src/mounts');
const MountView = require('../src/mount_view');
const ActorRig = require('../src/actor_rig');

const outside = { outdoors: true };
const walkingHorse = { owned: true, mounted: false };
const mountedHorse = { owned: true, mounted: true };

test('horse ownership survives serialization and rejects a mounted-only state', () => {
  assert.deepEqual(Mounts.normalize(undefined), { owned: false, mounted: false });
  assert.deepEqual(Mounts.normalize({ mounted: true }), { owned: false, mounted: false });
  assert.deepEqual(Mounts.normalize({ owned: 'yes', mounted: 1 }), { owned: false, mounted: false });
  assert.deepEqual(Mounts.normalize(JSON.parse(JSON.stringify(mountedHorse))), mountedHorse);
  assert.notEqual(Mounts.normalize(mountedHorse), mountedHorse);
  assert.equal(Mounts.toggle(undefined, outside).reason, 'horse');
});

test('a stable purchase charges 650 once and keeps horse ownership on the buying character', () => {
  const buyer = Mounts.normalize(undefined), otherCharacter = Mounts.normalize(undefined);
  const tooPoor = Mounts.buy(buyer, 649);
  assert.equal(tooPoor.reason, 'gold');
  assert.equal(tooPoor.gold, 649);
  assert.equal(Mounts.buy(buyer, Infinity).ok, false);
  const sale = Mounts.buy(buyer, 650);
  assert.deepEqual(sale, { ok: true, state: walkingHorse, gold: 0 });
  const duplicate = Mounts.buy(sale.state, 900);
  assert.equal(duplicate.reason, 'owned');
  assert.equal(duplicate.gold, 900);
  assert.deepEqual(buyer, otherCharacter);
  assert.deepEqual(otherCharacter, { owned: false, mounted: false });
});

test('indoor, dungeon, ship, and combat transitions dismount while preserving ownership', () => {
  assert.deepEqual(Mounts.toggle(walkingHorse, outside), { ok: true, state: mountedHorse });
  assert.deepEqual(Mounts.toggle(mountedHorse, outside), { ok: true, state: walkingHorse });
  for (const context of [{}, { outdoors: false }, ...['indoors', 'dungeon', 'ship', 'combat']
    .map(place => ({ outdoors: true, [place]: true }))]) {
    const transition = Mounts.enforceContext(mountedHorse, context);
    assert.deepEqual(transition, walkingHorse);
    assert.deepEqual(Mounts.enforceContext(transition, outside), walkingHorse);
    assert.deepEqual(Mounts.toggle(transition, context), { ok: false, reason: 'place', state: walkingHorse });
  }
  assert.deepEqual(Mounts.enforceContext(mountedHorse, outside), mountedHorse);
});

test('mounted full pace is exactly 1.7 times the current human run speed', () => {
  const walk = ActorRig.speed(false), run = ActorRig.speed(true);
  assert.equal(Mounts.speed(mountedHorse, run, run, 1, outside), run * 1.7);
  assert.equal(Mounts.speed(mountedHorse, walk, run, 0, outside), walk);
  assert.equal(Mounts.speed(mountedHorse, walk, run, .5, outside), (walk + run * 1.7) / 2);
  assert.equal(Mounts.speed(walkingHorse, run, run, 1, outside), run);
  assert.equal(Mounts.speed(mountedHorse, walk, run, 1, { ...outside, dungeon: true }), walk);
});

test('horse pose follows actual distance and covers all eight headings', () => {
  const poses = Array.from({ length: 8 }, (_, direction) => MountView.pose({ direction }));
  assert.deepEqual(poses.map(pose => pose.row), [0, 1, 5, 3, 4, 3, 2, 1]);
  assert.deepEqual(poses.filter(pose => pose.flip).map(pose => pose.facing), [1, 3]);
  assert.ok(poses.every(pose => pose.column === 0 && pose.lift === 0));
  const options = { direction: 6, moving: true, running: true };
  const travel = [0, .4, .8, 1.2, 1.5, 1.9, 2.3, 2.7, 2.9];
  assert.deepEqual(travel.map(distance => MountView.pose({ ...options, distance }).column), [1, 2, 3, 4, 5, 6, 7, 8, 1]);
});
