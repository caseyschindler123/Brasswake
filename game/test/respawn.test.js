const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/scene_b.js'), 'utf8');

function functionText(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0);
  let at = source.indexOf('{', start), depth = 1;
  for (at++; depth && at < source.length; at++) {
    if (source[at] === '{') depth++;
    if (source[at] === '}') depth--;
  }
  return source.slice(start, at);
}

function fixture(node = false) {
  const terr = { x: 10, y: 10, r: 1, rad: 7, tpl: 'b101' };
  const map = { w: 24, h: 24, seen: new Uint8Array(576).fill(1), solid: new Uint8Array(576).fill(1),
    keep: new Uint8Array(576), t: new Uint8Array(576), occ: new Map(), ents: [], respawn: [{ t: 0, node, terr }] };
  const host = { spawn: tpl => ({ tpl }), monName: () => 'Rat', matName: () => 'Ore' };
  let samples = 0;
  const math = Object.create(Math); math.random = () => { samples++; return .5; };
  const addEnt = (m, e) => { m.ents.push(e); m.occ.set(e.y * m.w + e.x, e); return e; };
  const advance = new Function('map', 'P', 'host', 'Math', 'addEnt', 'monSprite',
    ['freeNear', 'spawnMon', 'spawnNode', 'advanceRespawns'].map(functionText).join('\n') + '\nreturn advanceRespawns;')(
      map, { x: 1, y: 1 }, host, math, addEnt, () => null);
  return { map, terr, advance, samples: () => samples };
}

for (const node of [false, true]) test((node ? 'resource' : 'creature') + ' respawn retries unavailable placement without dropping or duplicating its slot', () => {
  const f = fixture(node), request = f.map.respawn[0];
  f.advance(.05);
  assert.equal(f.map.ents.length, 0);
  assert.equal(f.map.respawn[0], request);
  assert.equal(request.t, 1);
  const samples = f.samples(); assert.ok(samples > 0 && samples <= 200, 'bounded placement work');
  f.map.solid[10 * f.map.w + 10] = 0;
  f.advance(.5); assert.equal(f.map.ents.length, 0); assert.equal(f.samples(), samples);
  f.advance(.5);
  assert.equal(f.map.ents.length, 1); assert.equal(f.map.ents[0].terr, f.terr);
  assert.equal(f.map.ents[0].kind, node ? 'node' : 'mon');
  assert.equal(f.map.respawn.length, 0);
  f.advance(2); assert.equal(f.map.ents.length, 1);
});

test('a respawn keeps its normal delay and cannot occupy a protected tile', () => {
  const f = fixture(); f.map.respawn[0].t = 5;
  f.map.solid[10 * f.map.w + 10] = 0; f.map.keep[10 * f.map.w + 10] = 1;
  f.advance(4); assert.equal(f.samples(), 0); assert.equal(f.map.respawn[0].t, 1);
  f.advance(1); assert.equal(f.map.ents.length, 0); assert.equal(f.map.respawn.length, 1);
  f.map.keep[10 * f.map.w + 10] = 0;
  f.advance(1); assert.equal(f.map.ents.length, 1);
});
