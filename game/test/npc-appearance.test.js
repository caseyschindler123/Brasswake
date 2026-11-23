const test = require('node:test');
const assert = require('node:assert/strict');
const NPC = require('../src/npc_appearance');
const Content = require('../src/quests');

test('named characters retain one look across scenes and across world rebuilds', () => {
  const odalys = { kind: 'npc', name: 'Odalys Brine', r: 1, x: 28, y: 42 };
  assert.deepEqual(NPC.describe(odalys), NPC.describe({ ...odalys, kind: 'odalys', fs: 36, x: 6, y: 6 }));
  const looks = Content.FOLK.flat().map(([name], i) => NPC.describe({ kind: 'npc', name, r: (i / 3 | 0) + 1 }));
  assert.equal(new Set(looks.map(l => JSON.stringify(l))).size, looks.length);
  assert.ok(looks.some(l => l.combo <= 5));
  assert.ok(looks.some(l => l.combo > 5));
  assert.ok(looks.some(l => l.beard >= 0));
  assert.ok(looks.some(l => l.hat >= 0));
  assert.ok(looks.some(l => l.wkind === 'book'));
});

test('regional extras are deterministic and repeated job labels vary by placement', () => {
  const extras = Array.from({ length: 40 }, (_, i) => ({ kind: 'folk', r: 8, x: i + 1, y: 2, name: 'Porter' }));
  const looks = extras.map(NPC.describe);
  assert.deepEqual(extras.map(NPC.describe), looks);
  assert.ok(new Set(looks.map(l => JSON.stringify(l))).size >= 30);
  assert.equal(new Set(looks.map(l => l.skin)).size, 5);
  assert.equal(new Set(looks.map(l => l.cloth)).size, 8);
  assert.notDeepEqual(NPC.describe({ kind: 'ferry', r: 1, name: 'Ferryman', route: '1-2', side: 'from' }),
    NPC.describe({ kind: 'ferry', r: 2, name: 'Ferryman', route: '1-2', side: 'to' }));
});

test('human rendering excludes creature spawns, guards, stock, and creatures examined in town', () => {
  for (const kind of ['mon', 'guard', 'stock', 'keeper', 'dummy', 'landmark', 'corpse']) {
    assert.equal(NPC.describe({ kind, fs: 0, name: 'Tamsin' }), null);
  }
  const humans = Content.BOSSES.filter(b => NPC.describe({ ...b, kind: 'boss' }));
  assert.deepEqual(humans.map(b => b.r), [1, 8]);
});

test('movement and interaction can resolve every world direction and keep a stationary direction', () => {
  assert.deepEqual([[0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1]]
    .map(([x, y]) => NPC.direction(x * .3, y * 2)), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(NPC.direction(0, 0, 5), 5);
});

test('skin and clothing adjust only their painted areas and preserve alpha and boots', () => {
  const width = 80, pixels = new Uint8ClampedArray(width * 80 * 4);
  const put = (x, y, rgba) => pixels.set(rgba, (y * width + x) * 4);
  const get = (x, y) => Array.from(pixels.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
  const skin = [225, 169, 133, 255], cloth = [223, 201, 178, 160], boot = [213, 158, 120, 255];
  put(41, 17, skin);
  put(27, 42, skin);
  put(41, 31, cloth);
  put(40, 68, boot);
  put(42, 19, [255, 80, 1, 0]);
  NPC.tintBody(pixels, width, [12, 40, 9], 1, [74, 106, 149], 4);
  assert.deepEqual(get(41, 17), [110, 69, 47, 255]);
  assert.deepEqual(get(27, 42), [110, 69, 47, 255]);
  assert.ok(get(41, 31)[2] > get(41, 31)[0]);
  assert.equal(get(41, 31)[3], 160);
  assert.deepEqual(get(40, 68), boot);
  assert.deepEqual(get(42, 19), [255, 80, 1, 0]);
});
