const test = require('node:test');
const assert = require('node:assert/strict');
const Gear = require('../src/equipment_rules');
const Battle = require('../src/battle_rules');

const sword = {
  id: 'sword-1', slot: 'weapon', rarity: 'rare', tier: 8,
  name: 'Superior Silvered Greatsword', w: 'swords', v: 2, ic: 'hq28', stats: { dmg: 18 },
};
const armor = {
  id: 'armor-1', slot: 'armor', rarity: 'uncommon', tier: 4,
  name: 'Fine Chain Shirt', ic: 'armor_2', stats: { def: 10, deft: 4 },
};
const purse = { circle: 8, gold: 3000, mats: { 1: 20, 3: 20, 4: 20, 6: 20, 8: 20, sigil: 20 } };

function sequence(...values) {
  let i = 0;
  return () => {
    assert.ok(i < values.length, 'unexpected random draw');
    return values[i++];
  };
}

test('material palettes and rank are independent of rarity and limited by danger', () => {
  const edge = () => 1;
  const common = Gear.decorate({ ...sword, rarity: 'common' }, { source: 'shop', random: edge });
  const rare = Gear.decorate(sword, { source: 'shop', random: edge });
  assert.equal(common.equipment.material, rare.equipment.material);
  assert.equal(common.rarity, 'rare');
  assert.equal(common.equipment.baseRarity, 'common');
  assert.equal(Gear.materialOf(rare).id, 'starsteel');
  assert.equal(Gear.materialOf(rare).family, 'metal');
  assert.notDeepEqual(Gear.materialOf(rare).palette, Gear.MATERIALS.iron.palette);
  const beginner = Gear.decorate(sword, { luck: 9999, dangerTier: 1, source: 'shop', random: edge });
  assert.equal(beginner.equipment.material, 'iron');
  assert.equal(beginner.equipment.enchantment, null);
  const starter = Gear.decorate({ ...sword, name: 'Iron Shortsword' }, { source: 'starter', random: sequence() });
  assert.deepEqual(starter.stats, sword.stats);
  assert.equal(starter.equipment.quality, 'standard');
  for (const [example, family] of [
    [{ ...sword, w: 'archery', v: 26, name: 'Ash Longbow' }, 'wood'],
    [{ ...armor, name: 'Leather Jerkin' }, 'leather'],
    [{ ...armor, slot: 'cloak', name: 'Silk Cloak' }, 'cloth'],
  ]) {
    const item = Gear.decorate(example, { source: 'shop', random: edge });
    assert.equal(Gear.materialOf(item).family, family);
  }
});

test('crafting chooses an eligible material and names the actual material and workmanship', () => {
  assert.deepEqual(Gear.eligibleMaterials(sword, 8).map(material => material.id), ['iron', 'steel', 'tempered', 'moonsteel', 'starsteel']);
  assert.deepEqual(Gear.eligibleMaterials(sword, 3).map(material => material.id), ['iron', 'steel']);
  for (const name of ['Travelling Robe', 'Cloth Tunic']) {
    assert.deepEqual(Gear.eligibleMaterials({ ...armor, name }, 8).map(material => material.id), ['wool', 'linen', 'silk', 'brocade', 'quilted']);
  }
  const craft = { source: 'craft', skill: 120, queryQuality: 1, dangerTier: 4, random: sequence(0), material: 'tempered' };
  const made = Gear.decorate({ ...sword, name: 'Mythic Gilded Iron Staff', w: 'magery', v: 12 }, craft);
  assert.equal(made.name, 'Masterwork Tempered Steel Staff');
  assert.equal(made.equipment.material, 'tempered');
  assert.equal(Gear.applyEnchantment(made, 'focus', purse).item.name, 'Masterwork Tempered Steel Staff of Focus I');
  const outOfRange = Gear.decorate(sword, { ...craft, random: sequence(1, 0), material: 'starsteel' });
  assert.equal(outOfRange.equipment.material, 'tempered');
  const wrongFamily = Gear.decorate(sword, { ...craft, random: sequence(0, 0), material: 'yew' });
  assert.equal(wrongFamily.equipment.material, 'iron');
});

test('luck is bounded and higher magic levels remain locked to danger circles', () => {
  const loot = (dangerTier, luck, rolls) => Gear.decorate(sword, { dangerTier, luck, random: sequence(...rolls) });
  const noLuck = loot(1, 0, [0, 0, .115]);
  const maxLuck = loot(1, Gear.MAX_LUCK, [0, 0, .115, 0, 1]);
  const excessLuck = loot(1, 1e6, [0, 0, .115, 0, 1]);
  assert.equal(noLuck.equipment.enchantment, null);
  assert.deepEqual(maxLuck, excessLuck);
  assert.deepEqual(maxLuck.equipment.enchantment, { id: 'power', level: 1 });
  const levels = Array.from({ length: 8 }, (_, i) => loot(i + 1, 60, [1, 0, 0, 0, 1]).equipment.enchantment.level);
  assert.deepEqual(levels, [1, 1, 2, 3, 3, 4, 4, 5]);
});

test('successful craft rolls independently and applies workmanship to the physical base only', () => {
  const craft = (queryQuality, skill, roll) => Gear.craftingQuality({ skill, difficulty: 30, queryQuality }, () => roll);
  assert.equal(craft(0, 120, 0), 'standard');
  assert.equal(craft(.4, 120, 0), 'fine');
  assert.equal(craft(.6, 120, 0), 'exceptional');
  assert.equal(craft(1, 120, 0), 'masterwork');
  assert.equal(craft(1, 120, .99), 'standard');
  const made = Gear.decorate(armor, { source: 'craft', skill: 100, queryQuality: 1, random: sequence(1, 0) });
  assert.equal(made.equipment.quality, 'masterwork');
  assert.equal(made.rarity, 'rare');
  assert.equal(made.equipment.enchantment, null);
  assert.deepEqual(Gear.breakdown(made), {
    base: { def: 10, deft: 4 }, material: { def: 5 }, workmanship: { def: 6 }, legacy: {}, magic: {}, total: { def: 21, deft: 4 },
  });
  const enchanted = Gear.applyEnchantment(made, 'protection', purse).item;
  assert.deepEqual(Gear.breakdown(enchanted).magic, { def: 2 });
  assert.deepEqual(enchanted.stats, { def: 23, deft: 4 });
});

test('legacy equipment save round trips preserve stats and never invent contributions', () => {
  const old = { ...sword, name: 'Exceptional Superior Silvered Greatsword', was: 'weapon', ins: true, stats: { dmg: 27, luck: 6 } };
  const migrated = Gear.migrate(old);
  const loaded = JSON.parse(JSON.stringify(migrated));
  assert.strictEqual(migrated.stats, old.stats);
  assert.deepEqual({ ...loaded, equipment: undefined }, { ...old, equipment: undefined });
  assert.equal(loaded.equipment.quality, 'exceptional');
  assert.equal(Gear.materialOf(loaded).id, 'silver');
  assert.strictEqual(Gear.migrate(loaded), loaded);
  assert.deepEqual(Gear.breakdown(loaded), {
    base: {}, material: {}, workmanship: {}, magic: {}, legacy: old.stats, total: old.stats,
  });
  const enchanted = Gear.applyEnchantment(loaded, 'power', purse).item;
  assert.deepEqual(enchanted.stats, { dmg: 30, luck: 6 });
  assert.deepEqual(Gear.breakdown(enchanted).legacy, old.stats);
  const relic = { id: 'relic', slot: 'relic', unique: true, stats: { xp: 14 } };
  assert.strictEqual(Gear.migrate(relic), relic);
  assert.deepEqual(Gear.breakdown(relic).legacy, relic.stats);
});

test('enchantment validates compatibility, circle, components, funds and stale quotes before charging', () => {
  const initial = Gear.decorate(sword, { source: 'shop', random: () => 0 });
  assert.deepEqual(Gear.availableEnchantments(initial), ['power', 'embers', 'slaying', 'precision']);
  assert.ok(Gear.availableEnchantments({ ...initial, w: 'magery' }).includes('focus'));
  assert.ok(Gear.availableEnchantments(armor).includes('warding'));
  assert.equal(Gear.enchantQuote(initial, 'warding', purse).reason, 'incompatible');
  assert.equal(Gear.enchantQuote(initial, 'power', { ...purse, mats: {} }).reason, 'components');
  const noMoney = Gear.applyEnchantment(initial, 'power', { ...purse, gold: 34 });
  assert.equal(noMoney.reason, 'gold');
  assert.strictEqual(noMoney.item, initial);
  assert.strictEqual(noMoney.mats, purse.mats);
  const first = Gear.applyEnchantment(initial, 'power', { ...purse, level: 1 });
  assert.equal(first.ok, true);
  assert.equal(first.gold, purse.gold - 35);
  assert.deepEqual(first.mats, { ...purse.mats, 1: 18 });
  assert.deepEqual(initial.stats, sword.stats);
  assert.equal(Gear.enchantQuote(first.item, 'power', { ...purse, level: 1 }).reason, 'stale-quote');
  const replacement = Gear.enchantQuote(first.item, 'embers', purse);
  assert.equal(replacement.replacing, true);
  assert.equal(replacement.level, 1);
  assert.deepEqual(replacement.previous, { id: 'power', level: 1 });
  assert.equal(Gear.enchantQuote(first.item, 'power', { ...purse, circle: 2 }).reason, 'circle');
  let step = first;
  for (let level = 2; level <= 5; level++) {
    step = Gear.applyEnchantment(step.item, 'power', { ...step, circle: 8, level });
    assert.equal(step.ok, true);
    assert.equal(step.item.equipment.enchantment.level, level);
    assert.equal(step.item.stats.dmg, sword.stats.dmg + Gear.ENCHANTMENTS.power.values[level - 1]);
  }
  assert.equal(Gear.enchantQuote(step.item, 'power', purse).reason, 'max-level');
  assert.equal(step.mats.sigil, 10);
  assert.equal(Gear.applyEnchantment(step.item, 'embers', { ...purse, level: 1, expectedEnchantment: replacement.previous }).reason, 'stale-quote');
  const replaced = Gear.applyEnchantment(step.item, 'embers', { ...purse, level: 1, expectedEnchantment: step.item.equipment.enchantment });
  assert.deepEqual(replaced.item.stats, { dmg: 18, embers: 4 });
  const other = Gear.applyEnchantment(replaced.item, 'power', { ...purse, level: 1, expectedEnchantment: replaced.item.equipment.enchantment });
  assert.deepEqual(other.item.stats, { dmg: 21 });
});

test('rarity reflects the strongest contribution without changing base stats or legacy rarity', () => {
  const common = Gear.decorate({ ...sword, rarity: 'common' }, { source: 'shop', random: () => 0 });
  assert.equal(common.rarity, 'common');
  const rarities = ['uncommon', 'rare', 'epic', 'legendary', 'legendary'];
  let promoted = common;
  for (let i = 0; i < rarities.length; i++) {
    promoted = Gear.applyEnchantment(promoted, 'power', purse).item;
    assert.equal(promoted.rarity, rarities[i]);
    assert.deepEqual(Gear.breakdown(promoted).base, common.stats);
  }
  const replacement = Gear.applyEnchantment(promoted, 'embers', purse).item;
  assert.equal(replacement.rarity, 'uncommon');
  assert.equal(replacement.equipment.baseRarity, 'common');
  assert.deepEqual(replacement.stats, { dmg: 18, embers: 4 });
  assert.equal(Gear.applyEnchantment(Gear.migrate({ ...armor, rarity: 'epic' }), 'protection', purse).item.rarity, 'epic');
});

test('damage expectation averages the real rounded strike outcomes and times a full exchange', () => {
  const options = {
    weapon: sword, skillId: 'swords', skill: 57.5, damageBonus: 10, accuracy: 73,
    range: Battle.WEAPONS.swords.dmg, swings: 3, pageCircle: 4, targetCircle: 6, queryPower: .6,
    attributeFactor: 1.23, physicalFactor: .64, studyFactor: 1.4, ambushFactor: 1.7, responseSlots: 3,
  };
  const stats = Gear.attack(options);
  const scalar = (1 + .12 * 3) * (1 - .2 * 2) * 1.28 * 1.23 * .64 * 1.4 * 1.7 * .6;
  const rolls = [9, 10, 11, 12, 13];
  const hits = rolls.map(base => Math.max(1, Math.round((base + 57.5 / 8) * scalar)));
  assert.deepEqual(rolls.map(stats.damage), hits);
  assert.equal(stats.accuracy, 73);
  assert.equal(stats.expectedDamage, hits.reduce((a, b) => a + b) / 5 * .73 * 3);
  assert.equal(stats.seconds, (250 + 330 * (3 + 3)) / 1000);
  assert.equal(stats.dps, stats.expectedDamage / stats.seconds);
  const failed = Gear.attack({ ...options, queryPower: 0 });
  assert.equal(failed.damage(13), 0);
  assert.equal(failed.expectedDamage, 0);
  assert.equal(failed.swings, 0);
});

test('elemental damage and precision use the correct skill and target context', () => {
  const options = { weapon: { ...sword, stats: { dmg: 0, embers: 20, slaying: 20, precision: 10 } },
    skillId: 'swords', range: [20, 20], swings: 2, accuracy: 90 };
  const neutral = Gear.attack(options);
  const undead = Gear.attack({ ...options, target: Gear.creatureProfile('Snow Ghost') });
  const fiery = Gear.attack({ ...options, target: Gear.creatureProfile('Slag Golem') });
  const mismatch = Gear.attack({ ...options, skillId: 'magery', target: Gear.creatureProfile('Snow Ghost') });
  assert.equal(neutral.accuracy, 95);
  assert.equal(neutral.damage(20), 24);
  assert.equal(undead.damage(20), 30);
  assert.equal(fiery.damage(20), 22);
  assert.equal(Gear.creatureProfile('The Lich of Kell').slaying, true);
  assert.equal(Gear.creatureProfile('Red Dragon').fireFactor, .5);
  assert.equal(mismatch.accuracy, 90);
  assert.equal(mismatch.damage(20), 20);
  assert.equal(Gear.attack({ ...options, queryPower: 0 }).damage(20), 0);
});

test('armour and focus helpers enforce their combat caps', () => {
  assert.equal(Gear.mitigation(50, 17), 50);
  assert.equal(Gear.mitigation(50, 17, true), 60);
  assert.equal(Gear.mitigation(80), 60);
  assert.equal(Gear.mitigation(-8), 0);
  assert.equal(Gear.castCost(5, 1), 4);
  assert.equal(Gear.castCost(5, 20), 3);
  assert.equal(Gear.castCost(1, 20), 1);
});
