const test = require('node:test');
const assert = require('node:assert/strict');
const Heads = require('../src/head_portraits');
const Art = require('../src/artheads');

test('curated styles are distinct and retain stable saved appearance IDs', () => {
  assert.deepEqual(Heads.STYLES.map(choices => choices.length), [12, 12]);
  assert.equal(new Set(Heads.STYLES.flat().map(choice => choice.id)).size, 24);
  for (const body of [0, 1]) for (const { id, hair, beard } of Heads.styles(body)) {
    assert.equal(Heads.match(body, hair, beard), id);
  }
  assert.equal(Heads.match(0, -1, 5), 'm-bald-beard');
  assert.equal(Heads.match(1, 9, -1), 'f-neat');
  assert.equal(Heads.match(1, 11, 3), 'f-two-braids');
  assert.equal(Heads.match(2, 0, 0), null);
});

test('face anchors stay fixed across wider hair silhouettes', () => {
  const top = 12, center = 149, width = 43;
  for (const [body, data] of Art.entries()) for (const item of data.styles) {
    const [left, sourceY, w, h] = item.rect;
    const [sourceCenter, sourceTop, faceWidth, heightUnit] = item.anchor;
    const [x, y, renderWidth, renderHeight] = Heads.geometry(body, item.id, [top, center, width]);
    assert.ok(w > 100 && h > 150);
    assert.ok(left >= 0 && sourceY >= 0 && left + w <= 1152 && sourceY + h <= 768);
    assert.ok(Math.abs(x + (sourceCenter - left) * renderWidth / w - center) < 1e-9);
    assert.ok(Math.abs(y + (sourceTop - sourceY) * renderHeight / h - top) < 1e-9);
    assert.ok(Math.abs(renderWidth / w * faceWidth - width) < 1e-9);
    assert.ok(Math.abs(renderHeight / h * heightUnit - width) < 1e-9);
  }
  assert.ok(Heads.geometry(1, 'f-wavy', [top, center, width])[2] > Heads.geometry(1, 'f-bald', [top, center, width])[2]);
  assert.equal(Heads.geometry(0, 'm-bald', [top, center, 0]), null);
});

test('skin and hair color treatments preserve the rest of the same painted image', () => {
  const style = { hair: 0, beard: -1, rect: [0, 0, 3, 7], anchor: [1, 0, 4, 4] };
  const sample = new Uint8ClampedArray(3 * 7 * 4);
  const at = y => (y * 3 + 1) * 4;
  sample.set([112, 81, 53, 238], at(0));
  sample.set([210, 163, 127, 255], at(3));
  sample.set([190, 141, 106, 255], at(6));
  const pair = ['#2e1c10', '#8f5e34'];
  const pale = Heads.tintPixels(sample.slice(), style, 1, pair);
  const deeper = Heads.tintPixels(sample.slice(), style, 4, pair);
  const silver = Heads.tintPixels(sample.slice(), style, 1, ['#8c8c8c', '#ffffff']);
  assert.deepEqual(pale.slice(at(0), at(0) + 4), deeper.slice(at(0), at(0) + 4));
  assert.ok(silver[at(0)] > pale[at(0)]);
  assert.deepEqual(pale.slice(at(3), at(3) + 4), silver.slice(at(3), at(3) + 4));
  assert.ok(deeper[at(3)] < pale[at(3)]);
  assert.equal(deeper[at(3) + 3], 255);
  assert.equal(pale[at(6) + 3], 0);
  assert.equal(silver[0], 0);
});

test('moustache and ponytail colors leave the jaw and exposed neck alone', () => {
  const style = { hair: 3, beard: 3, rect: [0, 0, 7, 10], anchor: [3, 0, 6, 6] };
  const sample = new Uint8ClampedArray(7 * 10 * 4);
  const at = (x, y) => (y * 7 + x) * 4;
  sample.set([110, 68, 40, 255], at(3, 5));
  sample.set([126, 84, 56, 255], at(1, 7));
  sample.set([140, 95, 66, 255], at(3, 8));
  const base = Heads.tintPixels(sample.slice(), style, 4);
  const auburn = Heads.tintPixels(sample.slice(), style, 4, ['#3c1608', '#c4602c']);
  assert.notDeepEqual(base.slice(at(3, 5), at(3, 5) + 4), auburn.slice(at(3, 5), at(3, 5) + 4));
  for (const [x, y] of [[1, 7], [3, 8]]) {
    assert.deepEqual(base.slice(at(x, y), at(x, y) + 4), auburn.slice(at(x, y), at(x, y) + 4));
  }
});
