const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const key = 'brasswake.acct.v9';
const releases = [
  '3e4601a75be8f2a2fd460410e23c62cf54276bb8',
  'e6075e4d3a6c61bf7931a3fe5c6865ceb4e7c328',
];

function source(file, revision) {
  const relative = 'game/src/' + file + '.js';
  if (!revision) return fs.readFileSync(path.join(root, relative), 'utf8');
  return execFileSync('git', ['show', revision + ':' + relative], { cwd: root, encoding: 'utf8' });
}

function between(code, first, last) {
  const start = code.indexOf(first), end = code.indexOf(last, start + first.length);
  assert.ok(start >= 0 && end > start, 'Save regression could not locate the runtime source section');
  return code.slice(start, end);
}

// Execute the real save adapter and cartography timer without the UI, clock,
// or canvas. Earlier runtime functions come from immutable Git revisions.
function runtime(storage, revision) {
  const code = source('game', revision);
  const dependencies = ['geography', 'world_progress', 'cartography', 'progression',
    'prologue', 'character_worlds', 'dungeon_progress', 'interiors'];
  if (!revision) dependencies.push('equipment_rules', 'mounts', 'character_profiles');
  const timers = new Map();
  let timerId = 0, itemId = 99;
  const quiet = () => {};
  const context = vm.createContext({
    ...(!revision?{Learning:require('../src/learning')}:{}),
    localStorage: {
      getItem: name => storage.get(name) ?? null,
      setItem: (name, value) => storage.set(name, value),
    },
    Scene: { cartographyAtlas: quiet },
    document: { querySelectorAll: () => [] },
    $: () => null, boatActive: () => false, now: () => 1000, rid: () => ++itemId,
    region: quiet, esc: quiet, sheet: quiet, toast: quiet, render: quiet, closeSheet: quiet,
    surfaceBodies: quiet,
    resetTactics: quiet, CONCEAL: {}, Sneaking: { reveal: quiet },
    setTimeout(callback, delay) {
      timers.set(++timerId, { callback, delay });
      return timerId;
    },
    clearTimeout: id => timers.delete(id),
  });
  const sections = [
    ...dependencies.map(file => source(file, revision)),
    source('cartography_screen', revision),
    'let S, DG = null, sceneOwner = null, sceneUp = false, interiorSaveTimer = 0;',
    between(code, '  const fresh = ', '  function saveCode'),
    between(code, '  const CMap = CartographyScreen.create(', '  function vMap('),
  ];
  if (!revision) sections.push(between(code, '  function equipmentTree', '  const activePursuit'));
  sections.push(`globalThis.saveProbe = {
    fresh, account: CharacterWorlds.fresh,
    writeFixture(account) { A = account; loadCur(); save(); },
    loadDevice() { A = loadA(); loadCur(); },
    markStartingPosition() { CMap.restore(); CMap.moved(...Geography.towns[1]); },
    save,
  };`);
  vm.runInContext(sections.join('\n'), context, { filename: (revision || 'working tree') + ':save-adapter' });
  return {
    ...context.saveProbe,
    runStartingAutosave() {
      const pending = [...timers.values()].filter(timer => timer.delay === 1500);
      assert.equal(pending.length, 1, 'Published cartography must schedule its real boot autosave');
      pending[0].callback();
    },
  };
}

function currentSave() {
  const storage = new Map(), game = runtime(storage), account = game.account();
  account.world = 1;
  for (const [worldIndex, slotIndex] of [[0, 1], [1, 3]]) {
    const world = account.worlds[worldIndex], rider = game.fresh(), sword = 'sword-' + worldIndex;
    world.cur = world.main = slotIndex;
    world.slots[slotIndex] = Object.assign(rider, {
      name: 'Rider ' + worldIndex, path: 'warrior', tut: 3, g: 'done',
      horse: { owned: true, mounted: false },
      app: { body: 0, build:worldIndex===0?2:1,skin: 2, hair: 2, hc: 1, beard: 3, headStyle: 'm-moustache' },
      bank: { gold: 1432 + worldIndex, items: [{ id: 'bank-keepsake-' + worldIndex }] },
      inv: [{ id: sword, slot: 'weapon', w: 'swords', name: 'Iron short sword',
        tier: 2, rarity: 'common', stats: { dmg: 27 } }],
      eq: { weapon: sword }, done: { storyMilestone: true }, boss: { 1: 1 },
    });
    world.codex['world-keepsake-' + worldIndex] = 1;
    world.learning={v:1,rev:7+worldIndex,introduced:{select:true,sort:true},evidence:{},ready:{},recent:[]};
  }
  game.writeFixture(account);
  const stored = JSON.parse(storage.get(key));
  assert.equal(stored.v, 9);
  assert.equal(stored.world, 1);
  assert.deepEqual(stored.worlds.map(world => world.cur), [1, 3, -1]);
  for (const [index, world] of stored.worlds.slice(0, 2).entries()) {
    const rider = world.slots[world.cur];
    assert.equal(rider.v, 8);
    assert.match(rider.uid, /\S/);
    assert.equal(rider.name, 'Rider ' + index);
    assert.equal(rider.bank.gold, 1432 + index);
    assert.equal(rider.done.storyMilestone, true);
    assert.deepEqual(rider.horse, { owned: true, mounted: false });
    assert.equal(rider.app.headStyle, 'm-moustache');
    assert.equal(rider.app.build,index===0?2:1);
    assert.equal(rider.inv[0].equipment.v, 1);
    assert.equal(rider.inv[0].stats.dmg, 27);
  }
  return stored;
}

function persistentData(account) {
  return account.worlds.map(({cur, main, codex, slots}) => ({
    cur, main, codex,
    slots: slots.map(rider => {
      if (!rider) return null;
      const { v, uid, name, path, horse, app, bank, inv, eq, done, boss } = rider;
      return { v, uid, name, path, horse, app, bank, inv, eq, done, boss };
    }),
  }));
}

for (const release of releases) {
  test(`older reader ${release.slice(0, 7)} keeps both worlds through boot autosave`, () => {
    const written = currentSave(), storage = new Map([[key, JSON.stringify(written)]]);
    const old = runtime(storage, release);
    old.loadDevice();
    old.markStartingPosition();
    old.runStartingAutosave();
    const storedAgain = JSON.parse(storage.get(key));
    assert.ok(storedAgain.rev > written.rev, 'The old client must actually rewrite the same key');
    assert.equal(storedAgain.v, 9);
    assert.equal(storedAgain.world, 1);
    assert.deepEqual(persistentData(storedAgain), persistentData(written));
    for(let index=0;index<2;index++)assert.deepEqual(storedAgain.worlds[index].slots[storedAgain.worlds[index].cur].learningSnapshot,written.worlds[index].learning,'The real older writer preserves the character mirror');
    const current=runtime(storage);current.loadDevice();current.save();
    const restored=JSON.parse(storage.get(key));
    for(let index=0;index<2;index++)assert.deepEqual(restored.worlds[index].learning,written.worlds[index].learning,'Current reader restores canonical world learning');
    assert.deepEqual(persistentData(restored),persistentData(written));
  });
}

test('candidate character v9 drafts normalize to compatible v8 without losing data', () => {
  const compatible = currentSave(), draft = JSON.parse(JSON.stringify(compatible));
  for (const world of draft.worlds) {
    for (const rider of world.slots) if (rider) rider.v = 9;
  }
  const storage = new Map([[key, JSON.stringify(draft)]]), game = runtime(storage);
  game.loadDevice();
  game.save();
  const normalized = JSON.parse(storage.get(key));
  assert.ok(normalized.rev > draft.rev);
  assert.equal(normalized.v, 9);
  assert.equal(normalized.world, draft.world);
  assert.deepEqual(persistentData(normalized), persistentData(compatible));
});
