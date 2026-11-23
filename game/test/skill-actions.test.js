const assert = require('node:assert/strict');
const { test } = require('node:test');
const Sneaking = require('../src/sneaking');
const Craft = require('../src/skill_crafting');

function hide(state, overrides = {}) {
  return Sneaking.conceal(state, { hiding: 40, stealth: 0, diff: 25, quality: 1, x: 0, y: 0, random: () => 0, ...overrides });
}

test('concealment respects SQL quality and heavy clothing and failure clears a previous concealment', () => {
  const state = Sneaking.create();
  assert.equal(hide(state, { quality: 0 }), false);
  assert.equal(state.hidden, false);
  assert.equal(hide(state, { random: () => .5 }), true);
  assert.equal(state.hidden, true);
  assert.equal(hide(state, { heavy: true, random: () => .5 }), false);
  assert.deepEqual(state, Sneaking.create());
});

test('concealed movement spends the budget, and running or explicit revelation ends the attempt', () => {
  const state = Sneaking.create();
  assert.equal(hide(state), true);
  assert.equal(state.steps, 3);
  assert.equal(Sneaking.move(state, 0, 0).hidden, true);
  assert.equal(state.steps, 3);
  assert.equal(Sneaking.move(state, 1, 1).hidden, true);
  assert.equal(state.steps, 2);
  assert.equal(Sneaking.move(state, 3, 1).hidden, true);
  assert.equal(state.steps, 0);
  assert.equal(Sneaking.move(state, 4, 1).hidden, false);
  assert.deepEqual(state, Sneaking.create());

  assert.equal(hide(state, { stealth: 80 }), true);
  assert.equal(state.steps, 13);
  assert.equal(Sneaking.move(state, 1, 0, true).hidden, false);
  assert.equal(hide(state), true);
  assert.equal(Sneaking.reveal(state), true);
  assert.equal(Sneaking.reveal(state), false);
});

test('stealth trains once after getting closer to a nearby target on foot', () => {
  const state = Sneaking.create();
  const target = { id: 'merchant', x: 2, y: 0 };
  const approach = (subject = target) => Sneaking.approach(state, subject, Math.hypot(subject.x - state.x, subject.y - state.y));
  assert.equal(hide(state), true);
  assert.equal(approach(), false);
  Sneaking.move(state, 0, 1);
  assert.equal(approach(), false);
  Sneaking.move(state, 1, 0);
  assert.equal(approach(), true);
  assert.equal(approach(), false);
  assert.equal(approach({ id: 'other', x: 2, y: 1 }), false);
  Sneaking.reveal(state);
  assert.equal(approach(), false);
});

test('concealment shrinks detection range, with direction and stealth still affecting close detection', () => {
  const state = Sneaking.create();
  assert.equal(Sneaking.detection(state, 0, 6, false, true), true);
  assert.equal(Sneaking.detection(state, 0, 2.5, false, false), false);
  assert.equal(Sneaking.detection(state, 0, 2.5, true, false), true);
  hide(state);
  assert.equal(Sneaking.detection(state, 0, 6, false, true), false);
  assert.equal(Sneaking.detection(state, 0, 1.2, true, true), true);
  assert.equal(Sneaking.detection(state, 0, 1.2, false, true), false);
  assert.equal(Sneaking.detection(state, 120, 1.2, true, true), false);
  assert.equal(Sneaking.detection(state, 120, .5, true, true), true);
});

test('furniture and spell scroll crafting consume only the selected materials and award only on success', () => {
  const s = { mats: { 1: 20, 2: 3, 7: 2 }, inv: [{ id: 'kept' }], gold: 39 };
  assert.equal(Craft.finish(s, 'missing', 1, true), false);
  assert.equal(Craft.finish(s, 'chest', 7, true), false);
  assert.equal(Craft.finish(s, 'chest', 1.2, true), false);
  assert.deepEqual(s.mats, { 1: 20, 2: 3, 7: 2 });

  assert.equal(Craft.finish(s, 'chest', 1, false), true);
  assert.equal(s.mats[1], 17);
  assert.equal(s.furniture?.chest, undefined);
  assert.equal(Craft.finish(s, 'chest', 1, true), true);
  assert.equal(s.mats[1], 11);
  assert.equal(s.furniture.chest, 1);
  assert.equal(Craft.finish(s, 'spellscroll', 2, true), true);
  assert.equal(s.mats[2], 0);
  assert.equal(s.prepared, 1);
  assert.equal(Craft.finish(s, 'spellscroll', 2, true), false);
  assert.equal(s.prepared, 1);
  assert.equal(s.mats[7], 2);
  assert.equal(s.gold, 39);
  assert.deepEqual(s.inv, [{ id: 'kept' }]);
});

test('home installation consumes one furnishing only on success and preserves stored belongings', () => {
  const s = { furniture: { chest: 2, bed: 2, shelf: 1 } };
  const home = { id: 'h1', xch: 4, chest: [{ id: 'treasure' }] };
  assert.equal(Craft.install(s, null, 'chest'), false);
  assert.equal(Craft.install(s, home, 'spellscroll'), false);
  assert.equal(Craft.install(s, home, 'chest'), true);
  assert.equal(home.xch, 5);
  assert.equal(Craft.install(s, home, 'chest'), false);
  assert.equal(s.furniture.chest, 1);
  assert.equal(Craft.install(s, { id: 'old', fbed: 1 }, 'bed'), false);
  assert.equal(s.furniture.bed, 2);
  assert.equal(Craft.install(s, home, 'bed'), true);
  assert.equal(home.fbed, 1);
  assert.equal(Craft.install(s, home, 'bed'), false);
  assert.equal(s.furniture.bed, 1);
  assert.equal(Craft.install(s, home, 'shelf'), true);
  assert.equal(home.shelf, 1);
  assert.equal(s.furniture.shelf, 0);
  assert.deepEqual(home.chest, [{ id: 'treasure' }]);
});

test('optional lock odds reflect region, depth, skill, disarming and answer quality', () => {
  const near = Craft.lockDifficulty(1);
  const remote = Craft.lockDifficulty(5, 3);
  assert.ok(remote > near);
  const sameRegionDeeper = Craft.lockDifficulty(5, 4);
  assert.ok(sameRegionDeeper > remote);
  assert.equal(Craft.lockDifficulty(8, 30), 95);
  assert.equal(Craft.lockChance(remote, remote, 1), 50);
  assert.equal(Craft.lockChance(remote, remote, .6), 30);
  assert.equal(Craft.lockChance(remote, remote, 0), 0);
  assert.ok(Craft.lockChance(remote + 5, remote, 1) > 50);
  assert.ok(Craft.lockChance(remote, remote, 1, true) > 50);
});
