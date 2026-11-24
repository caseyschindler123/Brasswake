'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const BattleRules = require('../src/battle_rules');

test('weapon exchanges keep the damage ranges, fencing swing advantage and archery opening', () => {
  assert.deepEqual(BattleRules.WEAPONS, {
    swords: { n: 'Sword', verb: 'Strike', swings: 2, dmg: [9, 13] },
    fencing: { n: 'Rapier', verb: 'Lunge', swings: 3, dmg: [6, 10] },
    archery: { n: 'Bow', verb: 'Loose', swings: 2, dmg: [7, 11], opening: 1 },
    magery: { n: 'Spell', verb: 'Cast', swings: 2, dmg: [8, 12] },
  });
});

test('ordinary health scales the full role template and Examiner health keeps its base', () => {
  assert.equal(BattleRules.health(1), 58);
  assert.equal(BattleRules.health(8), 125);
  assert.equal(BattleRules.health(4, 1.35), 117);
  assert.equal(BattleRules.health(8, 2.4), 300);
  assert.equal(BattleRules.health(4, 1, true), 54);
  assert.equal(BattleRules.health(-3), BattleRules.health(1));
  assert.equal(BattleRules.health(100), BattleRules.health(8));
  assert.equal(BattleRules.health(NaN, Infinity), BattleRules.health(1));
});

test('enemy accuracy rewards skill and caps both extreme matchups', () => {
  assert.equal(BattleRules.enemyHit(40, 40), 50);
  assert.equal(BattleRules.enemyHit(40, 50), 57);
  assert.equal(BattleRules.enemyHit(50, 40), 44);
  assert.equal(BattleRules.enemyHit(40, 40, 8), 58);
  assert.equal(BattleRules.enemyHit(120, 8, -15), 35);
  assert.equal(BattleRules.enemyHit(0, 100, 15), 85);
  assert.equal(BattleRules.enemyHit(NaN, Infinity, '5'), 50);
  assert.equal(BattleRules.enemyHit(Number.MAX_VALUE, -Number.MAX_VALUE), 35);
  assert.equal(BattleRules.enemyHit(-Number.MAX_VALUE, Number.MAX_VALUE), 85);
});

test('zero-skill maneuvers have distinct costs, benefits and response risks', () => {
  const strike = BattleRules.maneuver('strike');
  const feint = BattleRules.maneuver('feint');
  const cleave = BattleRules.maneuver('cleave');
  assert.deepEqual(strike, { stamina: 0, accuracy: 0, power: 1, incomingAccuracy: 0 });
  assert.deepEqual(BattleRules.maneuver('unknown', 100), strike);
  assert.deepEqual(feint, { stamina: 8, accuracy: 8, power: 1, incomingAccuracy: -15 });
  assert.deepEqual(cleave, { stamina: 8, accuracy: 0, power: 1.35, incomingAccuracy: 10 });
  assert.equal(BattleRules.enemyHit(35, 35, feint.incomingAccuracy), 35);
  assert.equal(BattleRules.enemyHit(35, 35, cleave.incomingAccuracy), 60);
  assert.equal(BattleRules.maneuver('feint', 120).accuracy, 20);
  assert.equal(BattleRules.maneuver('cleave', 120).power, 1.5);
  assert.deepEqual(BattleRules.maneuver('cleave', NaN), cleave);
});

test('Guard, Ward and Study have immediate effects and bounded skill benefits', () => {
  assert.deepEqual(BattleRules.guard(), { physical: .5, magic: .2 });
  assert.deepEqual(BattleRules.guard({ tactics: 40, parrying: 100 }), { physical: .56, magic: .2 });
  assert.deepEqual(BattleRules.guard({ shield: true, tactics: 40, parrying: 100 }), { physical: .65, magic: .2 });
  assert.equal(BattleRules.ward(0), .5);
  assert.equal(BattleRules.ward(50), .6);
  assert.equal(BattleRules.ward(120), .7);
  assert.deepEqual(BattleRules.study(0), { accuracy: 15, power: 1.4 });
  assert.deepEqual(BattleRules.study(50), { accuracy: 20, power: 1.5 });
  assert.equal(BattleRules.study(120).accuracy, 25);
  assert.ok(Math.abs(BattleRules.study(120).power - 1.6) < Number.EPSILON * 2);
});

test('fighters and skirmishers attack normally, while armored foes only brace in the first phase', () => {
  const ordinary = BattleRules.intent();
  assert.deepEqual(ordinary, {
    id: 'attack', label: 'Attack', detail: 'The foe will attack twice.', swings: 2,
    damage: 1, accuracy: 0, physicalArmor: 1, manaDrain: 0, magic: false,
  });
  for (const role of ['fighter', 'skirmisher', 'unknown', '__proto__']) {
    assert.deepEqual(BattleRules.intent({ role }, 6), ordinary);
  }

  const foe = { role: 'armored' };
  const initial = BattleRules.intent(foe, 0);
  assert.equal(initial.id, 'brace');
  assert.equal(initial.physicalArmor, .8);
  assert.equal(initial.swings, 2);
  assert.equal(BattleRules.intent(foe, 1).id, 'strike');
  assert.equal(BattleRules.intent(foe, 1).physicalArmor, 1);
  assert.equal(BattleRules.intent(foe, 2).damage, 1.3);
  assert.deepEqual(BattleRules.intent(foe, 3), initial);
  assert.deepEqual(BattleRules.intent(foe, -2), initial);
  assert.deepEqual(BattleRules.intent(foe, Infinity), initial);
  assert.deepEqual(BattleRules.intent(foe, 1.9), BattleRules.intent(foe, 1));
});

test('a caster drains mana only during Siphon and the drain grows with Circle', () => {
  const caster = { role: 'caster', circle: 5 };
  const volley = BattleRules.intent(caster, 0);
  const siphon = BattleRules.intent(caster, 1);
  assert.equal(volley.id, 'spell-volley');
  assert.equal(volley.swings, 3);
  assert.equal(volley.magic, true);
  assert.equal(volley.manaDrain, 0);
  assert.equal(siphon.id, 'siphon');
  assert.equal(siphon.swings, 2);
  assert.equal(siphon.damage, .8);
  assert.equal(siphon.magic, true);
  assert.equal(siphon.manaDrain, 8);
  assert.equal(BattleRules.intent({ role: 'caster', circle: -5 }, 1).manaDrain, 4);
  assert.equal(BattleRules.intent({ role: 'caster', circle: 30 }, 1).manaDrain, 11);
  assert.deepEqual(BattleRules.intent(caster, 2), volley);
  assert.deepEqual(BattleRules.intent(caster, 4), siphon);
});

test('brutes announce a response-free wind-up before their crushing blow', () => {
  const foe = { role: 'brute' };
  const windUp = BattleRules.intent(foe, 0);
  assert.equal(windUp.id, 'wind-up');
  assert.equal(windUp.swings, 0);
  const heavy = BattleRules.intent(foe, 1);
  assert.equal(heavy.id, 'crushing-blow');
  assert.equal(heavy.swings, 2);
  assert.equal(heavy.damage, 1.7);
  assert.equal(BattleRules.enemyHit(35, 35, heavy.accuracy), 65);
  assert.equal(BattleRules.intent(foe, 2).id, 'swipe');
  assert.equal(BattleRules.intent(foe, 2).damage, 1);
  assert.deepEqual(BattleRules.intent(foe, 3), windUp);
});

test('Examiner phases override roles, preserve authored magic and leave inputs and results intact', () => {
  const examiner = Object.freeze({ role: 'caster', boss: true, magic: false, circle: 8 });
  const attack = BattleRules.intent(examiner);
  assert.equal(attack.id, 'attack');
  assert.equal(attack.accuracy, 8);
  assert.equal(attack.magic, false);
  const heavy = BattleRules.intent(examiner, 1);
  assert.equal(heavy.id, 'heavy-blow');
  assert.equal(heavy.swings, 3);
  assert.equal(heavy.damage, 1.35);
  assert.equal(heavy.accuracy, 5);
  assert.equal(heavy.manaDrain, 0);
  const guarded = BattleRules.intent({ ...examiner, magic: true }, 2);
  assert.equal(guarded.id, 'guarded-strike');
  assert.equal(guarded.physicalArmor, .7);
  assert.equal(guarded.magic, true);
  assert.throws(() => { guarded.swings = 5; }, TypeError);
  assert.throws(() => { BattleRules.WEAPONS.swords.dmg[0] = 1; }, TypeError);
  assert.deepEqual(BattleRules.intent(examiner, 3), attack);
});
