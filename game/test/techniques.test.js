const assert = require('node:assert/strict');
const { test } = require('node:test');
const Techniques = require('../src/techniques.js');

test('defines four full disciplines and eight dojo lessons without another mastery rank', () => {
  assert.equal(Techniques.catalog.length, 40);
  assert.equal(new Set(Techniques.catalog.map(def => def.id)).size, 40);
  for (const discipline of ['swords', 'fencing', 'archery', 'magery']) {
    const defs = Techniques.catalog.filter(def => def.discipline === discipline);
    const ordinary = defs.filter(def => !def.rare);
    assert.deepEqual(ordinary.map(def => def.requirement), [50, 60, 70, 80, 90, 92, 95, 98, 100]);
    assert.deepEqual(ordinary.map(def => def.source.dojo), [1, 2, 3, 4, 5, 6, 7, 8, 8]);
    assert.ok(ordinary.every(def => def.sqlOffset === 1 && def.source.type === 'dojo'));
    const rare = defs.filter(def => def.rare);
    assert.equal(rare.length, 1);
    assert.equal(rare[0].requirement, 95);
    assert.equal(rare[0].sqlOffset, 2);
    assert.equal(rare[0].source.type, 'drop');
    assert.ok(new Set(defs.map(def => def.effect)).size >= 6);
    const basic = Techniques.basic(discipline);
    assert.equal(Techniques.get(basic.id), basic);
    assert.equal(basic.sqlOffset, 0);
    assert.equal(basic.power, 1);
  }
  assert.equal(Techniques.basic('magery').name, 'Spark');
  assert.equal(Techniques.basic('magery').mana, 3);
  assert.equal(Techniques.basic('constructor'), null);
});

test('converts ordinary and rare legacy combat pages to ordinary knowledge in each character', () => {
  const pages = { a1: 1, a4r: 1, s3r: 1, s8: 1, a3: 0, c7: 1, h5r: 1 };
  const a = { pages: { ...pages } };
  const b = {};
  const expected = ['a1', 'a4r', 's3r', 's8'].flatMap(Techniques.legacyIds).sort();
  assert.equal(Techniques.legacyIds('a1').length, 3);
  assert.equal(Techniques.legacyIds('s8r').length, 2);
  assert.deepEqual(Techniques.legacyIds('h5r'), []);
  assert.deepEqual(Object.keys(Techniques.normalize(a).learned).sort(), expected);
  assert.ok(expected.every(id => !Techniques.get(id).rare));
  assert.deepEqual(a.pages, pages);
  assert.deepEqual(Techniques.normalize(b).learned, {});
  assert.deepEqual(Techniques.normalize(a), Techniques.normalize(a));
});

test('dojo victories grant all four disciplines regardless of current skills without granting a rare', () => {
  const s = { sk: {} };
  assert.deepEqual(Techniques.teach(s, 0), []);
  assert.equal(Techniques.teach(s, 1).length, 4);
  const finals = Techniques.teach(s, 8);
  assert.equal(finals.length, 8);
  assert.deepEqual([...new Set(finals.map(id => Techniques.get(id).requirement))], [98, 100]);
  assert.deepEqual(Techniques.teach(s, 8), []);
  assert.equal(s.techniques.dojo[1], true);
  assert.equal(s.techniques.dojo[8], true);
  assert.equal(Techniques.eligibility(s, finals[0], { weapon: 'swords' }).ok, false);
  assert.equal(Techniques.learn(s, 'magery.unwrite'), true);
  assert.equal(Techniques.learn(s, 'magery.unwrite'), false);
  assert.equal(Techniques.learn(s, 'basic.magery'), false);
});

test('keeps equipped order across serialization and skill changes and rejects invalid edits', () => {
  const original = { sk: { swords: 50, magery: 50 }, mana: 0, stamina: 0 };
  Techniques.teach(original, 1);
  const sword = 'swords.cross-cut';
  const spell = 'magery.frost-dart';
  assert.match(Techniques.equip(original, sword, 3, { weapon: 'fencing' }).reason, /Equip a sword/);
  assert.match(Techniques.equip(original, sword, 3, { weapon: 'swords', combat: true }).reason, /safety/);
  assert.equal(Techniques.equip(original, sword, 4, { weapon: 'swords' }).ok, false);
  assert.equal(Techniques.equip(original, 'basic.magery', 0).ok, false);
  assert.equal(Techniques.equip(original, sword, 3, { weapon: 'swords' }).ok, true);
  assert.equal(Techniques.equip(original, spell, 0, { weapon: 'swords' }).ok, true);
  assert.match(Techniques.equip(original, spell, 1).reason, /already equipped/);
  original.techniques.supply = 'draught';
  const s = JSON.parse(JSON.stringify(original));
  s.sk.magery = 49.9;
  Techniques.normalize(s);
  assert.deepEqual(s.techniques.equipped, [spell, null, null, sword]);
  assert.equal(s.techniques.supply, 'draught');
  assert.match(Techniques.eligibility(s, spell).reason, /Requires 50 Magery/);
  assert.equal(s.techniques.learned[spell], true);
  assert.equal(Techniques.equip(s, null, 3, { combat: true }).ok, false);
  assert.equal(Techniques.equip(s, null, 3).ok, true);
  assert.deepEqual(s.techniques.equipped, [spell, null, null, null]);
});

test('keeps Hide in an optional shortcut while preserving other Technique positions', () => {
  const sword = 'swords.cross-cut';
  const character = {sk:{swords:70}};
  Techniques.teach(character,1);
  assert.equal(Techniques.equip(character,sword,1,{weapon:'swords'}).ok,true);
  assert.equal(Techniques.equip(character,'hide',0).ok,true);
  const restored = JSON.parse(JSON.stringify(character));
  Techniques.normalize(restored);
  assert.deepEqual(restored.techniques.equipped,[null,sword,null,null]);
  assert.equal(Techniques.hideSlot(restored),0);
  assert.equal(Techniques.equip(restored,'hide',2,{combat:true}).ok,false);
  assert.equal(Techniques.equip(restored,'hide',2).ok,true);
  assert.equal(Techniques.hideSlot(restored),2);
  assert.equal(Techniques.equip(restored,null,2).ok,true);
  assert.equal(Techniques.hideSlot(restored),null);
});

test('normalizes malformed slots without moving valid entries or marking unknown IDs learned', () => {
  const frost = 'magery.frost-dart';
  const s = { techniques: { learned: { [frost]: true, fake: true },
    equipped: ['fake', frost, frost, 'basic.magery', frost], supply: 'unknown' } };
  assert.deepEqual(Techniques.normalize(s), { v: 1, legacyMigrated: true, learned: { [frost]: true },
    equipped: [null, frost, null, null], dojo: {}, supply: 'bandage' });
  s.techniques.equipped = { 0: frost };
  assert.deepEqual(Techniques.normalize(s).equipped, [null, null, null, null]);
});

test('checks action resources at use and accepts a discounted cast without requiring a staff', () => {
  const s = { sk: { magery: 50, swords: 50 }, mana: 3, stamina: 4 };
  const spell = 'magery.frost-dart';
  const sword = 'swords.cross-cut';
  Techniques.teach(s, 1);
  assert.equal(Techniques.eligibility(s, spell).ok, true);
  assert.match(Techniques.eligibility(s, spell, { use: true }).reason, /6 mana/);
  assert.equal(Techniques.eligibility(s, spell, { weapon: 'swords', use: true, manaCost: 3 }).ok, true);
  assert.equal(Techniques.eligibility(s, 'basic.magery', { use: true }).ok, true);
  assert.match(Techniques.eligibility(s, sword, { use: true, weapon: 'swords' }).reason, /7 stamina/);
  assert.match(Techniques.eligibility(s, 'magery.unwrite').reason, /Learn/);
});
