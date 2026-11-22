const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/dungeon_progress');
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
