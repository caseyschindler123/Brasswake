const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Dungeons = require('../src/dungeons');
const InteractionRules = require('../src/interaction_rules');
const Movement = require('../src/movement');

const actor = (fx, fy, props = {}) => ({ x: Math.round(fx), y: Math.round(fy), fx, fy, ...props });
function grid(w = 12, h = 12) {
  return { w, h, solid: new Uint8Array(w * h), t: new Uint8Array(w * h), occ: new Map() };
}
const inReach = (p, e, map) => Number.isFinite(InteractionRules.distance(p, e, map));

test('contact follows the visible feet on both sides of a tile boundary', () => {
  const map = grid(), rival = actor(3.15, 2, { x: 4, solid: 1 });
  map.occ.set(2 * map.w + 4, rival);
  const hero = actor(1.9, 2);
  assert.ok(inReach(hero, rival, map));
  rival.fx = 3.3;
  assert.equal(inReach(hero, rival, map), false);
  assert.ok(inReach(actor(2.45, 2), rival, map));
  map.occ.set(2 * map.w + 3, actor(3, 2));
  assert.equal(inReach(hero, rival, map), false);
  assert.equal(inReach(actor(2 - InteractionRules.reach - .001, 4), actor(2, 4), map), false);
});

test('an open fractional diagonal works and either blocked side prevents corner interaction', () => {
  const map = grid(), hero = actor(3.3, 3.3), npc = actor(4, 4);
  assert.ok(inReach(hero, npc, map));
  map.solid[3 * map.w + 4] = 1;
  assert.equal(inReach(hero, npc, map), false);
  map.solid[3 * map.w + 4] = 0;
  map.solid[4 * map.w + 3] = 1;
  assert.equal(inReach(hero, npc, map), false);
  assert.ok(inReach(actor(4, 3), npc, map));
});

test('water can be a fishing endpoint but cannot act as a shortcut to another target', () => {
  const map = grid(), hero = actor(1.45, 2), fish = actor(2, 2, { kind: 'fish' });
  map.solid[2 * map.w + 2] = 1;
  assert.equal(inReach(hero, fish, map), false);
  map.t[2 * map.w + 2] = 4;
  assert.ok(inReach(hero, fish, map));
  assert.equal(inReach(hero, actor(2, 2), map), false);
  assert.equal(inReach(hero, actor(2.55, 2), map), false);
});

test('a gate can be inspected from its end while secret controls use their own anchor', () => {
  const map = grid(), cells = [[3, 4], [4, 4], [5, 4]];
  for (const [x, y] of cells) map.solid[y * map.w + x] = 1;
  const gate = actor(4, 4, { kind: 'dgate', cells }), secret = actor(3, 3, { kind: 'dsecret', cells });
  assert.ok(inReach(actor(5, 5), gate, map));
  assert.ok(inReach(actor(5, 3), gate, map));
  assert.equal(inReach(actor(5, 5), secret, map), false);
  assert.ok(inReach(actor(2, 3), secret, map));
  map.occ.set(4 * map.w + 5, actor(5, 4));
  assert.equal(inReach(actor(5, 5), gate, map), false);
});

test('every built dungeon ascent works from each of its three landing cells', () => {
  for (let region = 1; region <= 8; region++) {
    for (let floor = 0; Dungeons.floor(region, floor); floor++) {
      const layout = Dungeons.build(region, floor), map = grid(layout.w, layout.h);
      map.solid = layout.tiles.map(tile => tile === Dungeons.WALL || tile === Dungeons.WATER || tile === Dungeons.HAZARD);
      const up = layout.entities.find(e => e.kind === 'dtravel' && e.support);
      const stairs = actor(up.x, up.y, up);
      map.occ.set(up.y * map.w + up.x, stairs);
      const faces = InteractionRules.faces(stairs);
      assert.equal(faces.length, 3, up.id);
      for (const [x, y] of faces) {
        assert.ok(inReach(actor(x, y + 1), stairs, map), `${up.id} at ${x},${y + 1}`);
        assert.equal(inReach(actor(x, y + 2), stairs, map), false, up.id);
      }
    }
  }
});

function keyboardFixture() {
  const window = new EventTarget(), document = new EventTarget();
  const element = () => Object.assign(new EventTarget(), {
    style: { setProperty() {} }, dataset: {}, append() {}, setAttribute() {}
  });
  document.createElement = element;
  document.activeElement = element();
  const p = { ...actor(5, 5), path: [] };
  const host = { inputBlocked: () => fixture.modal };
  const source = fs.readFileSync(path.join(__dirname, '../src/scene_controls.js'), 'utf8');
  const direction = new Function('window', 'document', 'Movement', 'host', 'P', 'el',
    `let running = true, map = {}, locked = false, near = null;
      const blocked = () => false;
      ${source}
      initSceneControls(el);
      return manualMovement;`)(window, document, Movement, host, p, element());
  const fixture = {
    direction, document, window, p, modal: false,
    key(type, key, props = {}) {
      const event = Object.assign(new Event(type, { cancelable: true }), { key, ...props });
      window.dispatchEvent(event);
      return event;
    }
  };
  return fixture;
}

test('held WASD/arrow movement stops on keyup, blur and modal entry without restarting on repeats', () => {
  const f = keyboardFixture();
  for (const [arrow, letter, direction] of [['ArrowUp', 'W', [0, -1]], ['ArrowDown', 's', [0, 1]],
    ['ArrowLeft', 'a', [-1, 0]], ['ArrowRight', 'd', [1, 0]]]) {
    for (const key of [arrow, letter]) {
      assert.equal(f.key('keydown', key).defaultPrevented, true);
      assert.deepEqual(f.direction(), direction);
      f.key('keyup', key.toLowerCase() === 'w' ? 'w' : key);
      assert.equal(f.p.manual, false);
      assert.equal(f.direction(), null);
    }
  }
  f.key('keydown', 'd');
  assert.deepEqual(f.direction(), [1, 0]);
  f.window.dispatchEvent(new Event('blur'));
  f.key('keydown', 'd', { repeat: true });
  assert.equal(f.direction(), null);
  f.key('keyup', 'd');
  f.key('keydown', 'ArrowLeft');
  assert.deepEqual(f.direction(), [-1, 0]);
  f.modal = true;
  assert.equal(f.direction(), undefined);
  f.modal = false;
  assert.equal(f.direction(), null);
});

test('editing controls and contenteditable descendants retain keyboard events', () => {
  const f = keyboardFixture();
  for (const editTarget of [
    ...['input', 'textarea', 'select'].map(tag => ({ closest: selector => selector.includes(tag) ? {} : null })),
    { isContentEditable: true }
  ]) {
    f.document.activeElement = editTarget;
    assert.equal(f.key('keydown', 'w').defaultPrevented, false);
    assert.equal(f.key('keydown', 'ArrowLeft').defaultPrevented, false);
    assert.equal(f.direction(), null);
  }
});
