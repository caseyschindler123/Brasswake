const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Dungeons = require('../src/dungeons.js');
const DungeonProgress = require('../src/dungeon_progress.js');
const Content = require('../src/quests.js');

test('surface entrances use the authored dungeon identities',()=>{
  for(let r=1;r<=8;r++)assert.equal(Content.DUNGEONS[r-1].name,Dungeons.get(r).name);
});

const floors = Array.from({ length: 8 }, (_, i) => Dungeons.get(i + 1)).flatMap(d => d.floors);
const id = (m, x, y) => y * m.w + x;
const entityId = (m, e) => id(m, e.x, e.y);
const around = (x, y) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
const passable = tile => tile === Dungeons.FLOOR || tile === Dungeons.BRIDGE;

test('all floors have real cover, distinct room scales and return shortcuts that reduce retreat',()=>{
  for(const {r,f}of floors){
    const m=Dungeons.build(r,f),label=r+'/'+f;
    assert.equal(m.revision,2,label);
    assert.ok(m.cover.length>0,label+' physical cover');
    assert.ok(m.rooms.some(R=>R.w>=23)&&m.rooms.some(R=>R.w<=13),label+' scale contrast');
    for(const C of m.cover)for(let y=C.y;y<C.y+C.h;y++)for(let x=C.x;x<C.x+C.w;x++){
      assert.equal(m.tiles[y*m.w+x],Dungeons.WALL,label+' cover collision');assert.equal(m.opaque[y*m.w+x],1,label+' cover opacity');
    }
    const gate=m.entities.find(e=>e.kind==='dgate'),secret=m.entities.find(e=>e.kind==='dsecret');
    const blockers=new Set(m.entities.map(e=>entityId(m,e)));
    for(const e of [gate,secret])for(const [x,y]of e.cells)blockers.add(id(m,x,y));
    const goal=m.entities.find(e=>e.kind==='dlever');
    const closed=approach(m,distances(m,blockers),goal);
    for(const [x,y]of gate.cells)blockers.delete(id(m,x,y));
    const open=approach(m,distances(m,blockers),goal);
    assert.ok(closed-open>=20,label+' return saves '+(closed-open)+' steps');
    for(let i=0;i<m.tiles.length;i++)assert.equal(m.opaque[i],+(m.tiles[i]===Dungeons.WALL),label+' base sight mask');
  }
});

test('irregular room labels use real floor membership and the starter room stays outside ordinary territories',()=>{
  for(const {r,f}of floors){
    const m=Dungeons.build(r,f);
    for(const R of m.rooms)for(const cell of R.cells){assert.equal(Dungeons.roomAt(m,cell%m.w,Math.floor(cell/m.w)),R);assert.ok(passable(m.tiles[cell]));}
    for(let i=0;i<m.tiles.length;i++)if(m.roomIndex[i]<0||!passable(m.tiles[i]))assert.equal(Dungeons.roomAt(m,i%m.w,Math.floor(i/m.w)),undefined);
  }
  const m=Dungeons.build(1,0),first=m.rooms[0];
  for(const e of m.entities.filter(e=>e.tutorial))assert.ok(first.cells.includes(id(m,e.x,e.y)),e.id);
  for(const e of m.entities.filter(e=>e.kind==='dmon'&&!e.tutorial))assert.ok(Math.hypot(e.x-m.entry[0],e.y-m.entry[1])>8,e.id+' outside initial discovery radius');
});

function distances(m, blocked = new Set()) {
  const start = id(m, ...m.entry);
  const queue = [start], result = new Map([[start, 0]]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i], x = cell % m.w, y = Math.floor(cell / m.w);
    for (const [nx, ny] of around(x, y)) {
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const next = id(m, nx, ny);
      if (!passable(m.tiles[next]) || result.has(next) || blocked.has(next)) continue;
      result.set(next, result.get(cell) + 1);
      queue.push(next);
    }
  }
  return result;
}

function approach(m, result, entity) {
  return Math.min(...around(entity.x, entity.y).map(([x, y]) => result.get(id(m, x, y)) ?? Infinity));
}

test('all 28 floors have complete and distinct authored layouts', () => {
  assert.equal(floors.length, 28);
  const layouts = new Set(), names = new Set(), allIds = new Set();
  for (const spec of floors) {
    const { r, f } = spec, m = Dungeons.build(r, f), label = `${r}/${f}`;
    assert.equal(Dungeons.get(r).floors.length, r <= 4 ? 3 : 4, label);
    assert.equal(Dungeons.get(r).name, Content.DUNGEONS[r - 1].name, label);
    assert.equal(m.theme, Dungeons.themes[r], label);
    assert.ok(m.name && !names.has(m.name), label);
    names.add(m.name);
    assert.ok(m.rooms.length >= 12 && m.rooms.length === spec.names.length, label);
    assert.equal(new Set(m.rooms.map(room => room.name)).size, m.rooms.length, label);
    assert.ok(m.rooms.every(room => room.name && room.x > 0 && room.y > 0 && room.x + room.w < m.w && room.y + room.h < m.h), label);
    assert.equal(spec.territory.length, m.route.length, label);
    assert.ok(m.tiles instanceof Uint8Array && m.tiles.length === m.w * m.h, label);
    assert.deepEqual(Dungeons.build(r, f), m, label);

    const signature = Buffer.from(m.tiles).toString('base64');
    assert.ok(!layouts.has(signature), label);
    layouts.add(signature);
    const occupied = new Set([id(m, ...m.entry)]);
    for (const e of m.entities) {
      const cell = entityId(m, e);
      assert.ok(Number.isInteger(e.x) && Number.isInteger(e.y) && e.x > 0 && e.y > 0 && e.x < m.w - 1 && e.y < m.h - 1, e.id);
      if(e.kind==='dtravel'&&e.to<f){
        assert.deepEqual(e.support,{x:e.x-1,y:e.y-2,w:3,h:3},e.id);
        assert.equal(e.side,'north',e.id);
        for(let y=e.support.y;y<e.support.y+3;y++)for(let x=e.support.x;x<e.support.x+3;x++)
          assert.equal(m.tiles[id(m,x,y)],Dungeons.WALL,e.id+' has continuous solid support');
        for(const dy of [1,2])for(const dx of [-1,0,1])assert.equal(m.tiles[id(m,e.x+dx,e.y+dy)],Dungeons.FLOOR,e.id+' has a dry full-width landing');
      }else assert.equal(m.tiles[cell], Dungeons.FLOOR, e.id);
      assert.ok(!occupied.has(cell) && !allIds.has(e.id), e.id);
      occupied.add(cell);
      allIds.add(e.id);
    }
  }
});

test('every floor has a connected dry route with two loops, branches, and traversable crossings', () => {
  for (const { r, f } of floors) {
    const m = Dungeons.build(r, f), label = `${r}/${f}`;
    const reachable = distances(m);
    assert.ok(reachable.size >= 1200, label);
    assert.equal(reachable.size, m.tiles.filter(passable).length, label);
    assert.ok(m.rooms.every(room => reachable.has(id(m, room.cx, room.cy))), label);
    assert.ok(m.links.length - m.rooms.length + 1 >= 2, label);
    const main = new Set(m.route);
    const branchEntrances = m.links.filter(link => link.optional && main.has(link.from) !== main.has(link.to));
    const branches = new Set(branchEntrances.map(link => main.has(link.from) ? link.to : link.from));
    assert.ok(branches.size >= 3, label);
    for (const link of m.links.filter(link=>link.terrain!==Dungeons.FLOOR)) {
      assert.ok(link.spine.every(([x, y]) => passable(m.tiles[id(m, x, y)])), label);
      assert.ok(link.cells.some(([x, y]) => m.tiles[id(m, x, y)] === link.terrain), label);
    }
  }
});

test('optional doors have reachable controls and leave the stairs and keeper routes open', () => {
  for (const { r, f } of floors) {
    const m = Dungeons.build(r, f), label = `${r}/${f}`;
    const entity = kind => m.entities.find(e => e.kind === kind && !e.tutorial);
    const gate = entity('dgate'), lever = entity('dlever'), secret = entity('dsecret'), cache = entity('dcache'), note = entity('dlore');
    assert.equal(lever.target, gate.id, label);
    assert.ok(note.text && cache.room === 'z', label);
    assert.ok(gate.cells.length >= 2 && secret.cells.length >= 2, label);
    const blocked = new Set(m.entities.map(e => entityId(m, e)));
    const close = door => door.cells.forEach(([x, y]) => blocked.add(id(m, x, y)));
    close(gate);
    close(secret);
    const closed = distances(m, blocked);
    assert.ok(Number.isFinite(approach(m, closed, lever)), lever.id);
    assert.ok(Number.isFinite(approach(m, closed, secret)), secret.id);
    assert.ok(Number.isFinite(approach(m, closed, note)), note.id);
    assert.equal(approach(m, closed, cache), Infinity, cache.id);
    const objective = entity('keeper') || m.entities.find(e => e.kind === 'dtravel' && e.to > f);
    const mandatory = approach(m, closed, objective);
    assert.ok(Number.isFinite(mandatory) && mandatory >= 150, `${objective.id} at ${mandatory} tiles`);
    const lieutenant = m.entities.find(e => e.lieutenant);
    if (lieutenant) assert.ok(Number.isFinite(approach(m, closed, lieutenant)), lieutenant.id);

    gate.cells.forEach(([x, y]) => blocked.delete(id(m, x, y)));
    const shortcut = distances(m, blocked), nearRoom = m.rooms.find(room => room.id === 'w');
    const nearCell = id(m, nearRoom.cx, nearRoom.cy);
    assert.ok(shortcut.get(nearCell) < closed.get(nearCell), gate.id);
    assert.equal(approach(m, shortcut, cache), Infinity, cache.id);

    secret.cells.forEach(([x, y]) => blocked.delete(id(m, x, y)));
    const open = distances(m, blocked);
    assert.ok(Number.isFinite(approach(m, open, cache)), cache.id);
    assert.ok(open.has(id(m, ...gate.cells[0])), gate.id);
    const distance = approach(m, open, objective);
    assert.ok(Number.isFinite(distance) && distance >= 150 && distance <= mandatory, `${objective.id} at ${distance} tiles with optional doors open`);
    if (entity('keeper')) {
      assert.ok(Number.isFinite(approach(m, closed, entity('chest'))), label);
      assert.ok(Number.isFinite(approach(m, closed, entity('ltable'))), label);
    }
  }
});

test('stairs are reciprocal, with clear arrivals beside the corresponding stairs', () => {
  for (const { r, f } of floors) {
    const m = Dungeons.build(r, f);
    const travel = m.entities.filter(e => e.kind === 'dtravel');
    assert.deepEqual(travel.map(e => e.to), Dungeons.floor(r, f + 1) ? [f - 1, f + 1] : [f - 1]);
    for (const stairs of travel) {
      if (stairs.to === -1) {
        assert.equal(stairs.arrival, null);
        continue;
      }
      const destination = Dungeons.build(r, stairs.to), [x, y] = stairs.arrival;
      const reciprocal = destination.entities.find(e => e.kind === 'dtravel' && e.to === f);
      assert.ok(reciprocal, stairs.id);
      assert.ok(Math.abs(reciprocal.x - x) + Math.abs(reciprocal.y - y) <= 3, stairs.id);
      assert.equal(destination.tiles[id(destination, x, y)], Dungeons.FLOOR, stairs.id);
      assert.ok(!destination.entities.some(e => e.x === x && e.y === y), stairs.id);
      if (stairs.to > f) assert.deepEqual(stairs.arrival, destination.entry, stairs.id);
    }
  }
});

test('redesigned ascents have complete authored landings and unoccupied room centres',()=>{
  for(const {r,f} of floors){
    const m=Dungeons.build(r,f),room=m.rooms[0],up=m.entities.find(e=>e.kind==='dtravel'&&e.to<f);
    assert.equal(m.tiles[id(m,room.cx,room.cy)],Dungeons.FLOOR,'old ascent position stays open');
    assert.ok(!m.entities.some(e=>e.x===room.cx&&e.y===room.cy),'old occupied centre is released');
    assert.equal(DungeonProgress.validPosition(m,[room.cx,room.cy]),true,'old saved room-centre position restores safely');
    assert.deepEqual(m.entry,[up.x,up.y+2]);
    assert.ok(Number.isFinite(approach(m,distances(m),up)),up.id+' remains reachable from entry');
    assert.deepEqual(m.landingAdded,[],'landings are authored in revision two');
  }
});

test('encounter territories resolve to real bounties and native art with exactly one pre-vault lieutenant', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/artdata.js'), 'utf8');
  const native = vm.runInNewContext(`${source}\nArtData.mobs.at`);
  const bounties = new Map(Content.BOUNTIES.map(bounty => [bounty.id, bounty.r]));
  const space = new Set();
  for (const { r, f } of floors) {
    const m = Dungeons.build(r, f), label = `${r}/${f}`;
    const roster = Dungeons.get(r).species;
    assert.deepEqual(roster.filter(id => id.startsWith('d')), [`d${r}1`, `d${r}2`]);
    assert.equal(roster.length, 6);
    const monsters = m.entities.filter(e => e.kind === 'dmon' && !e.tutorial);
    const ordinary = monsters.filter(e => !e.lieutenant);
    const final = !Dungeons.floor(r, f + 1);
    assert.ok(ordinary.length >= 24 && ordinary.length <= 32, label);
    assert.ok(new Set(ordinary.map(e => e.room)).size >= 12, label);
    assert.equal(monsters.length - ordinary.length, final ? 0 : 1, label);
    const keeper = m.entities.filter(e => e.kind === 'keeper');
    assert.equal(keeper.length, final ? 1 : 0, label);
    for (const e of monsters.concat(keeper)) {
      const sp = Dungeons.species[e.species];
      assert.ok(sp.description && sp.name && sp.scale > 0, e.id);
      assert.ok(['skirmisher', 'armored', 'caster', 'brute'].includes(sp.role), e.id);
      assert.equal(sp.role, e.role, e.id);
      assert.equal(sp.tpl, e.tpl, e.id);
      assert.equal(bounties.get(sp.tpl), r, e.id);
      if (e.species.startsWith('d')) assert.equal(sp.art, e.species, e.id);
      else assert.ok(native[sp.art], e.id);
      space.add(e.species);
    }
    const tutorial = m.entities.filter(e => e.tutorial);
    assert.deepEqual(tutorial.map(e => e.kind), r === 1 && f === 0 ? ['dmon', 'dcache'] : [], label);
  }
  assert.deepEqual([...space].sort(), Object.keys(Dungeons.species).sort());
});
