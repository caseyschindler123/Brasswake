/* Learned combat techniques and the per-character loadout. Range is in tiles, recovery in seconds. */
const Techniques = (() => {
  const requirements = [50, 60, 70, 80, 90, 92, 95, 98, 100];
  const dojos = [1, 2, 3, 4, 5, 6, 7, 8, 8];
  const disciplines = ['swords', 'fencing', 'archery', 'magery'];
  const weapons = { swords: 'a sword', fencing: 'a fencing weapon', archery: 'a bow' };
  const labels = { swords: 'Swords', fencing: 'Fencing', archery: 'Archery', magery: 'Magery' };

  // Key, name, effect, power, resource cost, range, recovery, target, and effect description.
  const lessons = {
    swords: [
      ['cross-cut', 'Cross Cut', 'burst', 1.4, 7, 1.4, 1.85, 'enemy', 'Put your weight behind a heavy cut.'],
      ['guard-break', 'Guard Break', 'expose', 1, 8, 1.4, 1.65, 'enemy', 'Open the enemy’s guard so your next hit deals more damage.'],
      ['hamstring', 'Hamstring', 'slow', 1.05, 8, 1.4, 1.6, 'enemy', 'Cut low to slow the enemy’s movement.'],
      ['pommel-strike', 'Pommel Strike', 'interrupt', .85, 9, 1.3, 1.45, 'enemy', 'Strike with the hilt to interrupt the enemy’s next attack.'],
      ['iron-guard', 'Iron Guard', 'defend', 14, 9, 0, 1.2, 'self', 'Brace for the next blow.'],
      ['long-cut', 'Long Cut', 'lunge', 1.2, 10, 2.15, 1.7, 'enemy', 'Step into range with a long cut.'],
      ['armor-shear', 'Armor Shear', 'pierce', 1.25, 10, 1.45, 1.9, 'enemy', 'Drive the edge through a gap in the enemy’s armor.'],
      ['rending-cut', 'Rending Cut', 'bleed', 1.15, 11, 1.45, 1.9, 'enemy', 'Leave a wound that continues to deal damage.'],
      ['final-stroke', 'Final Stroke', 'burst', 1.8, 17, 1.45, 2.5, 'enemy', 'Commit to a powerful blow with a long recovery.'],
      ['kingsfall', 'Kingsfall', 'pierce', 1.95, 18, 1.55, 2.55, 'enemy', 'Deliver a heavy strike through the enemy’s armor.']
    ],
    fencing: [
      ['stop-thrust', 'Stop Thrust', 'precision', 1.15, 6, 1.5, 1.4, 'enemy', 'Set a quick, accurate point against an approaching enemy.'],
      ['drawn-point', 'Drawn Point', 'bleed', 1, 7, 1.5, 1.4, 'enemy', 'Draw the point across the enemy to leave a bleeding wound.'],
      ['bind', 'Bind', 'slow', .9, 7, 1.5, 1.3, 'enemy', 'Catch the enemy off balance and slow their movement.'],
      ['riposte', 'Riposte', 'riposte', 11, 8, 0, 1.2, 'self', 'Prepare to answer the next blow with a counterstrike.'],
      ['passata', 'Passata', 'lunge', 1.2, 9, 2.25, 1.4, 'enemy', 'Pass forward into a thrust from beyond ordinary reach.'],
      ['disengage', 'Disengage', 'expose', 1.05, 8, 1.55, 1.35, 'enemy', 'Circle the enemy’s guard and leave an opening for your next hit.'],
      ['needle-point', 'Needle Point', 'pierce', 1.2, 9, 1.55, 1.55, 'enemy', 'Pick a narrow opening in the enemy’s armor.'],
      ['beat-and-thrust', 'Beat and Thrust', 'interrupt', 1.1, 10, 1.6, 1.45, 'enemy', 'Knock the enemy’s attack aside as you thrust.'],
      ['redouble', 'Redouble', 'burst', 1.6, 13, 1.5, 1.9, 'enemy', 'Press the enemy with a renewed thrust.'],
      ['mirror-riposte', 'Mirror Riposte', 'riposte', 23, 15, 0, 1.85, 'self', 'Prepare a stronger counterstrike against the next blow.']
    ],
    archery: [
      ['true-shot', 'True Shot', 'precision', 1.1, 7, 6, 1.75, 'enemy', 'Take a careful shot from beyond ordinary bow range.'],
      ['pinning-shot', 'Pinning Shot', 'slow', 1, 8, 5, 1.65, 'enemy', 'Land a shot that slows the enemy.'],
      ['bodkin', 'Bodkin', 'pierce', 1.2, 9, 5, 1.9, 'enemy', 'Drive a narrow arrow through armor.'],
      ['broadhead', 'Broadhead', 'bleed', 1.05, 9, 4.8, 1.7, 'enemy', 'Use a broad arrowhead to leave a bleeding wound.'],
      ['knee-shot', 'Knee Shot', 'interrupt', .9, 10, 5, 1.75, 'enemy', 'Interrupt an enemy’s next attack with a low shot.'],
      ['split-fletch', 'Split Fletch', 'expose', 1.1, 10, 5, 1.75, 'enemy', 'Force the enemy to expose a weak point to your next hit.'],
      ['full-draw', 'Full Draw', 'burst', 1.65, 13, 5.25, 2.25, 'enemy', 'Hold the bow at full draw for a heavier hit.'],
      ['far-shot', 'Far Shot', 'precision', 1.25, 12, 7, 2.05, 'enemy', 'Land an accurate shot from the far edge of range.'],
      ['siege-shot', 'Siege Shot', 'pierce', 1.65, 16, 5.5, 2.4, 'enemy', 'Drive a heavy arrow through the enemy’s armor.'],
      ['gale-shot', 'Gale Shot', 'precision', 1.85, 17, 7, 2.35, 'enemy', 'Land a powerful, accurate shot from long range.']
    ],
    magery: [
      ['frost-dart', 'Frost Dart', 'slow', .9, 6, 5, 1.45, 'enemy', 'Chill the enemy to slow their movement.'],
      ['sunlance', 'Sunlance', 'pierce', 1.23, 8, 5.5, 1.75, 'enemy', 'Send a shaft of light through the enemy’s defenses.'],
      ['fireball', 'Fireball', 'burst', 1.55, 10, 4.75, 1.95, 'enemy', 'Hurl a ball of fire at one enemy.'],
      ['force-wave', 'Force Wave', 'push', .9, 9, 3.5, 1.5, 'enemy', 'Push the enemy away and make room to move.'],
      ['ward', 'Ward', 'ward', 16, 10, 0, 1.4, 'self', 'Raise a ward to absorb damage from the next blow.'],
      ['healing', 'Healing', 'heal', 18, 12, 0, 1.8, 'self', 'Restore some of your lost health.'],
      ['mana-siphon', 'Mana Siphon', 'siphon', .85, 4, 4.25, 1.75, 'enemy', 'Draw mana back when the spell strikes an enemy.'],
      ['crystal-shard', 'Crystal Shard', 'expose', 1.35, 12, 5.25, 1.9, 'enemy', 'Leave the enemy exposed to your next hit.'],
      ['rewrite', 'Rewrite', 'disrupt', 1.35, 15, 5, 2.05, 'enemy', 'Disrupt the enemy’s next attack.'],
      ['unwrite', 'Unwrite', 'disrupt', 1.7, 18, 5.5, 2.4, 'enemy', 'Interrupt the enemy and hold off their next attack for longer.']
    ]
  };

  function definition(discipline, row, index) {
    const [key, name, effect, power, cost, range, recovery, target, description] = row;
    const rare = index === requirements.length;
    const source = rare ? { type: 'drop' } : { type: 'dojo', dojo: dojos[index] };
    return Object.freeze({
      id: discipline + '.' + key, name, discipline, source: Object.freeze(source),
      requirement: rare ? 95 : requirements[index], effect, power, sqlOffset: rare ? 2 : 1,
      mana: discipline === 'magery' ? cost : 0, stamina: discipline === 'magery' ? 0 : cost,
      range, recovery, target, equipment: discipline === 'magery' ? undefined : discipline,
      rare, description
    });
  }

  lessons.magery=[lessons.magery[0],lessons.magery[5],lessons.magery[4],lessons.magery[1],lessons.magery[2],lessons.magery[3],...lessons.magery.slice(6)];
  const catalog = Object.freeze(disciplines.flatMap(d => lessons[d].map((row, i) => definition(d, row, i))));
  const basics = Object.fromEntries(disciplines.map(d => {
    const magic = d === 'magery';
    return [d, Object.freeze({
      id: 'basic.' + d, name: magic ? 'Spark' : 'Attack', discipline: d,
      requirement: 0, effect: 'damage', power: 1, sqlOffset: 0,
      mana: magic ? 3 : 0, stamina: magic ? 0 : 3,
      range: { swords: 1.35, fencing: 1.45, archery: 5, magery: 4.5 }[d],
      recovery: { swords: 1.5, fencing: 1.15, archery: 1.6, magery: 1.3 }[d],
      target: 'enemy', equipment: magic ? undefined : d, rare: false,
      description: magic ? 'Cast a small spark at the enemy.' : 'Strike with your equipped weapon.'
    })];
  }));
  const records = new Map([...catalog, ...Object.values(basics)].map(def => [def.id, def]));
  const basic = discipline => Object.hasOwn(basics, discipline) ? basics[discipline] : null;
  const get = id => records.get(id) || null;

  function legacyIds(pageId) {
    const match = typeof pageId === 'string' && /^([as])([1-8])r?$/.exec(pageId);
    if (!match) return [];
    const dojo = Number(match[2]);
    return catalog.filter(def => def.source.dojo === dojo &&
      (match[1] === 's' ? def.discipline === 'magery' : def.discipline !== 'magery')).map(def => def.id);
  }

  function normalize(s) {
    const old = s.techniques;
    const learned = {};
    for (const def of catalog) if (old?.learned?.[def.id]) learned[def.id] = true;
    for (const pageId of old?.legacyMigrated ? [] : Object.keys(s.pages || {})) {
      if (s.pages[pageId]) for (const id of legacyIds(pageId)) learned[id] = true;
    }
    const previousSlots = Array.isArray(old?.equipped) ? old.equipped : [];
    const equipped = Array.from({ length: 4 }, (_, slot) => {
      const id = previousSlots[slot];
      return typeof id === 'string' && Object.hasOwn(learned, id) && previousSlots.indexOf(id) === slot ? id : null;
    });
    const dojo = {};
    for (let n = 1; n <= 8; n++) if (old?.dojo?.[n]) dojo[n] = true;
    return s.techniques = { v: 1, legacyMigrated: true, learned, equipped, dojo, supply: old?.supply === 'draught' ? 'draught' : 'bandage' };
  }

  function state(s) {
    return s.techniques?.v === 1 ? s.techniques : normalize(s);
  }

  function learn(s, id) {
    if (!get(id)?.source) return false;
    const { learned } = state(s);
    if (learned[id]) return false;
    learned[id] = true;
    return true;
  }

  function teach(s, dojo) {
    if (!Number.isInteger(dojo) || dojo < 1 || dojo > 8) return [];
    state(s).dojo[dojo] = true;
    return catalog.filter(def => def.source.dojo === dojo && learn(s, def.id)).map(def => def.id);
  }

  const ready = Object.freeze({ ok: true, reason: '' });
  const denied = reason => ({ ok: false, reason });
  const slotValid = slot => Number.isInteger(slot) && slot >= 0 && slot < 4;
  const hideSlot = s => slotValid(s.hideSlot) && !state(s).equipped[s.hideSlot] ? s.hideSlot : null;

  function eligibility(s, id, context = {}) {
    const def = get(id);
    if (!def) return denied('Unknown technique.');
    if (def.source && !state(s).learned[id]) return denied('Learn this technique first.');
    if (def.requirement > (Number(s.sk?.[def.discipline]) || 0))
      return denied(`Requires ${def.requirement} ${labels[def.discipline]}.`);
    if (def.equipment && context.weapon !== def.equipment)
      return denied(`Equip ${weapons[def.equipment]}.`);
    if (context.use) {
      const mana = Number.isFinite(context.manaCost) ? Math.max(0, context.manaCost) : def.mana;
      if (mana > (s.mana || 0)) return denied(`Requires ${mana} mana.`);
      if (def.stamina > (s.stamina || 0)) return denied(`Requires ${def.stamina} stamina.`);
    }
    return ready;
  }

  function equip(s, id, slot, context = {}) {
    if (context.combat) return denied('Find safety to change your action slots.');
    if (!slotValid(slot)) return denied('Choose one of the four slots.');
    const { equipped } = state(s);
    if (id === 'hide') {
      equipped[slot] = null;
      s.hideSlot = slot;
      return ready;
    }
    if (id === null) {
      equipped[slot] = null;
      if (s.hideSlot === slot) delete s.hideSlot;
      return ready;
    }
    if (!get(id)?.source) return denied('Choose a learned technique.');
    const result = eligibility(s, id, context);
    if (!result.ok) return result;
    if (equipped.some((other, i) => i !== slot && other === id))
      return denied('This technique is already equipped.');
    equipped[slot] = id;
    if (s.hideSlot === slot) delete s.hideSlot;
    return ready;
  }

  return { catalog, get, normalize, learn, teach, eligibility, equip, hideSlot, basic, legacyIds };
})();
if (typeof module !== 'undefined') module.exports = Techniques;
