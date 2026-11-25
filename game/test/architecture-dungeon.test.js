const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Dungeons = require('../src/dungeons.js');

const scene = fs.readFileSync(path.join(__dirname, '../src/scene_dungeon.js'), 'utf8');

function harness() {
  const art = new Map();
  function canvas(width, height) {
    const draws = [], stack = [];
    let clip, rect, rotation = 0;
    const g = {
      save() { stack.push({clip, rotation}); },
      restore() { ({clip, rotation} = stack.pop()); },
      beginPath() { rect = null; },
      rect(...bounds) { rect = bounds; },
      clip() { clip = rect; },
      rotate(angle) { rotation += angle; },
      translate() {},
      scale() {},
      createRadialGradient() { return {addColorStop() {}}; },
      fillRect() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      drawImage(source, ...args) { draws.push({source, args, clip, rotation}); }
    };
    return {width, height, draws, getContext: () => g};
  }
  const context = vm.createContext({
    CS: 16, T: 16, K: 3, TS: 48, mk: canvas,
    lw: c => c.width / 3, lh: c => c.height / 3,
    architecturePiece: (r, name) => art.get(r + ':' + name),
    host: {}, Dungeons
  });
  const api = vm.runInContext(scene + '\n({dungeonPaint,dungeonDress,dungeonTravelArt,dungeonRespawn})', context);
  return {art, canvas, ...api};
}

test('painted stairs select an adult-scale ascent or descent at every authored travel anchor', () => {
  const h = harness();
  assert.equal(h.dungeonTravelArt({kind: 'dtravel', r: 1, floor: 0, to: -1}), null);
  let checked = 0;
  for (let r = 1; r <= 8; r++) {
    const up = h.canvas(180, 192), down = h.canvas(200, 98);
    h.art.set(r + ':stairs_up', up);
    h.art.set(r + ':stairs_down', down);
    const surface = h.dungeonTravelArt({kind: 'stairs', r});
    assert.equal(surface.source, down);
    for (const {f} of Dungeons.get(r).floors) {
      const {tiles, w, entities} = Dungeons.build(r, f);
      for (const anchor of entities.filter(e => e.kind === 'dtravel')) {
        const ascending = anchor.to < f;
        const sprite = h.dungeonTravelArt({...anchor, floor: f});
        assert.equal(sprite.source, ascending ? up : down);
        assert.equal(sprite.c.hr, 1);
        assert.equal(sprite.ax, sprite.c.width / 6);
        assert.equal(sprite.ay, sprite.c.height / 3);
        assert.equal(sprite.c.height, ascending ? 132 : 74);
        assert.equal(sprite.c.width, ascending ? 124 : 150);
        assert.equal(sprite.c.draws[0].source, sprite.source);
        assert.equal(h.dungeonTravelArt({...anchor, floor: f}), sprite);
        if (!ascending) assert.equal(sprite, surface);
        for (let dy = -2; dy <= 0; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            assert.equal(tiles[(anchor.y + dy) * w + anchor.x + dx], Dungeons.FLOOR);
          }
        }
        checked++;
      }
    }
  }
  assert.equal(checked, 48);
});

test('painted faces, returns and display trim are clipped to authored solid cells across chunk boundaries', () => {
  const h = harness();
  for (let r = 1; r <= 8; r++) {
    const face = h.canvas(192, 96), coping = h.canvas(192, 24);
    h.art.set(r + ':dungeon_face', face);
    h.art.set(r + ':dungeon_coping', coping);
    const w = 32, dt = new Uint8Array(w * w);
    for (let y = 3; y <= 10; y++) dt.fill(Dungeons.FLOOR, y * w + 6, y * w + 25);
    dt[9 * w + 17] = Dungeons.WATER;
    dt[9 * w + 18] = Dungeons.BRIDGE;
    const solid = Uint8Array.from(dt, tile => +(tile === Dungeons.WALL || tile === Dungeons.WATER));
    const props = [{x: 16, y: 12, recess: {x: 16, y: 11, side: 'south'}}, {x: 20, y: 2, wallDisplay: 1}];
    const map = {r, f: 0, w, h: w, dt, solid, props, layout: {theme: Dungeons.themes[r], rooms: []}};
    const before = dt.slice(), beforeSolid = solid.slice();
    const halves = [0, 16].map(offset => {
      const c = h.canvas(768, 768);
      h.dungeonPaint(map, c.getContext('2d'), offset, 0);
      for (const draw of c.draws) {
        assert.ok(draw.clip, 'each painted piece is clipped before projection');
        const [x, y, width, height] = draw.clip;
        assert.equal(width, 48);
        assert.equal(height, 48);
        assert.ok(x / 48 >= offset && x / 48 < offset + 16);
        assert.equal(dt[y / 48 * w + x / 48], Dungeons.WALL);
        assert.ok(draw.source === face || draw.source === coping);
      }
      assert.ok(c.draws.some(d => d.source === face && d.args.at(-1) === 39));
      assert.ok(c.draws.some(d => d.source === face && d.args.at(-1) === 27));
      assert.ok(c.draws.some(d => d.source === face && d.args.at(-1) === 87));
      return c.draws;
    });
    assert.ok(halves[0].some(d => d.source === coping && d.rotation > 0));
    assert.ok(halves[1].some(d => d.source === coping && d.rotation < 0));
    const roof = d => d.source === coping && d.args.at(-2) === 118 && d.args.at(-1) === 7;
    assert.deepEqual(halves[0].find(roof).args, halves[1].find(roof).args);
    const shoulder = (draw, x) => draw.source === face && draw.args.slice(4).join(',') === [x, 11 * 48 + 3, 15, 87].join(',');
    assert.ok(halves[0].some(d => shoulder(d, 15 * 48)), 'left shoulder reaches the solid-cell edge');
    assert.ok(halves[1].some(d => shoulder(d, 18 * 48 - 15)), 'right shoulder reaches the solid-cell edge');
    assert.ok(halves[1].some(d => d.source === coping && d.args.slice(4).join(',') === [20 * 48 + 1, 2 * 48 + 4, 46, 6].join(',')),
      'the narrow north display is supported by the surrounding coping');
    assert.deepEqual(dt, before);
    assert.deepEqual(solid, beforeSolid);
  }
});

test('far-wall purpose props stay in their supporting masonry across the authored floors', () => {
  const h = harness();
  let northDisplays = 0;
  for (let r = 1; r <= 8; r++) {
    for (const {f} of Dungeons.get(r).floors) {
      const layout = Dungeons.build(r, f);
      const displays = h.dungeonDress(layout,r).filter(p => p.wallDisplay);
      assert.ok(displays.length > 0);
      for (const display of displays) {
        const i = display.y * layout.w + display.x;
        assert.equal(layout.tiles[i], Dungeons.WALL);
        assert.equal(layout.tiles[i + layout.w], Dungeons.FLOOR);
        const width = 48 * display.sc, height = 40 * display.sc, top = 14 - 38 * display.sc;
        assert.ok(width <= 16 && top >= 0 && top + height <= 16);
        assert.equal(display.hang, 1);
        northDisplays++;
      }
    }
  }
  assert.ok(northDisplays >= 28);
});

test('late painted wall art replaces fallback dungeon chunks once both pieces load', () => {
  const h = harness(), map = {dungeonFloor: true, r: 1, chunks: new Map()};
  h.dungeonRespawn(map);
  const fallback = h.canvas(48, 48);
  map.chunks.set(42, fallback);
  h.art.set('1:dungeon_face', h.canvas(192, 96));
  h.dungeonRespawn(map);
  assert.equal(map.chunks.get(42), fallback);
  h.art.set('1:dungeon_coping', h.canvas(192, 24));
  h.dungeonRespawn(map);
  assert.equal(map.chunks.size, 0);
  const painted = h.canvas(48, 48);
  map.chunks.set(42, painted);
  h.dungeonRespawn(map);
  assert.equal(map.chunks.get(42), painted);
});
