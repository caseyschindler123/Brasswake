const test = require('node:test');
const assert = require('node:assert/strict');
const Gear = require('../src/equipment_rules');
const View = require('../src/equipment_view');

const pixels = (...values) => new Uint8ClampedArray(values.flat());
const rgb = (value, index) => Array.from(value.slice(index * 4, index * 4 + 3));
const brightness = value => value.reduce((sum, channel) => sum + channel, 0);

test('metal finishes preserve skin, warm grips and alpha while remapping painted shading', () => {
  const source = pixels([56, 57, 59, 255], [128, 128, 128, 140], [197, 199, 204, 255], [251, 251, 251, 255],
    [155, 111, 78, 255], [116, 77, 50, 173], [84, 58, 38, 255], [72, 71, 72, 0]);
  const painted = View.tintPixels(source.slice(), Gear.MATERIALS.moonsteel.palette);
  for (const index of [4, 5, 6, 7]) assert.deepEqual(rgb(painted, index), rgb(source, index));
  for (let i = 3; i < source.length; i += 4) assert.equal(painted[i], source[i]);
  assert.notDeepEqual(rgb(painted, 1), rgb(source, 1));
  assert.ok(rgb(painted, 1)[2] > rgb(painted, 1)[0]);
  assert.ok(brightness(rgb(painted, 0)) < brightness(rgb(painted, 1)));
  assert.ok(brightness(rgb(painted, 1)) < brightness(rgb(painted, 2)));
  assert.ok(rgb(painted, 3).every(channel => channel >= 247));
  assert.notDeepEqual(rgb(View.tintPixels(source.slice(), Gear.MATERIALS.iron.palette), 1), rgb(painted, 1));
});

test('wood and leather tint brown surfaces while bounds and masks protect surrounding layers', () => {
  const brown = [115, 83, 51, 205];
  const source = pixels(brown, brown, brown, brown, brown, brown);
  const wood = View.tintPixels(source.slice(), Gear.MATERIALS.blackwood.palette, 'wood', {
    width: 3, bounds: [1, 0, 2, 2], exclude: [[2, 0, 1, 1]], mask: (_x, _y, i) => i === 4 ? 0 : 1,
  });
  for (const i of [0, 2, 3, 4]) assert.deepEqual(rgb(wood, i), rgb(source, i));
  assert.notDeepEqual(rgb(wood, 1), rgb(source, 1));
  assert.deepEqual(rgb(wood, 1), rgb(wood, 5));
  const leather = View.tintPixels(source.slice(), Gear.MATERIALS.laminated.palette, 'leather', { mask: [255, 0, 0, 0, 0, 0] });
  assert.notDeepEqual(rgb(leather, 0), rgb(source, 0));
  assert.deepEqual(rgb(leather, 1), rgb(source, 1));
});

test('cloth recolors off-white paint and protects leather and bright skin', () => {
  const source = pixels([208, 200, 179, 255], [82, 45, 30, 255], [223, 169, 127, 255]);
  const colored = View.tintPixels(source.slice(), Gear.MATERIALS.silk.palette, 'cloth');
  assert.notDeepEqual(rgb(colored, 0), rgb(source, 0));
  assert.deepEqual(rgb(colored, 1), rgb(source, 1));
  assert.deepEqual(rgb(colored, 2), rgb(source, 2));
  assert.deepEqual(View.tintPixels(source.slice(), { shadow: '#333', mid: 'invalid', light: '#fffff0' }), source);
});
