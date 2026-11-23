const assert = require('node:assert/strict');
const { test } = require('node:test');
const Content = require('../src/quests');
const { specialists, ferryDestination } = require('../src/world_services');

test('each Grand Market specialist offers a distinct set of supported goods', () => {
  assert.deepEqual(specialists.map(s => s.name), [
    'Weaponsmith', 'Armourer', 'Fletcher', 'Bookseller', 'Apothecary', 'Baker',
    'Fishmonger', 'Clothier', 'Carpenter', 'Stonemason', 'Jeweller', 'Provisioner',
  ]);
  const signatures = specialists.map(({ gear, pages, sells, tonic, materials, mats }) => {
    assert.ok(gear || pages || sells || tonic || materials || mats);
    for (const key of sells || []) assert.ok(Content.FOOD[key], key);
    for (const id of materials || []) assert.ok(Content.HMAT[id], String(id));
    for (const [slot, skill] of gear || []) {
      assert.ok(['weapon', 'armor', 'shield', 'cloak', 'ring', 'charm'].includes(slot), slot);
      if (skill) assert.ok(slot === 'weapon' && ['swords', 'fencing', 'archery'].includes(skill));
    }
    return JSON.stringify({ gear, pages, sells, tonic, materials, mats });
  });
  assert.equal(new Set(signatures).size, 12);
  assert.deepEqual(specialists[2].gear.map(([, skill]) => skill), ['archery', 'archery']);
  assert.deepEqual(specialists[8].materials, [1, 2]);
  assert.deepEqual(specialists[9].materials, [0]);
});

test('a ferry is bidirectional from its actual terminal and requires cardinal adjacency', () => {
  const trip = { id: 'test', from: { r: 1, at: [5, 8] }, to: { r: 2, at: [15, 18] } };
  const from = { kind: 'ferry', route: trip.id, side: 'from', x: 5, y: 8, r: 1 };
  const to = { kind: 'ferry', route: trip.id, side: 'to', x: 15, y: 18, r: 2 };
  assert.equal(ferryDestination([trip], from, [5, 9]), trip.to);
  assert.equal(ferryDestination([trip], to, [14, 18]), trip.from);
  for (const point of [[4, 9], [5, 8], [5, 10], [14, 18], null]) {
    assert.equal(ferryDestination([trip], from, point), null);
  }
  for (const mismatch of [{ side: 'to' }, { side: 'ship' }, { route: 'other' }, { r: 2 }, { kind: 'folk' }]) {
    assert.equal(ferryDestination([trip], { ...from, ...mismatch }, [5, 9]), null);
  }
});
