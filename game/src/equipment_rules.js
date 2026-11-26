/* Pure equipment construction, enchanting, and combat comparisons. */
const EquipmentRules = (() => {
  const VERSION = 1;
  const MAX_LUCK = 60;
  const MAX_ARMOR = 60;
  const EXCHANGE_START_MS = 250;
  const EXCHANGE_STEP_MS = 330;
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const circle = value => Math.floor(clamp(finite(value, 1), 1, 8));
  const unit = random => clamp(finite(random()), 0, 1 - Number.EPSILON);

  const material = (family, id, name, tier, bonus, shadow, mid, light, legacyOnly = false) => Object.freeze({
    id, family, name, tier, bonus, legacyOnly, palette: Object.freeze({ shadow, mid, light }),
  });
  const MATERIALS = Object.freeze(Object.fromEntries([
    material('metal', 'iron', 'Iron', 1, 0, '#353840', '#777d86', '#d1d6db'),
    material('metal', 'steel', 'Steel', 3, 3, '#293b4b', '#829eb0', '#dfeef7'),
    material('metal', 'tempered', 'Tempered Steel', 4, 5, '#293649', '#5f8ba4', '#c5e6f7'),
    material('metal', 'moonsteel', 'Moonsteel', 6, 8, '#3b304c', '#9284b4', '#eadfff'),
    material('metal', 'starsteel', 'Starsteel', 8, 11, '#1b3a35', '#66988b', '#b9f0d9'),
    material('metal', 'silver', 'Silvered Steel', 5, 0, '#433d56', '#a69fbd', '#f3f0ff', true),
    material('metal', 'gilded', 'Gilded Steel', 7, 0, '#503a1c', '#bc9047', '#ffdf90', true),
    material('wood', 'ash', 'Ash', 1, 0, '#51422e', '#9b7852', '#dcb887'),
    material('wood', 'yew', 'Yew', 3, 3, '#4d291d', '#a66339', '#dfac69'),
    material('wood', 'walnut', 'Walnut', 4, 5, '#312228', '#78503d', '#ba8363'),
    material('wood', 'blackwood', 'Blackwood', 6, 8, '#211f2a', '#575067', '#a79db3'),
    material('wood', 'ironwood', 'Ironwood', 8, 11, '#49281c', '#98563c', '#d99e69'),
    material('leather', 'hide', 'Tanned Leather', 1, 0, '#542d20', '#995f3e', '#d79b69'),
    material('leather', 'waxed', 'Waxed Leather', 3, 2, '#362523', '#77504a', '#bb8770'),
    material('leather', 'boiled', 'Boiled Leather', 4, 4, '#352427', '#7f4243', '#bd7967'),
    material('leather', 'laminated', 'Laminated Leather', 6, 6, '#222b28', '#556857', '#95a281'),
    material('leather', 'riveted', 'Riveted Leather', 8, 8, '#302a43', '#645472', '#b99db2'),
    material('cloth', 'wool', 'Wool', 1, 0, '#49434a', '#8a8187', '#c7bdbd'),
    material('cloth', 'linen', 'Linen', 3, 1, '#51463a', '#ab9872', '#e8dcb8'),
    material('cloth', 'silk', 'Silk', 4, 3, '#452c4f', '#8b5e9b', '#d1acd4'),
    material('cloth', 'brocade', 'Brocade', 6, 5, '#392940', '#875b75', '#d7b085'),
    material('cloth', 'quilted', 'Quilted Silk', 8, 7, '#1e3543', '#467d8d', '#a4d3d6'),
    material('bone', 'bone', 'Bone', 1, 0, '#574637', '#a89876', '#e5d8b1'),
    material('crystal', 'crystal', 'Crystal', 1, 0, '#373951', '#8d9ac6', '#d9f1f8'),
    material('glass', 'glass', 'Glass', 1, 0, '#263e46', '#6a9d9c', '#c8ece4'),
    material('wood', 'oak', 'Oak', 1, 0, '#493426', '#91613f', '#d19766', true),
  ].map(entry => [entry.id, entry])));
  const QUALITY = Object.freeze(Object.fromEntries([
    ['standard', 'Standard', 0], ['fine', 'Fine', .12],
    ['exceptional', 'Exceptional', .25], ['masterwork', 'Masterwork', .4],
  ].map(([id, name, factor]) => [id, Object.freeze({ id, name, factor })])));
  const enchantment = (name, stat, values, detail) => Object.freeze({ name, stat, values: Object.freeze(values), detail });
  const ENCHANTMENTS = Object.freeze({
    power: enchantment('Power', 'dmg', [3, 6, 10, 14, 19], 'Adds damage to attacks that use this weapon.'),
    embers: enchantment('Embers', 'embers', [4, 8, 12, 17, 23], 'Adds fire damage. Frost creatures take more fire damage and fire creatures take less.'),
    slaying: enchantment('Slaying', 'slaying', [7, 14, 22, 31, 41], 'Adds damage against undead creatures.'),
    focus: enchantment('Focus', 'focus', [1, 2, 3, 4, 5], 'Reduces mana paid for spells by up to half their usual cost.'),
    precision: enchantment('Precision', 'precision', [2, 4, 6, 8, 11], 'Adds percentage points to the chance to hit with this weapon.'),
    protection: enchantment('Protection', 'def', [2, 4, 6, 9, 12], 'Adds defence against physical and magical attacks.'),
    warding: enchantment('Warding', 'warding', [3, 5, 8, 11, 15], 'Adds defence against magical attacks.'),
    vitality: enchantment('Vitality', 'vitality', [3, 5, 8, 12, 17], 'Adds maximum health.'),
    quieting: enchantment('Quieting', 'quieting', [3, 6, 9, 12, 16], 'Adds percentage points to the chance to hide.'),
    endurance: enchantment('Endurance', 'endurance', [3, 5, 8, 12, 17], 'Adds maximum stamina.'),
  });
  const WEAPON_ENCHANTMENTS = Object.freeze(['power', 'embers', 'slaying', 'focus', 'precision']);
  const ARMOR_ENCHANTMENTS = Object.freeze(['protection', 'warding', 'vitality', 'focus', 'quieting', 'endurance']);
  const ARMOR_SLOTS = new Set(['shield', 'head', 'armor', 'hands', 'feet', 'cloak']);
  const LEVELS = Object.freeze(['', 'I', 'II', 'III', 'IV', 'V']);
  const RARITIES = Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary']);
  const ENCHANT_RARITY = [0, 1, 2, 3, 4, 4];
  const ENCHANT_CIRCLES = [1, 3, 4, 6, 8];
  const ENCHANT_GOLD = [35, 90, 180, 360, 700];
  const MAGIC_CHANCE = [.08, .10, .13, .17, .22, .28, .34, .40];
  const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const PHYSICAL = item => item?.slot === 'weapon' || ARMOR_SLOTS.has(item?.slot);

  function getMaterial(id) { return Object.hasOwn(MATERIALS, id) ? MATERIALS[id] : null; }
  function inferredMaterial(item) {
    const name = item.name || '';
    if (item.slot === 'weapon') {
      if (item.v === 10 || /\bCrystal Staff\b/i.test(name)) return MATERIALS.crystal;
      if (item.v === 11 || /\bBone Staff\b/i.test(name)) return MATERIALS.bone;
      if (item.w === 'archery' || (item.w === 'magery' && item.v !== 12 && !/\bIron Staff\b/i.test(name))) {
        if (/\bGilded\b/i.test(name)) return MATERIALS.blackwood;
        if (/\bSilvered\b/i.test(name)) return MATERIALS.walnut;
        if (/\bYew\b/i.test(name)) return MATERIALS.yew;
        return /\bOak\b/i.test(name) ? MATERIALS.oak : MATERIALS.ash;
      }
      if (/\bGilded\b/i.test(name)) return MATERIALS.gilded;
      if (/\bSilver(?:ed)?\b/i.test(name)) return MATERIALS.silver;
      return /\bSteel\b/i.test(name) ? MATERIALS.steel : MATERIALS.iron;
    }
    if (item.off === 23 || /\bGlass Orb\b/i.test(name)) return MATERIALS.glass;
    if (item.off === 24 || /\bSpellbook\b/i.test(name)) return MATERIALS.hide;
    if (item.slot === 'cloak' || /\b(?:Hood|Hat|Cloth|Robe|Tunic)\b/i.test(name)) {
      if (/\bRoyal\b/i.test(name)) return MATERIALS.brocade;
      if (/\bSilk\b/i.test(name)) return MATERIALS.silk;
      return /\bTravelling\b/i.test(name) ? MATERIALS.linen : MATERIALS.wool;
    }
    if (/\b(?:Leather|Jerkin|Gloves|Boots|Cap)\b/i.test(name)) return MATERIALS.hide;
    if (/\bWooden\b/i.test(name)) return MATERIALS.oak;
    if (/\bGilded\b/i.test(name)) return MATERIALS.gilded;
    if (/\bSilver\b/i.test(name)) return MATERIALS.silver;
    return /\b(?:Steel|Plate)\b/i.test(name) ? MATERIALS.steel : MATERIALS.iron;
  }

  function materialOf(item) {
    return PHYSICAL(item) ? getMaterial(item.equipment?.material) || inferredMaterial(item) : null;
  }

  function availableEnchantments(item) {
    if (!PHYSICAL(item)) return [];
    if (item.slot !== 'weapon') return ARMOR_ENCHANTMENTS;
    return item.w === 'magery' ? WEAPON_ENCHANTMENTS : WEAPON_ENCHANTMENTS.filter(id => id !== 'focus');
  }

  function currentEnchantment(item) {
    const enchantment = item?.equipment?.enchantment;
    if (!enchantment || !availableEnchantments(item).includes(enchantment.id) ||
        !Number.isInteger(enchantment.level) || enchantment.level < 1 || enchantment.level > 5) return null;
    return enchantment;
  }

  function weighted(entries, random) {
    let roll = unit(random) * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of entries) {
      if (roll < weight) return value;
      roll -= weight;
    }
    return entries[entries.length - 1][0];
  }

  function eligibleMaterials(item, danger = item?.tier) {
    const original = materialOf(item);
    if (!original) return [];
    const max = circle(danger);
    return Object.values(MATERIALS).filter(entry => entry.family === original.family && entry.tier <= max && !entry.legacyOnly);
  }

  function rollMaterial(item, danger, luck, random, selected) {
    const options = eligibleMaterials(item, danger);
    return options.find(entry => entry.id === selected) || weighted(options.map(entry => [entry, entry.tier === 1 ? 68 :
      (18 - 2 * (entry.tier - 3)) * (1 + luck / MAX_LUCK) * (1 + (danger - entry.tier) * .15)]), random);
  }

  function craftingQuality({ skill = 0, queryQuality = 1, difficulty = 0, rarePage = false } = {}, random = Math.random) {
    const answer = clamp(finite(queryQuality), 0, 1);
    const ability = clamp(finite(skill), 0, 120);
    const headroom = clamp((ability - finite(difficulty) + 45) / 90, 0, 1);
    const proficiency = answer * (.28 + ability / 240 + .15 * headroom + (rarePage ? .08 : 0));
    const roll = unit(random);
    if (answer === 1 && ability >= 70 && roll < .18 * proficiency) return 'masterwork';
    if (answer >= .6 && roll < .46 * proficiency) return 'exceptional';
    return roll < proficiency ? 'fine' : 'standard';
  }

  function rollEnchantment(item, danger, luck, random) {
    const chance = MAGIC_CHANCE[danger - 1] * (1 + luck / (2 * MAX_LUCK));
    if (unit(random) >= chance) return null;
    const options = availableEnchantments(item);
    const id = options[Math.floor(unit(random) * options.length)];
    const levels = ENCHANT_CIRCLES.flatMap((min, i) => min <= danger ? [[i + 1, 3 ** (4 - i)]] : []);
    const level = weighted(levels.map(([value, weight]) => [value, value === 1 ? weight : weight * (1 + luck / MAX_LUCK)]), random);
    return { id, level };
  }

  function statsOf(stats) {
    return Object.fromEntries(Object.entries(stats || {}).filter(([key, value]) => !RESERVED_KEYS.has(key) && Number.isFinite(value)));
  }

  function migrate(item) {
    if (!PHYSICAL(item) || item.equipment?.v === VERSION) return item;
    return {
      ...item,
      equipment: {
        v: VERSION, material: inferredMaterial(item).id,
        quality: /^Exceptional\b/i.test(item.name || '') ? 'exceptional' : 'standard',
        base: {}, baseRarity: item.rarity, enchantment: null, legacy: statsOf(item.stats),
      },
    };
  }

  function breakdown(item) {
    const state = item?.equipment;
    if (state?.v !== VERSION) {
      const legacy = statsOf(item?.stats);
      return { base: {}, material: {}, workmanship: {}, magic: {}, legacy, total: { ...legacy } };
    }
    const magicEntry = currentEnchantment(item);
    const base = statsOf(state.base);
    const legacy = statsOf(state.legacy);
    const key = item.slot === 'weapon' ? 'dmg' : 'def';
    const materialBonus = Object.hasOwn(base, key) ? materialOf(item)?.bonus || 0 : 0;
    const quality = Object.hasOwn(QUALITY, state.quality) ? QUALITY[state.quality] : QUALITY.standard;
    const finish = Math.ceil(((base[key] || 0) + materialBonus) * quality.factor);
    const material = materialBonus ? { [key]: materialBonus } : {};
    const workmanship = finish ? { [key]: finish } : {};
    const chosen = magicEntry ? ENCHANTMENTS[magicEntry.id] : null;
    const effect = chosen && chosen.values[magicEntry.level - 1];
    const magic = effect ? { [chosen.stat]: effect } : {};
    const total = {};
    for (const group of [base, material, workmanship, legacy, magic]) {
      for (const [stat, value] of Object.entries(group)) total[stat] = (total[stat] || 0) + value;
    }
    return { base, material, workmanship, magic, legacy, total };
  }

  function shapeName(value) {
    return value.replace(/^(?:(?:Fine|Superior|Exquisite|Mythic|(?:Tempered|Silvered|Gilded) Steel|Waxed Leather|Boiled Leather|Laminated Leather|Riveted Leather|Quilted Silk|Iron|Steel|Silvered|Silver|Gilded|Oak|Ash|Yew|Carved|Runed|Wooden|Leather|Cloth|Wool|Travelling|Silk|Royal|Glass|Crystal|Bone)\s+)+/i, '');
  }

  function name(item, baseName = item?.equipment?.baseName) {
    if (typeof baseName !== 'string' || !baseName || !materialOf(item)) return item?.name || '';
    const state = item.equipment;
    const quality = QUALITY[state?.quality];
    const magic = currentEnchantment(item);
    const parts = [quality && quality.factor ? quality.name : '', materialOf(item).name, shapeName(baseName)];
    if (magic) parts.push(`of ${ENCHANTMENTS[magic.id].name} ${LEVELS[magic.level]}`);
    return parts.filter(Boolean).join(' ');
  }

  function rarity(item) {
    const base = item.equipment?.baseRarity || item.rarity;
    const grade = RARITIES.indexOf(base);
    if (grade < 0) return base;
    const magic = currentEnchantment(item);
    const finish = item.equipment?.quality === 'masterwork' && item.equipment.baseName ? 2 : 0;
    const materialGrade = materialOf(item)?.tier === 8 && item.equipment?.baseName ? 2 : 0;
    return RARITIES[Math.max(grade, ENCHANT_RARITY[magic?.level || 0], finish, materialGrade)];
  }

  function decorate(item, options = {}) {
    if (!PHYSICAL(item) || item.equipment?.v === VERSION) return item;
    const { random = Math.random, source = 'loot' } = options;
    const danger = circle(options.dangerTier ?? item.tier);
    const luck = clamp(finite(options.luck), 0, MAX_LUCK);
    const chosen = source === 'starter' ? inferredMaterial(item) : rollMaterial(item, danger, luck, random, options.material);
    const quality = source === 'craft' ? craftingQuality(options, random) : source === 'starter' ? 'standard' :
      weighted(Object.entries({ standard: 77, fine: 18, exceptional: danger >= 3 ? 4 + luck / 30 : 1, masterwork: danger >= 6 ? 1 : 0 }), random);
    const next = {
      ...item,
      equipment: {
        v: VERSION, material: chosen.id, quality, base: statsOf(item.stats), legacy: {},
        baseName: options.baseName || item.name, baseRarity: item.rarity,
        enchantment: source === 'loot' ? rollEnchantment(item, danger, luck, random) : null,
      },
    };
    return { ...next, name: name(next), rarity: rarity(next), stats: { ...item.stats, ...breakdown(next).total } };
  }

  function enchantQuote(item, id, options = {}) {
    if (!availableEnchantments(item).includes(id)) return { ok: false, reason: 'incompatible' };
    const current = currentEnchantment(item);
    const replacing = Boolean(current && current.id !== id);
    const level = replacing ? 1 : (current?.level || 0) + 1;
    const expected = options.expectedEnchantment;
    if (Object.hasOwn(options, 'expectedEnchantment') && (current?.id !== expected?.id || current?.level !== expected?.level)) {
      return { ok: false, reason: 'stale-quote' };
    }
    if (!Number.isInteger(level) || level < 1 || level > 5) return { ok: false, reason: 'max-level' };
    if (options.level != null && options.level !== level) return { ok: false, reason: 'stale-quote' };
    const requiredCircle = ENCHANT_CIRCLES[level - 1];
    const gold = ENCHANT_GOLD[level - 1];
    const components = { [requiredCircle]: 2 * level };
    if (level > 1) components.sigil = level - 1;
    const quote = { ok: false, id, level, gold, components, requiredCircle, replacing, previous: current && { ...current } };
    if (circle(options.circle) < requiredCircle) return { ...quote, reason: 'circle' };
    if (finite(options.gold) < gold) return { ...quote, reason: 'gold' };
    if (Object.entries(components).some(([key, cost]) => finite(options.mats?.[key]) < cost)) {
      return { ...quote, reason: 'components' };
    }
    return { ...quote, ok: true };
  }

  function applyEnchantment(item, id, options = {}) {
    const quote = enchantQuote(item, id, options);
    if (!quote.ok) return { ok: false, reason: quote.reason, quote, item, gold: options.gold, mats: options.mats };
    const migrated = migrate(item);
    const next = { ...migrated, equipment: { ...migrated.equipment, enchantment: { id, level: quote.level } } };
    const mats = { ...options.mats };
    for (const [key, cost] of Object.entries(quote.components)) mats[key] -= cost;
    return {
      ok: true, quote, item: { ...next, name: name(next), rarity: rarity(next), stats: breakdown(next).total },
      gold: options.gold - quote.gold, mats,
    };
  }

  const mitigation = (def, warding = 0, magic = false) => clamp(finite(def) + (magic ? finite(warding) : 0), 0, MAX_ARMOR);
  const castCost = (base, focus) => Math.max(0, base - Math.min(Math.floor(base / 2), Math.max(0, finite(focus))));

  function creatureProfile(name) {
    const label = typeof name === 'string' ? name : '';
    const slaying = /\b(?:barrow king|drowned|ghost|ghoul|lich|revenant|shade|skeleton|specter|spectre|undead|wraith)\b/i.test(label);
    const fireFactor = /\b(?:frost|ice|snow)\b/i.test(label) ? 1.5 : /\b(?:cinder|ember|fire|red dragon|slag)\b/i.test(label) ? .5 : 1;
    return { label, slaying, fireFactor };
  }

  function attack({ weapon, skillId, skill = 0, damageBonus = 0, accuracy = 0, range = [0, 0], swings = 0,
    pageCircle = 1, targetCircle = 1, queryPower = 1, attributeFactor = 1, physicalFactor = 1,
    studyFactor = 1, ambushFactor = 1, target = {}, responseSlots = 2 } = {}) {
    const stats = weapon && weapon.w === skillId ? weapon.stats || {} : {};
    const chance = clamp(finite(accuracy) + finite(stats.precision), 2, 95);
    const power = Math.max(0, finite(queryPower));
    const fire = finite(stats.embers) * Math.max(0, finite(target.fireFactor, 1));
    const slaying = target.slaying ? finite(stats.slaying) : 0;
    const equipment = 1 + (finite(damageBonus) + finite(stats.dmg) + fire + slaying) / 100;
    const page = circle(pageCircle);
    const circlePower = 1 + .12 * (page - 1);
    const circlePenalty = clamp(1 - .2 * (circle(targetCircle) - page), .4, 1);
    const multiplier = circlePower * circlePenalty * equipment * attributeFactor * physicalFactor * studyFactor * ambushFactor * power;
    const damage = baseRoll => power > 0 ? Math.max(1, Math.round((baseRoll + skill / 8) * multiplier)) : 0;
    const low = Math.ceil(finite(range[0]));
    const high = Math.max(low, Math.floor(finite(range[1], low)));
    let totalOnHit = 0;
    for (let base = low; base <= high; base++) totalOnHit += damage(base);
    const strikeCount = power > 0 ? Math.max(0, Math.floor(finite(swings))) : 0;
    const expectedDamage = totalOnHit / (high - low + 1) * chance / 100 * strikeCount;
    const steps = strikeCount + Math.max(1, Math.floor(finite(responseSlots)));
    const seconds = (EXCHANGE_START_MS + EXCHANGE_STEP_MS * steps) / 1000;
    return { accuracy: chance, multiplier, swings: strikeCount, expectedDamage, dps: expectedDamage / seconds, seconds, damage };
  }

  return Object.freeze({
    MATERIALS, QUALITY, ENCHANTMENTS, LEVELS, MAX_LUCK, MAX_ARMOR, EXCHANGE_START_MS, EXCHANGE_STEP_MS,
    materialOf, eligibleMaterials, name, availableEnchantments, craftingQuality, decorate, migrate, breakdown, enchantQuote, applyEnchantment,
    mitigation, castCost, creatureProfile, attack,
  });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = EquipmentRules;
