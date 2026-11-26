const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Content = require('../src/quests.js');

const source = ['dungeons.js', 'dungeon_progress.js', 'dungeon_play.js']
  .map(name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8')).join('\n');
const { Dungeons, DungeonProgress, DungeonPlay } = vm.runInNewContext(`${source}\n({ Dungeons, DungeonProgress, DungeonPlay })`, {setTimeout,clearTimeout});
const bounties = new Map(Content.BOUNTIES.map(b => [b.id, b.r]));

function harness(options = {}) {
  const surface = [110, 140], { guide, saved, r = 1 } = options;
  const calls = { enter: [], load: [], grants: [], dialogs: [], fights: [], sheets: [], toasts: [], tables: [], guideStart: 0, guideChest: 0 };
  const state = { region: r, pos: surface, dungeon: saved ?? null, dungeons: {}, gold: 0, vault: {}, codex: {}, dpity: {}, stats: { dungeons: 0 } };
  let run = null, map = null, point = surface, guideId = guide, main = true, day = '2026-11-22', now = 5000000;
  const scene = {
    debug: () => ({ map }),
    pos: () => point,
    find: predicate => map?.ents.find(predicate),
    enterDungeon(region, opt) {
      const layout = Dungeons.build(region, opt.floor);
      const discovered = DungeonProgress.unpackSeen(opt.progress.seen[opt.floor],layout.w * layout.h);
      map = { dungeonFloor: true, r: region, f: opt.floor, ents: [...layout.entities], discovered };
      point = [...opt.pos];
      calls.enter.push({ region, floor: opt.floor, pos: point, tutorial: opt.tutorial });
    },
    load(position, region) { map = null; point = [...position]; calls.load.push({ position: point, region }); },
    dungeonRefresh() {}, refresh() {}, FX: { treasure() {} }
  };
  const game = DungeonPlay.create({
    state: () => state, run: () => run, setRun: value => { run = value; }, day: () => day, now: () => now, scene,
    close() {}, hud() {}, save: () => game.snapshot(),
    guideId: () => guideId,
    guideStart() { calls.guideStart++; guideId = 'chest'; },
    guideChest() { calls.guideChest++; guideId = 'road'; },
    fight: config => calls.fights.push(config), difficulty: (region, important) => region * 5 + (important ? 10 : 0),
    foe: (region, diff, multiplier) => ({ hp: (region + diff) * multiplier, swings: 1 }),
    luck: () => 0, int: min => min, random: () => .9, rarity: () => 'rare', item: (rarity, region) => ({ rarity, region }),
    dye() {}, unique: id => ({ id }), grant: reward => { state.gold += reward.gold; calls.grants.push(reward); return reward; },
    toast: message => calls.toasts.push(message), dialog: (entity, text, options) => calls.dialogs.push({ entity, text, options }),
    sheet: html => calls.sheets.push(html), escape: text => text, spoils: () => '', main: () => main,
    haveTable: region => calls.tables.includes(region), takeTable: region => calls.tables.push(region)
  });
  function by(predicate) {
    const entity = scene.find(predicate);
    assert.ok(entity, 'expected an available entity on the scene floor');
    return entity;
  }
  function stairs(to) {
    const stair = by(e => e.kind === 'dtravel' && e.to === to);
    game.interact(stair);
    const action = calls.dialogs.at(-1).options.find(option => option.a === 'dtravel');
    assert.equal(action.d.id, stair.id);
    game.travel(action.d.id);
    return stair;
  }
  return {
    game, calls, state, surface, scene, by, stairs,
    lastDialog: () => calls.dialogs.at(-1).text,
    supporting: () => { main = false; }, main: () => { main = true; },
    nextDay: () => { day = '2026-11-23'; now += 86400000; }
  };
}

test('the Bilge starter chest survives re-entry while the guide starts and pays only once', () => {
  const h = harness({ guide: 'vault' });
  h.game.enter(1);
  assert.equal(h.calls.enter.at(-1).tutorial, true);
  assert.equal(h.calls.guideStart, 1);
  const starter = h.by(e => e.tutorial && e.kind === 'dcache');
  h.game.interact(starter);
  assert.equal(h.calls.grants.length, 0);
  assert.match(h.lastDialog(), /guardian.*key/i);

  h.game.victory(h.by(e => e.tutorial && e.kind === 'dmon'));
  h.stairs(-1);
  h.game.enter(1);
  assert.equal(h.calls.enter.at(-1).tutorial, true);
  assert.equal(h.calls.guideStart, 1);
  h.game.interact(h.by(e => e.id === starter.id));
  h.game.interact(h.by(e => e.id === starter.id));
  assert.equal(h.calls.guideChest, 1);
  assert.equal(h.calls.grants.length, 1);
  assert.match(h.calls.sheets.at(-1), /<h2>Starter chest<\/h2>/);
});

test('entering another dungeon leaves the Bilge guide at its existing stage', () => {
  const h = harness({ guide: 'vault', r: 2 });
  h.game.enter(2);
  assert.equal(h.calls.enter.at(-1).tutorial, false);
  assert.equal(h.calls.guideStart, 0);
});

test('stairs use reciprocal arrivals and retain discoveries and passages on return', () => {
  const h = harness({ r: 4 });
  h.game.enter(4);
  const map = h.scene.debug().map, layout = Dungeons.build(4, 0);
  const seen = layout.entry[1] * layout.w + layout.entry[0];
  map.discovered[seen] = 1;
  const lever = h.by(e => e.kind === 'dlever');
  h.game.interact(lever);
  const unlock = h.calls.dialogs.at(-1).options.find(option => option.a === 'dopen');
  h.game.open(unlock.d.id);
  h.game.interact(h.by(e => e.id === lever.target));
  assert.match(h.lastDialog(), /passage is open/i);

  const down = h.stairs(1), up = h.stairs(0);
  assert.deepEqual(h.calls.enter.map(entry => entry.floor), [0, 1, 0]);
  assert.deepEqual(h.calls.enter[1].pos, [...down.arrival]);
  assert.deepEqual(h.calls.enter[2].pos, [...up.arrival]);
  assert.equal(h.scene.debug().map.discovered[seen], 1);
  h.game.interact(h.by(e => e.id === lever.target));
  assert.match(h.lastDialog(), /passage is open/i);
  h.stairs(-1);
  assert.deepEqual(h.calls.load, [{ position: h.surface, region: 4 }]);
  assert.equal(h.state.dungeon, null);
});

test('dungeon encounters send regional bounty templates and role differences into combat', () => {
  const h = harness({ r: 6 });
  h.game.enter(6);
  const armored = h.by(e => e.kind === 'dmon' && !e.lieutenant && e.role === 'armored');
  const caster = h.by(e => e.kind === 'dmon' && !e.lieutenant && e.role === 'caster');
  const lieutenant = h.by(e => e.lieutenant);
  const instance = { dungeon: 1, tpl: caster.tpl, art: caster.species, role: caster.role };
  h.game.fight(armored);
  h.game.fight({ ...caster, inst: instance });
  h.game.fight(lieutenant);
  h.stairs(1); h.stairs(2); h.stairs(3);
  h.game.fight(h.by(e => e.kind === 'keeper'));

  const [plate, spell, seal, keeper] = h.calls.fights;
  for (const fight of h.calls.fights) {
    assert.equal(fight.kind, 'dungeon');
    assert.equal(bounties.get(fight.inst.tpl), 6);
    assert.equal(fight.sig, fight.inst.tpl);
    assert.equal(fight.drole, fight.ent.role);
  }
  assert.equal(spell.inst, instance);
  assert.ok(spell.foe.swings > plate.foe.swings);
  assert.ok(plate.foe.hp > spell.foe.hp);
  assert.equal(seal.noHint, true);
  assert.equal(keeper.keeper, 1);
  assert.equal(keeper.noHint, true);
  assert.ok(keeper.foe.hp > seal.foe.hp);
});

test('each floor seal and the final keeper are required for one vault payout per day', () => {
  const h = harness({ r: 2 });
  h.game.enter(2);
  const discover = h.scene.debug().map.discovered;
  const seen = Dungeons.build(2, 0).w + 4;
  discover[seen] = 1;
  const secret = h.by(e => e.kind === 'dsecret');
  h.game.open(secret.id);
  h.game.victory(h.by(e => e.lieutenant));
  h.stairs(1);
  h.game.victory(h.by(e => e.kind === 'dmon' && !e.lieutenant));
  h.stairs(2);
  const vault = () => h.by(e => e.kind === 'chest');
  h.game.interact(vault());
  assert.match(h.lastDialog(), /Reed Channels/);
  h.stairs(1);
  h.game.victory(h.by(e => e.lieutenant));
  h.stairs(2);
  h.game.interact(vault());
  assert.match(h.lastDialog(), /defeat the keeper/i);
  assert.equal(h.calls.grants.length, 0);

  h.game.victory(h.by(e => e.kind === 'keeper'));
  h.game.interact(vault()); h.game.interact(vault());
  assert.equal(h.calls.grants.length, 1);
  assert.equal(h.state.stats.dungeons, 1);
  assert.ok(h.calls.grants[0].scrolls.includes('s2r'));

  h.nextDay();
  h.game.interact(vault());
  assert.match(h.lastDialog(), /Gatehouse.*Reed Channels/);
  assert.equal(h.calls.grants.length, 1);
  h.stairs(1);
  h.game.victory(h.by(e => e.lieutenant));
  h.stairs(0);
  assert.equal(h.scene.debug().map.discovered[seen], 1);
  h.game.interact(h.by(e => e.id === secret.id));
  assert.match(h.lastDialog(), /passage is open/i);
  h.game.victory(h.by(e => e.lieutenant));
  h.stairs(1); h.stairs(2);
  h.game.interact(vault());
  assert.match(h.lastDialog(), /defeat the keeper/i);
  h.game.victory(h.by(e => e.kind === 'keeper'));
  h.game.interact(vault()); h.game.interact(vault());
  assert.equal(h.calls.grants.length, 2);
  assert.equal(h.state.stats.dungeons, 2);
});

test('only the main character can recover a lost table after the keeper falls', () => {
  const h = harness({ r: 3 });
  h.game.enter(3); h.stairs(1); h.stairs(2);
  const table = h.by(e => e.kind === 'ltable');
  h.game.table(table);
  assert.match(h.lastDialog(), /keeper guards/i);
  assert.deepEqual(h.calls.tables, []);
  h.game.victory(h.by(e => e.kind === 'keeper'));
  h.supporting();
  h.game.table(table);
  assert.match(h.calls.toasts.at(-1), /main character/i);
  assert.deepEqual(h.calls.tables, []);
  h.main();
  h.game.table(table); h.game.table(table);
  assert.deepEqual(h.calls.tables, [3]);
});

test('restore discards unknown floors and uses a safe entry for invalid coordinates', () => {
  const layout = Dungeons.build(1, 1), back = [121, 145];
  const closedGate = layout.entities.find(e => e.kind === 'dgate');
  const closedCell = closedGate.cells.find(([x, y]) => x !== closedGate.x || y !== closedGate.y);
  for (const bad of [{ r: 9, f: 0 }, { r: 1, f: 3 }, { r: 1, f: '1' }]) {
    const h = harness({ saved: { ...bad, x: 3, y: 3, back } });
    assert.equal(h.game.restore(), false);
    assert.equal(h.state.dungeon, null);
    assert.deepEqual(h.calls.enter, []);
  }
  for (const [x, y] of [[0, 0], [3.4, 5], [-1, 4], closedCell]) {
    const h = harness({ saved: { r: 1, f: 1, x, y, back } });
    assert.equal(h.game.restore(), true);
    assert.deepEqual(h.scene.pos(), [...layout.entry]);
    h.stairs(0); h.stairs(-1);
    assert.deepEqual(h.calls.load.at(-1).position, back);
  }
  const h = harness({ saved: { r: 1, f: 1, x: closedGate.x, y: closedGate.y, back } });
  h.game.progress(1).gates[closedGate.id] = true;
  assert.equal(h.game.restore(), true);
  assert.deepEqual(h.scene.pos(), [closedGate.x, closedGate.y]);
});
