const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shallows } = require('../src/water_depth');
test('natural banks have a narrow shallow fringe while open water remains deep', () => {
  const map = { w: 12, h: 10, t: new Uint8Array(120).fill(4) };
  for (let y = 0; y < 10; y++) map.t[y * 12] = 5;
  const mask = shallows(map);
  assert.equal(mask[5 * 12 + 1], 1);
  assert.equal(mask[5 * 12 + 2], 1);
  assert.equal(mask[5 * 12 + 3], 0);
  assert.equal(mask[5 * 12], 0);
});
test('plank piers, paved quays and artificial surfaces preserve deep harbour water', () => {
  const map = { w: 12, h: 10, t: new Uint8Array(120).fill(4), surface: new Uint8Array(120) };
  for (let y = 2; y < 8; y++) { map.t[y * 12 + 5] = 6; map.t[y * 12 + 8] = 3; }
  map.t[3 * 12 + 1] = 0; map.surface[3 * 12 + 1] = 1;
  assert.equal(shallows(map).some(Boolean), false);
  map.surface[3 * 12 + 1] = 0;
  const shore = shallows(map);
  assert.equal(shore[3 * 12 + 2], 1);
  assert.equal(shore[5 * 12 + 6], 0);
});
