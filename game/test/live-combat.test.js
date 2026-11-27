const test = require('node:test');
const assert = require('node:assert/strict');
const LiveCombat = require('../src/live_combat');
test('melee retains progress moving; archery slows; magic recovers; pause freezes all', () => {
  for (const [discipline, expected] of [['swords',4],['archery',3.3],['magery',2]]) {
    const r=LiveCombat.recovery(4,discipline);LiveCombat.advanceRecovery(r,2,true);assert.equal(r.remaining,expected);
    LiveCombat.advanceRecovery(r,30,false,true);assert.equal(r.remaining,expected);
    LiveCombat.advanceRecovery(r,1,false);assert.equal(r.remaining,expected-1);
  }
});
test('suspicion gives warning; chase needs delayed separation; return cannot immediately reaggro',()=>{
  const s=LiveCombat.enemy(),p=LiveCombat.profile(),near={visible:true,distance:4,homeDistance:0,aggressive:true};
  LiveCombat.awareness(s,1,near,p);assert.equal(s.phase,'alert');assert.ok(s.awareness>0&&s.awareness<100);
  LiveCombat.awareness(s,2,{...near,visible:false},p);assert.equal(s.phase,'idle');
  LiveCombat.engage(s);LiveCombat.awareness(s,2,{...near,visible:false},p);assert.equal(s.awareness,100);
  LiveCombat.awareness(s,6,{...near,visible:false},p);assert.equal(s.phase,'return');
  assert.equal(LiveCombat.engage(s),false);LiveCombat.awareness(s,1,{...near,homeDistance:2},p);assert.equal(s.phase,'return');
});
test('enemy windup can be dodged; control immunity prevents permanent repeated interruption',()=>{
  const s=LiveCombat.enemy(),p=LiveCombat.profile();LiveCombat.engage(s);
  assert.equal(LiveCombat.advanceEnemy(s,2,{canAttack:true},p),false);assert.ok(s.windup>0);
  assert.equal(LiveCombat.advanceEnemy(s,1,{canAttack:false},p),false);assert.equal(s.round,1);
  assert.equal(LiveCombat.interrupt(s,1.5),true);assert.equal(LiveCombat.interrupt(s,1.5),false);
  const before=JSON.stringify(s);LiveCombat.advanceEnemy(s,20,{canAttack:true,paused:true},p);assert.equal(JSON.stringify(s),before);
});
test('supercover LOS is symmetric and seals diagonal corners; transparent water remains visible',()=>{
  const blocked=(x,y)=>x===1&&y===0;
  assert.equal(LiveCombat.clearLine(0,0,1,1,blocked),false);
  assert.equal(LiveCombat.clearLine(1,1,0,0,blocked),false);
  assert.equal(LiveCombat.clearLine(0,0,5,0,()=>false),true);
  assert.equal(LiveCombat.clearLine(0,0,5,0,(x,y)=>x===3&&y===0),false);
});
test('pursuit finds a route around a wall instead of walking into it',()=>{
  const blocked=(x,y)=>x<0||y<0||x>6||y>5||(x===2&&y<4);
  assert.deepEqual(LiveCombat.pathStep([1,1],[4,1],blocked),[1,2]);
  assert.equal(LiveCombat.pathStep([1,1],[4,1],()=>true),null);
});
