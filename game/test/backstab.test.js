const assert = require('node:assert/strict');
const { test } = require('node:test');
const Backstab = require('../src/backstab');

test('a leashed guardian routes around a concave obstacle without teleporting or unbounded searches', () => {
  const blocked=new Set(['1,0','0,1','0,-1']),free=(x,y)=>Math.abs(x)<=5&&Math.abs(y)<=5&&!blocked.has(x+','+y);
  const first=Backstab.returnStep([0,0],[2,0],free);
  assert.deepEqual(first,[-1,0]);
  let at=[0,0];for(let n=0;n<24&&(at[0]!==2||at[1]!==0);n++){const next=Backstab.returnStep(at,[2,0],free);assert.ok(next);assert.equal(Math.abs(next[0]-at[0])+Math.abs(next[1]-at[1]),1);at=next;}
  assert.deepEqual(at,[2,0]);
  assert.equal(Backstab.returnStep([0,0],[2,0],()=>false),null);
  assert.equal(Backstab.returnStep([0,0],[2,0],free,1),null);
});

test('Backstab recognises a rear arc for all eight native facings', () => {
  const offsets = [[0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]];
  for (const [direction, [x, y]] of offsets.entries()) {
    assert.equal(Backstab.rear(-x, -y, direction), true, 'rear of facing ' + direction);
    assert.equal(Backstab.rear(x, y, direction), false, 'front of facing ' + direction);
    assert.equal(Backstab.rear(y, -x, direction), false, 'flank of facing ' + direction);
    assert.equal(Backstab.rear(-y, x, direction), false, 'opposite flank of facing ' + direction);
  }
  assert.equal(Backstab.rear(1, -1, 0), true);
  assert.equal(Backstab.rear(Math.sqrt(3), -1, 0), true);
  assert.equal(Backstab.rear(2, -1, 0), false);
  assert.equal(Backstab.rear(0, 0, 0), false);
  assert.equal(Backstab.rear(0, -1, 8), false);
  assert.equal(Backstab.rear(0, -1, -1), false);
  assert.equal(Backstab.rear(0, -1, 1.5), false);
  assert.equal(Backstab.rear(Infinity, -1, 0), false);
});

test('Backstab requires a Fencing weapon, both books, trained Stealth and an adjacent concealed rear approach', () => {
  const ready = {
    weapon: 'fencing', shadow: true, arms: true, stealth: 10, stamina: 8,
    hidden: true, approached: true, rear: true, distance: 1.6, visible: true,
  };
  assert.equal(Backstab.readiness(ready), null);
  for (const [change, reason] of [
    [{ weapon: 'swords' }, 'weapon'],
    [{ arms: false }, 'books'],
    [{ shadow: false }, 'books'],
    [{ stealth: 9.9 }, 'stealth'],
    [{ stamina: 7.9 }, 'stamina'],
    [{ hidden: false }, 'hidden'],
    [{ approached: false }, 'approach'],
    [{ rear: false }, 'rear'],
    [{ distance: 1.61 }, 'distance'],
    [{ distance: 0 }, 'distance'],
    [{ distance: NaN }, 'distance'],
    [{ visible: false }, 'sight'],
  ]) {
    assert.equal(Backstab.readiness({ ...ready, ...change }), reason);
  }
  assert.equal(Backstab.MIN_STEALTH, 10);
  assert.equal(Backstab.STAMINA, 8);
});

test('Backstab damage increases within the 2.5 to 3.5 range', () => {
  assert.equal(Backstab.factor(-5), 2.5);
  assert.equal(Backstab.factor(0), 2.5);
  assert.equal(Backstab.factor(60), 3);
  assert.equal(Backstab.factor(120), 3.5);
  assert.equal(Backstab.factor(140), 3.5);
  assert.equal(Backstab.factor(Infinity), 3.5);
  assert.equal(Backstab.factor(NaN), 2.5);
});

const settled = { kind: 'boss', hp: 65, max: 120, round: 3 };
const time = 160000;

test('wound recall preserves health and the next Examiner phase on settled re-entry', () => {
  const wounds = Backstab.memory(), entity = {}, owner = {};
  Backstab.remember(wounds, entity, owner, settled, time);
  const restored = Backstab.recall(wounds, entity, owner, 'boss', 120, time + 10);
  assert.deepEqual(restored, { hp: 65, max: 120, round: 3 });
  restored.hp = 1;
  assert.deepEqual(Backstab.recall(wounds, entity, owner, 'boss', 120, time + Backstab.MEMORY_MS),
    { hp: 65, max: 120, round: 3 });
  Backstab.remember(wounds, entity, owner, { ...settled, hp: 37, round: 4 }, time + 500);
  assert.deepEqual(Backstab.recall(wounds, entity, owner, 'boss', 120, time + 501),
    { hp: 37, max: 120, round: 4 });
});

test('expiry, clock rollback and the wrong owner, kind or maximum discard old wounds', () => {
  const wounds = Backstab.memory(), entity = {}, owner = {};
  const valid = [wounds, entity, owner, 'boss', 120];
  assert.equal(Backstab.MEMORY_MS, 120000);
  for (const args of [
    [...valid, time + Backstab.MEMORY_MS + 1],
    [...valid, time - 1],
    [wounds, entity, {}, 'boss', 120, time],
    [wounds, entity, owner, 'monster', 120, time],
    [wounds, entity, owner, 'boss', 127, time],
  ]) {
    Backstab.remember(wounds, entity, owner, settled, time);
    assert.equal(Backstab.recall(...args), null);
    assert.equal(Backstab.recall(...valid, time), null);
  }
});

test('full health, death, reset and a true replacement creature never restore wounds', () => {
  const wounds = Backstab.memory(), original = { id: 'captain' }, respawn = { id: 'captain' }, owner = {};
  const recall = (target = original) => Backstab.recall(wounds, target, owner, 'boss', 120, time);
  Backstab.remember(wounds, original, owner, settled, time);
  assert.equal(recall(respawn), null);
  Backstab.forget(wounds, original);
  assert.equal(recall(), null);

  for (const invalid of [
    { hp: 120 }, { hp: 0 }, { hp: NaN }, { max: Infinity }, { max: 0 }, { round: -1 }, { round: 1.5 },
  ]) {
    Backstab.remember(wounds, original, owner, settled, time);
    Backstab.remember(wounds, original, owner, { ...settled, ...invalid }, time);
    assert.equal(recall(), null);
  }

  Backstab.remember(wounds, original, owner, settled, time);
  original.dead = true;
  assert.equal(recall(), null);
  original.dead = false;
  assert.equal(recall(), null);
  Backstab.remember(wounds, original, owner, settled, time);
  Backstab.remember(wounds, original, owner, null, time);
  assert.equal(recall(), null);
});
