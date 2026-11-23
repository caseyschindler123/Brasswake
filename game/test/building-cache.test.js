const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../src/building_cache');

const canvas = (width = 10, height = 10) => ({ width, height });
const empty = () => ({ floor: canvas(), roof: canvas(), walls: [], furniture: [] });
const fail = () => assert.fail('Expected a cached view');

test('a whole city traversal keeps the backing estimate bounded with least-recent-first eviction', () => {
  const budget = 32 * 1024 * 1024, cache = create(budget);
  const owners = Array.from({ length: 70 }, () => ({}));
  const building = () => ({ floor: canvas(432, 384), roof: canvas(432, 384),
    walls: Array.from({ length: 24 }, () => ({ image: canvas(48, 120) })),
    furniture: [{ image: canvas(65, 81) }],
  });
  let first;
  for (const owner of owners) {
    cache.beginFrame();
    const view = cache.get(owner, 1, building);
    if (!first) first = view;
    cache.endFrame();
    assert.equal(owner.view, view);
    assert.equal(owner.viewVersion, 1);
    assert.ok(cache.stats().bytes <= budget);
  }
  assert.equal(owners[0].view, null);
  for (const layer of [first.floor, first.roof, first.walls[0].image, first.furniture[0].image]) {
    assert.deepEqual(layer, { width: 0, height: 0 });
  }
  assert.ok(cache.stats().views < owners.length);

  const small = create(1600), a = {}, b = {}, c = {};
  small.beginFrame(); small.get(a, 1, empty); small.get(b, 1, empty); small.endFrame();
  small.beginFrame(); small.get(a, 1, fail); small.endFrame();
  small.beginFrame(); small.get(c, 1, empty); small.endFrame();
  assert.deepEqual([!!a.view, !!b.view, !!c.view], [true, false, true]);
});

test('visible buildings stay live even when they alone exceed the budget', () => {
  const cache = create(900), a = {}, b = {}, c = {};
  cache.beginFrame();
  cache.get(a, 1, empty); cache.get(b, 1, empty);
  cache.endFrame();
  assert.equal(cache.stats().bytes, 1600);
  assert.ok(a.view.floor.width && b.view.floor.width);

  cache.beginFrame();
  cache.get(c, 1, empty);
  cache.endFrame();
  assert.deepEqual(cache.stats(), { budgetBytes: 900, bytes: 800, views: 1, canvases: 2 });
  assert.equal(a.view, null);
  assert.equal(b.view, null);
  assert.equal(c.view.floor.width, 10);
});

test('an art-version change releases old views after any frame already using them', () => {
  const cache = create(3200), a = {}, b = {};
  cache.beginFrame();
  const prior = cache.get(a, 1, empty);
  cache.get(b, 1, empty);
  const replacement = cache.get(a, 2, empty);
  assert.equal(b.view, null);
  assert.equal(prior.floor.width, 10);
  assert.equal(a.viewVersion, 2);
  cache.endFrame();

  assert.equal(prior.floor.width, 0);
  assert.equal(a.view, replacement);
  assert.equal(replacement.floor.width, 10);
  assert.equal(cache.stats().bytes, 800);
  const next = cache.get(a, 3, empty);
  assert.equal(replacement.roof.width, 0);
  assert.equal(cache.get(a, 3, fail), next);
});

test('shared canvases count only once and retain dimensions until the last user leaves', () => {
  const cache = create(400), shared = canvas(), a = {}, b = {}, c = {};
  const view = () => ({ floor: shared, roof: shared, walls: [{ image: shared }], furniture: [{ image: shared }] });
  cache.beginFrame();
  cache.get(a, 0, view); cache.get(b, 0, view);
  cache.endFrame();
  assert.deepEqual(cache.stats(), { budgetBytes: 400, bytes: 400, views: 2, canvases: 1 });

  cache.beginFrame();
  cache.get(b, 0, fail); cache.get(c, 0, empty);
  cache.endFrame();
  assert.equal(a.view, null);
  assert.equal(shared.width, 10);
  assert.equal(cache.stats().bytes, 1200);

  cache.beginFrame();
  cache.endFrame();
  assert.equal(shared.width, 0);
  assert.equal(cache.stats().bytes, 0);
});
