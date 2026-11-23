const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/dungeon_progress');
const Dungeons = require('../src/dungeons');
test('seals and keeper gate a vault; repeat claims cannot pay twice', () => {
  const s={},p=P.ensure(s,1,'day1');
  P.defeat(p,{id:'a',lieutenant:true,floor:0},1000);
  assert.equal(P.canVault(p,3),false);
  P.defeat(p,{id:'b',lieutenant:true,floor:1},1000);
  assert.equal(P.canVault(p,3),false);
  P.defeat(p,{id:'keeper',kind:'keeper'},1000);
  assert.equal(P.canVault(p,3),true);
  assert.equal(P.claim(p,'vault'),true);assert.equal(P.claim(p,'vault'),false);
});
test('a new day resets rewards and seals while retaining discoveries and doors',()=>{
  const s={},p=P.ensure(s,2,'day1');p.seen[0]=[2,3];p.gates.bridge=true;p.lore.note=true;p.kills.guard=100;
  p.claimed.vault=true;p.seals[0]=true;p.keeper=true;
  const q=P.ensure(s,2,'day2');assert.deepEqual(q.seen[0],[2,3]);assert.equal(q.gates.bridge,true);assert.equal(q.lore.note,true);assert.equal(q.kills.guard,100);
  assert.deepEqual(q.seals,{});assert.deepEqual(q.claimed,{});assert.equal(q.keeper,false);
});
test('ordinary and important enemies respect separate respawn timers',()=>{
  const p=P.ensure({},1,'today');p.kills.mon=100;p.kills.boss=100;
  assert.equal(P.alive(p,{id:'mon'},300099),false);assert.equal(P.alive(p,{id:'mon'},300100),true);
  assert.equal(P.alive(p,{id:'boss',lieutenant:true},300100),false);assert.equal(P.alive(p,{id:'boss',lieutenant:true},900100),true);
});
test('saved positions reject walls, occupied tiles and malformed coordinates',()=>{
 const m={w:3,h:2,tiles:new Uint8Array([0,1,1,0,1,4]),entities:[{x:1,y:0}]};
 for(const p of [[0,0],[1,0],[4,2],[1.2,1],null])assert.equal(P.validPosition(m,p),false);
 assert.equal(P.validPosition(m,[1,1]),true);assert.equal(P.validPosition(m,[2,1]),true);
});
test('saved positions honor opened doors and reject closed door cells',()=>{
 const m={w:3,h:2,tiles:new Uint8Array([1,1,1,1,1,1]),entities:[{id:'door',kind:'dgate',x:1,y:0,cells:[[1,0],[1,1]]}]};
 const p={gates:{},kills:{}};
 assert.equal(P.validPosition(m,[1,1],p),false);p.gates.door=true;
 assert.equal(P.validPosition(m,[1,0],p),true);assert.equal(P.validPosition(m,[1,1],p),true);
});

test('legacy discovery indices and compact discovery strings restore the same explored cells', () => {
  const indices = [19, 0, 6, 5, 19, 11, 12];
  const expected = Uint8Array.from({ length: 40 }, (_, i) => indices.includes(i) ? 1 : 0);
  const fromLegacy = P.unpackSeen(indices, expected.length);
  assert.deepEqual(fromLegacy, expected);

  const packed = P.packSeen(fromLegacy);
  assert.match(packed, /^b1:[A-Za-z0-9_-]{4}$/);
  assert.deepEqual(P.unpackSeen(packed, 40), expected);
  assert.deepEqual(P.unpackSeen(packed, 6), expected.slice(0, 6));
  assert.equal(P.packSeen(new Uint8Array(40)), 'b1:');
  assert.deepEqual(P.unpackSeen('b1:', 40), new Uint8Array(40));
});

test('malformed discovery input cannot create out-of-range cells or unbounded allocations', () => {
  const legacy = [2, 4, -1, 1.5, '1', 100, Infinity, Number.MAX_SAFE_INTEGER];
  assert.deepEqual(P.unpackSeen(legacy, 5), Uint8Array.of(0, 0, 1, 0, 1));
  for (const saved of [null, {}, 'b2:BBBB', 'b1:B!A', 'unversioned']) {
    assert.deepEqual(P.unpackSeen(saved, 20), new Uint8Array(20));
  }
  assert.equal(P.unpackSeen([], Number.MAX_SAFE_INTEGER).length, 512 * 512);
  assert.equal(P.unpackSeen([], Infinity).length, 0);

  const character = { dungeons: { 1: { seen: { 0: [2, Number.MAX_SAFE_INTEGER] } } } };
  P.compact(character, 1);
  const cleaned = character.dungeons[1].seen[0];
  assert.equal(cleaned.length, 4);
  assert.deepEqual(P.unpackSeen(cleaned, 4), Uint8Array.of(0, 0, 1, 0));
});

test('compaction touches every region while preserving live loot, visits and reward state', () => {
  const now = 10000;
  const character = { dungeon: { r: 8, f: 1 }, dungeons: {} };
  const first = P.ensure(character, 1, 'today');
  const last = P.ensure(character, 8, 'today');
  const live = { until: now + 1, x: 10, y: 12, loot: { gold: 102, items: [{ id: 'blade' }] } };
  first.seen = { 0: [3, 99] };
  first.bodies = { expired: { until: now - 1 }, live };
  first.kills.expired = 7;
  last.seen = { 1: [17], 3: P.packSeen(Uint8Array.of(0, 1)) };
  last.bodies = { expired: { until: now }, invalid: null };
  last.gates.vault = true;
  last.claimed.vault = true;

  assert.equal(P.compact(character, now), character);
  assert.equal(P.unpackSeen(first.seen[0], 100)[99], 1);
  assert.equal(P.unpackSeen(last.seen[1], 18)[17], 1);
  assert.deepEqual(P.unpackSeen(last.seen[3], 2), Uint8Array.of(0, 1));
  assert.deepEqual(first.bodies, { live });
  assert.equal(first.bodies.live, live);
  assert.deepEqual(last.bodies, {});
  assert.equal(first.kills.expired, 7);
  assert.equal(last.gates.vault, true);
  assert.equal(last.claimed.vault, true);
  assert.deepEqual(character.dungeon, { r: 8, f: 1 });
  const after = JSON.stringify(character);
  P.compact(character, now);
  assert.equal(JSON.stringify(character), after);
});

test('five fully explored characters fit below one MiB of UTF-16 save storage', () => {
  const regions = Array.from({ length: 8 }, (_, i) => Dungeons.get(i + 1));
  const slots = Array.from({ length: 5 }, () => {
    const character = {};
    for (const { r, floors } of regions) {
      const progress = P.ensure(character, r, 'today');
      for (const { f, w, h } of floors) progress.seen[f] = Array.from({ length: w * h }, (_, i) => i);
    }
    return P.compact(character, 10000);
  });
  const serialized = JSON.stringify({ slots });
  const bytes = Buffer.byteLength(serialized, 'utf16le');
  assert.ok(bytes < 1024 * 1024, `five complete discovery maps use ${bytes} UTF-16 bytes`);
  const restored = JSON.parse(serialized);
  for (const { r, floors } of regions) for (const { f, w, h } of floors) {
    const saved = restored.slots[4].dungeons[r].seen[f];
    assert.equal(saved.length, 3 + Math.ceil(w * h / 6));
    assert.ok(P.unpackSeen(saved, w * h).every(value => value === 1), `region ${r}, floor ${f}`);
  }
});
