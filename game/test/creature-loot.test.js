const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.World = require('../src/world');
const Content = require('../src/quests'), Dungeons = require('../src/dungeons');
const Loot = require('../src/creature_loot');
const enemy = (tpl, extra = {}) => ({ inst: { tpl, ...extra } });
const rich = () => ({ gold: 500, mats: { 4: 3 }, items: [{ name: 'Sword' }], scrolls: ['a4r'], sigils: 1, bless: 1, gscr: 1, pscr: [{}], runes: 1 });

test('every current surface, lair and dungeon species has an explicit loot profile', () => {
  for (const id of new Set([...Object.keys(Content.MONSTERS), ...Object.keys(Content.LAIRMON), ...Object.keys(Dungeons.species)])) {
    assert.ok(Object.hasOwn(Loot.profiles, id), 'Missing loot profile for ' + id);
  }
});
test('animals never gain carried rewards, including gilded wolves and lair leaders', () => {
  for (const [id, kind] of Object.entries(Loot.profiles)) {
    if (!['meat', 'hide', 'game', 'none'].includes(kind)) continue;
    const e = enemy(id, { elite: true, lead: 1 });
    const out = Loot.filter(rich(), e, () => 0);
    assert.equal(Loot.carries(e), false, id);
    assert.equal(out.gold, 0, id); assert.deepEqual(out.items, [], id);
    assert.deepEqual(out.scrolls, [], id); assert.deepEqual(out.mats, {}, id);
    for (const key of ['sigils','bless','gscr','pscr','runes']) assert.equal(out[key], undefined, id);
  }
  assert.deepEqual(Loot.filter(rich(), enemy('b102'), () => .9), { gold:0, mats:{}, items:[], scrolls:[], meat:1 });
  assert.equal(Loot.filter(rich(), enemy('b403'), () => .9).hide, 1);
  assert.equal(Loot.filter(rich(), enemy('l24', { elite:true }), () => .9).hide, 3);
});
test('wildlife harvest matches its advertised meat, hide or empty drop', () => {
  for (const [id, [name, description]] of Object.entries(Content.MONSTERS)) {
    if (!id.startsWith('a')) continue;
    const out = Loot.filter(rich(), enemy(id), () => .9);
    assert.equal(!!out.meat, /Drops meat/.test(description), name);
    assert.equal(!!out.hide, /(?:Drops|and) a hide/.test(description), name);
  }
});
test('actual dungeon species and lair appearance take precedence over borrowed SQL templates', () => {
  const rat = { species:'d11', inst:{ tpl:'b101' } };
  const smuggler = { species:'l04', inst:{ tpl:'b102' } };
  assert.equal(Loot.profile(rat), 'hide'); assert.equal(Loot.carries(smuggler), true);
  assert.equal(Loot.profile(enemy('b104', { lk:'l10' })), 'none');
  assert.equal(Loot.profile({ species:'k4', inst:{tpl:'b403'} }), 'game');
  assert.equal(Loot.profile({ species:'k8', inst:{tpl:'b803'} }), 'material');
});
test('constructs yield material, carriers keep their rewards, unknown creatures fail closed', () => {
  assert.deepEqual(Loot.filter(rich(), enemy('b501')), {gold:0,mats:{4:3},items:[],scrolls:[]});
  const loot = rich(); assert.equal(Loot.filter(loot, enemy('b401')), loot);
  assert.deepEqual(Loot.filter(rich(), enemy('future')), {gold:0,mats:{},items:[],scrolls:[]});
});
test('every Circle retains an eligible source for its rare Arms page', () => {
  for (let r=1;r<=8;r++) {
    const surface = Content.BOUNTIES.some(b => b.r === r && Loot.carries(enemy(b.id)));
    const dungeon = Dungeons.get(r).floors.some((_, f) => Dungeons.build(r,f).entities.some(e => e.lieutenant && Loot.carries(e)));
    assert.ok(surface || dungeon, 'No carrier can drop the rare Arms page for Circle ' + r);
  }
});
