/* Pure combat rules shared by encounter resolution and its announced intent. */
const BattleRules = (() => {
  const weapon = (n, verb, swings, low, high, extra = {}) => Object.freeze({
    n, verb, swings, dmg: Object.freeze([low, high]), ...extra,
  });
  const WEAPONS = Object.freeze({
    swords: weapon('Sword', 'Strike', 2, 9, 13),
    fencing: weapon('Rapier', 'Lunge', 3, 6, 10),
    archery: weapon('Bow', 'Loose', 2, 7, 11, { opening: 1 }),
    magery: weapon('Spell', 'Cast', 2, 8, 12),
  });

  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const skillValue = value => clamp(finite(value), 0, 120);
  const circleValue = value => clamp(finite(value, 1), 1, 8);

  function health(circle, mult = 1, boss = false) {
    const base = 30 + 6 * circleValue(circle);
    return Math.round(base * Math.max(0, finite(mult, 1)) * (boss ? 1 : 1.6));
  }

  function maneuver(id, tactics = 0) {
    const skill = skillValue(tactics);
    switch (id) {
      case 'feint':
        return { stamina: 8, accuracy: 8 + Math.min(12, skill / 10), power: 1, incomingAccuracy: -15 };
      case 'cleave':
        return { stamina: 8, accuracy: 0, power: 1.35 + Math.min(.15, skill * .0015), incomingAccuracy: 10 };
      default:
        return { stamina: 0, accuracy: 0, power: 1, incomingAccuracy: 0 };
    }
  }

  function enemyHit(skill, difficulty, modifier = 0) {
    const diff = clamp(finite(difficulty), 0, 100);
    const adjustment = clamp(finite(modifier), -120, 120);
    return clamp(Math.round(50 + (diff - skillValue(skill)) * .65 + adjustment), 35, 85);
  }

  const ward = inscription => clamp(.5 + skillValue(inscription) * .002, .5, .7);

  function guard({ shield = false, parrying = 0, tactics = 0 } = {}) {
    const skill = skillValue(shield ? parrying : tactics);
    return { physical: .5 + Math.min(.15, skill * .0015), magic: .2 };
  }

  function study(skill) {
    const value = skillValue(skill);
    return { accuracy: 15 + Math.min(10, value * .1), power: 1.4 + Math.min(.2, value * .002) };
  }

  const attack = { id: 'attack', label: 'Attack', detail: 'The foe will attack twice.' };
  const brace = { id: 'brace', label: 'Brace & strike', detail: 'The foe braces against physical hits and strikes twice.', physicalArmor: .8 };
  const strike = { id: 'strike', label: 'Strike', detail: 'The foe will strike twice.' };
  const heavyStrike = { id: 'heavy-strike', label: 'Heavy strike', detail: 'The foe will strike twice with extra force.', damage: 1.3 };
  const volley = { id: 'spell-volley', label: 'Spell volley', detail: 'The foe will cast three spells.', swings: 3, magic: true };
  const siphon = { id: 'siphon', label: 'Siphon', detail: 'The foe will cast twice and drain your mana on a hit.', damage: .8, magic: true };
  const windUp = { id: 'wind-up', label: 'Wind-up', detail: 'The foe prepares its crushing blow for the next exchange.', swings: 0 };
  const crushingBlow = { id: 'crushing-blow', label: 'Crushing blow', detail: 'The foe will strike twice, harder and with better aim.', damage: 1.7, accuracy: 15 };
  const swipe = { id: 'swipe', label: 'Swipe', detail: 'The foe will swipe twice.' };
  const bossAttack = { ...attack, detail: 'The Examiner will attack twice with better aim.', accuracy: 8 };
  const heavyBlow = { id: 'heavy-blow', label: 'Heavy blow', detail: 'The Examiner will attack three times with extra force and better aim.', swings: 3, damage: 1.35, accuracy: 5 };
  const guardedStrike = { id: 'guarded-strike', label: 'Guarded strike', detail: 'The Examiner guards against physical hits and attacks twice.', physicalArmor: .7 };

  const cycles = new Map([
    ['armored', [brace, strike, heavyStrike]],
    ['caster', [volley, siphon, volley]],
    ['brute', [windUp, crushingBlow, swipe]],
  ]);
  const bossCycle = [bossAttack, heavyBlow, guardedStrike];

  function intent({ role = 'fighter', boss = false, magic = false, circle = 1 } = {}, round = 0) {
    const cycle = boss ? bossCycle : cycles.get(role);
    const phase = Math.max(0, Math.floor(finite(round)));
    const action = cycle ? cycle[phase % cycle.length] : attack;
    return Object.freeze({
      swings: 2,
      damage: 1,
      accuracy: 0,
      physicalArmor: 1,
      manaDrain: action === siphon ? 3 + circleValue(circle) : 0,
      magic: Boolean(magic),
      ...action,
    });
  }

  return Object.freeze({ WEAPONS, health, maneuver, enemyHit, ward, guard, study, intent });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BattleRules;
