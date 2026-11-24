const assert = require('node:assert/strict');
const { test } = require('node:test');
const P = require('../src/progression');

const hero = (fields = {}) => P.normalize({ path: 'warrior', ...fields });
const capped = { swords: 100, fencing: 100, archery: 100, magery: 100, smith: 100, healing: 100, fishing: 100 };

test('skills use integer tenths at ordinary, expanded and shared caps', () => {
  assert.equal(new Set(P.ids).size, 20);
  for (const id of ['eval', 'meditation', 'inscription', 'resisting', 'tactics', 'anatomy', 'parrying', 'stealth', 'lockpicking']) {
    assert.ok(P.ids.includes(id));
  }
  const s = hero({ sk: { ...capped, swords: 99.8, fencing: 99.9 } });
  assert.equal(P.total(s), 699.7);
  assert.equal(P.change(s, 'swords', .3).after, 100);
  assert.equal(P.change(s, 'archery', 1).after, 100);
  assert.equal(P.change(s, 'lockpicking', .2).after, .1);
  assert.equal(P.total(s), 700);
  assert.equal(P.mode(s, 'swords'), 'up');
  assert.equal(P.change(s, 'lockpicking', .1).after, .1);

  const grandmaster = hero({ sk: { swords: 104.9 }, pcap: { swords: 105, fencing: 101 } });
  assert.equal(P.skillCap(grandmaster, 'fencing'), 100);
  assert.equal(P.change(grandmaster, 'swords', 1).after, 105);
  assert.equal(P.mode(grandmaster, 'swords'), 'up');
  grandmaster.pcap.swords = 110;
  assert.equal(P.change(grandmaster, 'swords', .1).after, 105.1);
});

test('replacement spends room first, then lowers the highest eligible donor until donors run out', () => {
  const s = hero({ sk: { ...capped, fishing: 99, stealth: .3, stealing: .5 }, skillModes: { stealth: 'down', stealing: 'down', fishing: 'lock' } });
  assert.equal(P.total(s), 699.8);
  const raise = P.change(s, 'swords', 1);
  assert.equal(raise.before, raise.after);
  assert.deepEqual(raise.losses, []);

  const partial = P.change(s, 'lockpicking', .3);
  assert.equal(partial.after, .3);
  assert.deepEqual(partial.losses, [{ id: 'stealing', before: .5, after: .4 }]);
  const rest = P.change(s, 'lockpicking', 2);
  assert.equal(rest.after, 1);
  assert.deepEqual(rest.losses, [{ id: 'stealing', before: .4, after: 0 }, { id: 'stealth', before: .3, after: 0 }]);
  assert.equal(P.total(s), 700);
  assert.equal(s.sk.fishing, 99);
  const before = structuredClone(s);
  assert.equal(P.change(s, 'lockpicking', .1).after, 1);
  assert.deepEqual(s, before);
});

test('Raise, Lower and Lock control growth and explicit targets lock on arrival', () => {
  const s = hero({ sk: { fencing: 12.3 } });
  assert.equal(P.setTarget(s, 'fencing', 12.65), true);
  assert.equal(P.target(s, 'fencing'), 12.7);
  for (const mode of ['down', 'lock']) {
    assert.equal(P.setMode(s, 'fencing', mode), true);
    assert.equal(P.change(s, 'fencing', 1).after, 12.3);
  }
  assert.equal(P.setMode(s, 'fencing', 'up'), true);
  assert.equal(P.change(s, 'fencing', 1).after, 12.7);
  assert.equal(P.mode(s, 'fencing'), 'lock');
  assert.equal(P.setMode(s, 'unknown', 'up'), false);
  assert.equal(P.setTarget(s, 'fencing', NaN), false);
});

test('attributes have separate targets, caps, modes and donor floors', () => {
  const s = hero({ attr: { str: 100, dex: 14.9, int: 100 }, attrModes: { dex: 'down', int: 'down' }, sk: { swords: 35 }, skillModes: { swords: 'down' } });
  assert.equal(P.change(s, 'str', 1, true).after, 100);
  assert.equal(P.mode(s, 'str', true), 'up');
  P.setMode(s, 'dex', 'up', true);
  P.setTarget(s, 'dex', 25.2, true);
  assert.deepEqual(P.change(s, 'dex', 30, true), {
    id: 'dex', before: 14.9, after: 25.2, losses: [{ id: 'int', before: 100, after: 99.8 }],
  });
  assert.equal(P.statTotal(s), 225);
  assert.equal(P.mode(s, 'dex', true), 'lock');
  assert.equal(s.sk.swords, 35);

  // A blocked receiver leaves its donor untouched.
  const pinned = hero({ attr: { str: 100, dex: 100, int: 25 }, attrModes: { int: 'down' } });
  assert.equal(P.change(pinned, 'dex', 20, true).after, 100);
  assert.equal(pinned.attr.int, 25);
  const limits = hero({ attr: { str: -1, dex: 120, int: 50.04 } });
  assert.deepEqual(limits.attr, { str: 10, dex: 100, int: 50 });
  assert.equal(P.setTarget(limits, 'str', 5, true), true);
  assert.equal(P.target(limits, 'str', true), 10);
});

test('an attribute donation immediately clamps the resource that lost capacity', () => {
  for (const [donor, receiver, resource, expected] of [
    ['str', 'dex', 'hp', 75], ['dex', 'int', 'stamina', 75], ['int', 'str', 'mana', 70],
  ]) {
    const s = hero({ attr: { str: 60, dex: 85, int: 80 }, attrModes: { [donor]: 'down' } });
    assert.equal(P.statTotal(s), 225);
    const before = s[resource];
    const transaction = P.change(s, receiver, 10, true);
    assert.equal(transaction.losses[0].id, donor);
    assert.equal(P.statTotal(s), 225);
    assert.ok(expected < before);
    assert.equal(s[resource], expected);
  }
});

test('dojo quotes a partial batch and charges nothing for blocked skills', () => {
  const s = hero({ sk: { ...capped, fishing: 79.2, lockpicking: 19.8 }, gold: 200 });
  assert.equal(P.total(s), 699);
  const quote = P.training(s, 'lockpicking', 5);
  assert.deepEqual(quote, { cost: 39, to: 20, add: .2 });
  assert.equal(s.gold, 200);
  assert.equal(s.sk.lockpicking, 19.8);
  assert.equal(P.change(s, 'lockpicking', quote.add).after, quote.to);

  P.setMode(s, 'lockpicking', 'lock');
  assert.deepEqual(P.training(s, 'lockpicking', 5), { cost: 0, to: 20, add: 0 });
  assert.deepEqual(P.training(s, 'swords', 5), { cost: 0, to: 100, add: 0 });
  const full = hero({ sk: { ...capped, fishing: 80, lockpicking: 20 } });
  assert.deepEqual(P.training(full, 'lockpicking', 5), { cost: 0, to: 20, add: 0 });
  P.setMode(full, 'fishing', 'down');
  assert.deepEqual(P.training(full, 'lockpicking', 1), { cost: 40, to: 21, add: 1 });
  assert.deepEqual(P.change(full, 'lockpicking', 1).losses, [{ id: 'fishing', before: 80, after: 79 }]);

  const tenths = hero({ sk: { ...capped, fishing: 79.8, lockpicking: 20 } });
  assert.equal(P.available(tenths, 'lockpicking'), .2);
  assert.deepEqual(P.training(tenths, 'lockpicking', 5), { cost: 0, to: 20, add: 0 });
});

test('only a realized skill increment takes donor points, and study, rest and learning increase gains', () => {
  const s = hero({ sk: { ...capped, swords: 99.9, lockpicking: 100, fishing: .1 }, pcap: { lockpicking: 105 }, skillModes: { fishing: 'down' } });
  const before = structuredClone(s);
  assert.equal(P.gain(s, 'lockpicking', 100, 0, { attributes: false }), null);
  assert.equal(P.gain(s, 'lockpicking', 100, 1, { attributes: false, random: () => .99 }), null);
  assert.deepEqual(s, before);
  assert.deepEqual(P.gain(s, 'lockpicking', 100, 1, { attributes: false, random: () => 0 }), {
    id: 'lockpicking', before: 100, after: 100.1, losses: [{ id: 'fishing', before: .1, after: 0 }],
  });

  const use = modifiers => {
    const trainee = hero({ sk: { swords: 20 } });
    return P.gain(trainee, 'swords', 20, 1, { random: () => .5, attributes: false, ...modifiers }).after;
  };
  assert.equal(use({}), 23.8);
  assert.ok(use({ study: true }) > use({}));
  assert.ok(use({ rest: true }) > use({}));
  assert.ok(use({ learn: 20 }) > use({}));
  assert.ok(use({ study: true, rest: true, learn: 20 }) > use({ study: true }));
});

test('on-use attribute development continues at the shared or individual skill cap', () => {
  const full = hero({ sk: { ...capped, swords: 99, tactics: 1 } });
  assert.equal(P.gain(full, 'swords', 90, 1, { random: () => 0 }).capped, true);
  assert.equal(full.sk.swords, 99);
  assert.equal(full.attr.str, 60.2);

  const master = hero({ path: 'mage', sk: { magery: 100 }, attrModes: { int: 'lock' } });
  assert.equal(P.gain(master, 'magery', 100, 1, { random: () => 0 }).capped, true);
  assert.deepEqual(master.attr, { str: 25.2, dex: 35, int: 60 });
  assert.equal(P.mode(master, 'magery'), 'up');
  const before = structuredClone(master);
  assert.equal(P.gain(master, 'magery', 100, 0, { random: () => 0 }), null);
  assert.deepEqual(master, before);
});

test('all occupied account slots normalize without changing learned SQL or possessions', () => {
  const legacy = (path, gold) => ({
    v: 6, path, gold, sk: { swords: 47.3 }, skills: { select: { v: 40.2, t: 1234, n: 12 } },
    seen: { firstManifest: true }, done: { firstLesson: true }, inv: [{ id: 'w1' }], eq: { weapon: 'w1' },
    bank: { gold: 8, items: [{ id: 'w2' }] }, pcap: { swords: 105 }, pscr: [{ id: 'swords', cap: 110 }],
    dungeons: { 1: { keeper: true } },
  });
  const slots = [legacy('warrior', 42), null, legacy('thief', 80), legacy('crafter', 114), legacy('mage', 91)];
  slots[2].bandages = 0;
  const account = { v: 7, cur: 2, slots, cmds: { SELECT: 2 }, homes: [{ id: 'h1', chest: [{ id: 'w3' }] }] };
  const before = structuredClone(account);
  const swords = slots[0].inv;
  assert.equal(P.normalizeAccount(account), account);
  assert.equal(account.slots.length, 5);
  for (const [i, slot] of account.slots.entries()) {
    if (!slot) {
      assert.equal(i, 1);
      continue;
    }
    assert.deepEqual(slot.attr, Object.fromEntries(P.stats.map((id, j) => [id, P.presets[slot.path][j]])));
    assert.equal(slot.mana, P.maxMana(slot));
    assert.equal(slot.stamina, P.maxStamina(slot));
    assert.equal(slot.progression, 1);
    assert.equal(slot.bandages, i === 2 ? 0 : 4);
    for (const [key, old] of Object.entries(before.slots[i])) assert.deepEqual(slot[key], old, `slot ${i} ${key}`);
  }
  assert.equal(account.slots[0].inv, swords);
  assert.deepEqual(account.cmds, before.cmds);
  assert.deepEqual(account.homes, before.homes);
});

test('over-cap saves normalize once to stable capped values', () => {
  const s = hero({ sk: { ...capped, stealth: .04, magery: 150, stealing: 100, unknown: 100 }, attr: { str: 100, dex: 100, int: 100 }, hp: 999, mana: 999, stamina: -50 });
  assert.equal(P.total(s), 700);
  assert.equal(P.statTotal(s), 225);
  assert.equal(s.sk.unknown, undefined);
  assert.equal(s.hp, P.maxHp(s));
  assert.equal(s.mana, P.maxMana(s));
  assert.equal(s.stamina, 0);
  const once = structuredClone(s);
  assert.deepEqual(P.normalize(s), once);
});

test('combat support and recovered resources respond to their associated attributes and skills', () => {
  const base = hero({ attr: { str: 40, dex: 30, int: 40 }, mana: 0, stamina: 0 });
  const warrior = hero({ attr: { str: 80, dex: 70, int: 40 }, sk: { tactics: 70, anatomy: 70, parrying: 70, healing: 70 } });
  const mage = hero({ attr: { str: 40, dex: 30, int: 90 }, sk: { eval: 70, meditation: 70, resisting: 70 }, mana: 0, stamina: 0 });
  const untrainedWarrior = hero({ attr: warrior.attr });
  assert.ok(P.physicalFactor(untrainedWarrior) > P.physicalFactor(base));
  assert.ok(P.physicalFactor(warrior) > P.physicalFactor(untrainedWarrior));
  assert.ok(P.bandage(warrior) > P.bandage(base));
  assert.ok(P.parryChance(warrior) > P.parryChance(base));
  assert.equal(P.maxHp(warrior), 90);
  assert.equal(P.maxStamina(warrior), 70);
  assert.equal(P.maxMana(mage), 90);
  assert.ok(P.spellFactor(mage) > P.spellFactor(base));
  assert.ok(P.resistFactor(mage) < P.resistFactor(base));
  assert.ok(P.recover(mage) > P.recover(base));
  assert.equal(mage.stamina, 12);
  mage.mana = 89;
  mage.stamina = 28;
  assert.equal(P.recover(mage), 1);
  assert.equal(mage.mana, 90);
  assert.equal(mage.stamina, 30);
  assert.equal(P.castCost(1), 5);
  assert.equal(P.castCost(8), 19);
});
