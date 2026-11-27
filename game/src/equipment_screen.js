/* Item details, build comparisons, and workbench enchantment actions. */
const EquipmentScreen = (() => {
  const G = EquipmentRules;
  const targets = Object.freeze({
    neutral: { label: 'Ordinary', fireFactor: 1, slaying: false },
    undead: { ...G.creatureProfile('Barrow Ghoul'), label: 'Undead' },
    frost: { ...G.creatureProfile('Frost Harpy'), label: 'Frost' },
    fire: { ...G.creatureProfile('Ember Moth'), label: 'Fire' },
  });
  const labels = Object.freeze({
    dmg: ['weapon damage', '%'], def: ['defence', '%'], xp: ['damage', '%'], gold: ['gold', '%'],
    learn: ['skill gain', '%'], luck: ['luck', '%'], deft: ['deftness', '%'], embers: ['fire damage', '%'],
    slaying: ['damage against undead', '%'], precision: ['points to hit', ''], focus: ['mana saved', ''],
    warding: ['magical defence', '%'], vitality: ['maximum health', ''], quieting: ['points to hide', ''],
    endurance: ['maximum stamina', ''],
  });
  const stat = (key, amount) => {
    const [label, unit] = Object.hasOwn(labels, key) ? labels[key] : [key, ''];
    return `${amount < 0 ? '−' : '+'}${Math.abs(amount)}${unit} ${label}`;
  };
  const effectName = (id, level) => `${G.ENCHANTMENTS[id].name} ${G.LEVELS[level]}`;

  function create(host) {
    const esc = value => host.escape(String(value ?? ''));
    const selected = new WeakMap();
    let quoteSerial = 0;
    let session = null;
    const statText = stats => Object.entries(stats).map(([key, amount]) => esc(stat(key, amount))).join(' · ') || '0';
    const bonus = key => host.bonus(key) || 0;
    const targetKey = item => selected.get(host.state())?.get(item.id) || 'neutral';
    const skillName = id => host.skillName ? host.skillName(id) : host.defs[id].n;
    const accuracy = (skill, difficulty) => host.accuracy ? host.accuracy(skill, difficulty) :
      Math.round(Math.max(35, Math.min(95, 50 + 2 * (skill - difficulty))));

    function gearBreakdown(item) {
      const material = G.materialOf(item);
      if (!material) return '';
      const { base, material: contribution, workmanship, magic, legacy, total } = G.breakdown(item);
      const quality = G.QUALITY[item.equipment?.quality] || G.QUALITY.standard;
      const enchantment = item.equipment?.enchantment;
      const effect = enchantment && Object.hasOwn(G.ENCHANTMENTS, enchantment.id) ? effectName(enchantment.id, enchantment.level) : '';
      const rows = [
        ['Base', base], [`Material · ${material.name}`, contribution], [`Craftsmanship · ${quality.name}`, workmanship],
        [effect ? `Enchantment · ${effect}` : 'Enchantment', magic], ['Legacy', legacy], ['Total', total],
      ];
      return `<section class="sec" data-equipment-breakdown><h3>Equipment bonuses</h3><div class="kv">${rows.map(([label, values]) =>
        `<span>${esc(label)}</span><span>${statText(values)}</span>`).join('')}</div></section>`;
    }

    function armorComparison(item) {
      if (item.slot === 'weapon' || (!G.materialOf(item) && !item.stats?.def && !item.stats?.warding)) return '';
      const worn = host.item(host.state().eq[item.slot]);
      const def = bonus('def'), warding = bonus('warding');
      const nextDef = def - (worn?.stats?.def || 0) + (item.stats?.def || 0);
      const nextWarding = warding - (worn?.stats?.warding || 0) + (item.stats?.warding || 0);
      const row = (label, before, after) => `<span>${label}</span><span>${before}% → ${after}%</span>`;
      return `<section class="sec" data-equipment-mitigation><h3>Equipment mitigation</h3><div class="kv">${
        row('Physical damage', G.mitigation(def), G.mitigation(nextDef)) +
        row('Magical damage', G.mitigation(def, warding, true), G.mitigation(nextDef, nextWarding, true))
      }</div><p class="cap2">Your worn gear comes first. Equipment can reduce incoming damage by up to ${G.MAX_ARMOR}%.</p></section>`;
    }

    function weaponComparison(item) {
      if (item.slot !== 'weapon' || !Object.hasOwn(host.defs, item.w)) return '';
      const book = item.w === 'magery' ? 'spell' : 'arms';
      const page = {name:item.w==='magery'?'Basic Spark':'Basic attack'};
      const worn = host.item(host.state().eq.weapon);
      const arms = ['swords', 'fencing', 'archery'];
      const unarmed = arms.reduce((a, b) => host.skill(b) > host.skill(a) ? b : a);
      const currentSkill = book === 'spell' ? 'magery' : arms.includes(worn?.w) ? worn.w : unarmed;
      const circle = host.circle();
      const difficulty = host.difficulty();
      const key = targetKey(item);
      const foe = targets[key];
      const factor = book === 'spell' ? host.spellFactor() : host.physicalFactor();
      const getAttack = (weapon, skillId) => {
        const skill = host.skill(skillId);
        const definition = host.defs[skillId];
        const damageBonus = bonus('xp') - (worn?.stats?.xp || 0) + (weapon?.stats?.xp || 0);
        const result=G.attack({ weapon, skillId, skill, damageBonus, accuracy: accuracy(skill, difficulty),
          range: definition.dmg, swings: definition.swings,
          pageCircle: 1, targetCircle: 1, queryPower: 1, attributeFactor: factor,target: foe });
        result.seconds=LiveCombat.recovery(Techniques.basic(skillId).recovery,skillId,host.state().attr.dex).total;
        result.dps=result.expectedDamage/result.seconds;return result;
      };
      const before = getAttack(worn, currentSkill), next = getAttack(item, item.w);
      const row = (label, a, b) => `<span>${label}</span><span>${a} → ${b}</span>`;
      const number = n => n.toFixed(1);
      const delta = next.dps - before.dps;
      const amount = Math.abs(delta);
      const change = amount < .00001 ? 'Same damage per second · 0.0 DPS change' : before.dps === 0 ?
        `▲ +${number(amount)} DPS from zero` :
        `${delta > 0 ? '▲' : '▼'} ${number(amount / before.dps * 100)}% ${delta > 0 ? 'more' : 'less'} damage per second · ${delta > 0 ? '+' : '−'}${number(amount)} DPS`;
      const choices = Object.entries(targets).map(([id, target]) => `<button class="btn sm ${key === id ? 'solid' : 'quiet'}" style="min-height:44px" data-a="comparetarget" data-id="${esc(item.id)}" data-target="${id}" aria-pressed="${key === id}">${target.label}</button>`);
      return `<section class="sec" data-equipment-comparison><h3>Combat comparison</h3>` +
        `<p class="cap2">${esc(page.name)} · Circle ${circle} foe · ${esc(skillName(currentSkill))} → ${esc(skillName(item.w))}</p>` +
        `<p data-equipment-strength><b>${change}</b></p>` +
        `<div class="kv">${row('Expected damage per query', number(before.expectedDamage), number(next.expectedDamage))}` +
        `${row('Combat DPS', number(before.dps), number(next.dps))}${row('Chance per strike', `${number(before.accuracy)}%`, `${number(next.accuracy)}%`)}` +
        `${row('Strikes per query', before.swings, next.swings)}</div>` +
        `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px" role="group" aria-label="Compare against">${choices.join('')}</div>` +
        '<p class="cap2">Your worn weapon comes first. This assumes stationary basic attacks, correct SQL without hints, and active recovery time against an unarmoured foe. SQL pauses the world. Slaying helps against undead. Embers deals more fire damage to frost creatures and less to fire creatures.</p></section>';
    }

    function details(item) {
      const service = host.service();
      const enchant = service?.valid && G.availableEnchantments(item).length ? `<div class="row end"><button class="btn sm quiet" data-a="enchitem" data-id="${esc(item.id)}">Enchant this item</button></div>` : '';
      return gearBreakdown(item) + weaponComparison(item) + armorComparison(item) + enchant;
    }

    function target({ id, target: key }) {
      const state = host.state();
      const item = host.item(id);
      if (!state || item?.slot !== 'weapon' || !Object.hasOwn(targets, key)) return false;
      const entries = selected.get(state) || new Map();
      entries.set(id, key);
      if (entries.size > 60) entries.delete(entries.keys().next().value);
      selected.set(state, entries);
      const card = typeof document !== 'undefined' && document.querySelector('#sheet .sheet-card');
      const scrollTop = card ? card.scrollTop : 0;
      host.showItem(id);
      if (card) {
        card.scrollTop = scrollTop;
        card.querySelector(`[data-a="comparetarget"][data-target="${key}"]`)?.focus({ preventScroll: true });
      }
      return true;
    }

    const reason = (quote) => ({
      circle: `Requires a workbench in Circle ${quote.requiredCircle} or higher.`,
      gold: 'You need more gold.', components: 'You need more components.',
      'max-level': 'This enchantment is already level V.',
      'stale-quote': 'Choose the enchantment again. Your equipment has changed.',
    }[quote.reason] || 'This item cannot take that enchantment.');
    const materials = quote => Object.entries(quote.components).map(([key, cost]) =>
      `${cost} ${esc(key === 'sigil' ? (cost === 1 ? 'sigil' : 'sigils') : host.materialName(key))}`).join(' · ');
    const purse = state => ({ circle: host.circle(), gold: state.gold, mats: state.mats });

    function openEnchant(id) {
      session = null;
      const owner = host.state(), service = host.service();
      if (!owner || !service?.valid || !service.entity) { host.toast('Walk up to a workbench to enchant gear.'); return false; }
      const item = id && host.item(id);
      if (id && (!item || !G.availableEnchantments(item).length)) { host.toast('Choose a weapon or a piece of armour from your bag.'); return false; }
      if (!item) {
        const choices = owner.inv.filter(piece => G.availableEnchantments(piece).length);
        host.sheet(`<p class="eyebrow">Workbench</p><h2>Enchant equipment</h2><p class="cap2">Choose a piece from your bag. Enchanting always succeeds when you pay the full cost.</p>` +
          (choices.length ? `<ul class="goods">${choices.map(piece => `<li class="good">${host.itemIcon ? host.itemIcon(piece) : host.icon(piece.ic)}<div><b>${esc(piece.name)}</b><small>${esc(G.materialOf(piece).name)}</small></div><button class="btn sm" data-a="enchitem" data-id="${esc(piece.id)}" aria-label="Enchant ${esc(piece.name)}">Choose</button></li>`).join('')}</ul>` : '<p>You have no weapons or armour to enchant.</p>'));
        return true;
      }
      const serial = ++quoteSerial;
      const quotes = new Map(G.availableEnchantments(item).map(effect => [effect, G.enchantQuote(item, effect, purse(owner))]));
      session = { serial, owner, entity: service.entity, item, quotes };
      const rows = [...quotes].map(([effect, quote]) => {
        const definition = G.ENCHANTMENTS[effect];
        const row = '<li class="good" style="grid-template-columns:minmax(0,1fr) auto;align-items:start">';
        if (!quote.level) return `${row}<div><b>${definition.name}</b><small>${reason(quote)}</small></div></li>`;
        const old = quote.previous;
        const value = definition.values[quote.level - 1];
        const replaces = quote.replacing ? ` Replaces ${effectName(old.id, old.level)}.` : '';
        const increase = old && !quote.replacing ? `${esc(stat(definition.stat, definition.values[old.level - 1]))} → ` : '';
        const name = effectName(effect, quote.level);
        return `${row}<div><b>${name}</b><small>${increase}${esc(stat(definition.stat, value))}. ${definition.detail}${replaces}</small>` +
          `<small>${quote.gold} gold · ${materials(quote)}</small>${quote.ok ? '' : `<small>${reason(quote)}</small>`}</div>` +
          `<button class="btn sm" style="min-height:44px" data-a="enchantapply" data-id="${esc(item.id)}" data-effect="${effect}" data-level="${quote.level}" data-quote="${serial}" aria-label="${quote.replacing ? 'Replace with' : 'Apply'} ${name}"${quote.ok ? '' : ' disabled'}>${quote.replacing ? 'Replace' : 'Apply'}</button></li>`;
      });
      host.sheet(`<p class="eyebrow">Workbench</p><h2>Enchant equipment</h2><p>${esc(item.name)}</p><p class="cap2">You have ${owner.gold} gold.</p><ul class="goods">${rows.join('')}</ul><div class="row end"><button class="btn quiet" data-a="enchantmenu">Choose another item</button></div>`);
      return true;
    }

    function enchant({ id, effect, level, quote: serial }) {
      const active = session, owner = host.state(), service = host.service();
      const item = host.item(id);
      const quote = active?.quotes.get(effect);
      if (!active || !service?.valid || service.entity !== active.entity || owner !== active.owner || !item || item !== active.item ||
          Number(serial) !== active.serial || !quote?.ok || Number(level) !== quote.level) {
        host.toast('Choose the enchantment again at the workbench.');
        return false;
      }
      const index = owner.inv.indexOf(item);
      if (index < 0) return false;
      const result = G.applyEnchantment(item, effect, { ...purse(owner), level: quote.level, expectedEnchantment: quote.previous });
      if (!result.ok) { host.toast(reason(result.quote)); openEnchant(id); return false; }
      session = null;
      owner.inv[index] = result.item;
      owner.gold = result.gold;
      owner.mats = result.mats;
      host.sync?.();
      host.save();
      host.render();
      host.toast(`${effectName(effect, result.quote.level)} is ready.`);
      openEnchant(id);
      return true;
    }

    return Object.freeze({ details, openEnchant, enchant, target });
  }

  return Object.freeze({ create });
})();
