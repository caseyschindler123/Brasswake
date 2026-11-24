const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/movement');
const actor=()=>({x:0,y:0,fx:0,fy:0,path:[[1,0]],run:true,manual:true});
test('manual stopping preserves a mid-tile position and restarting never rolls back',()=>{
  const p=actor();M.advance(p,1,0,.31,()=>false);const at=p.fx;M.stop(p);
  assert.equal(p.fx,at);assert.equal(p.path.length,0);assert.equal(p.run,false);
  M.advance(p,1,0,.2,()=>false);assert.ok(p.fx>at);assert.equal(p.x,1);
});
test('steering is immediate and diagonal speed matches cardinal travel',()=>{
  const p=actor(),q=actor();M.advance(p,1,0,.24,()=>false);const x=p.fx;
  M.advance(p,0,1,.24,()=>false);assert.equal(p.fx,x);assert.ok(p.fy>.23);
  M.advance(q,1,1,.48,()=>false);assert.ok(Math.abs(Math.hypot(q.fx,q.fy)-.48)<1e-9);
});
test('swept motion cannot tunnel through a wall and slides along its open edge',()=>{
  const p=actor(),blocked=(x,y)=>x===1;
  M.advance(p,1,0,8,blocked);assert.ok(p.fx<.35);assert.equal(p.x,0);
  M.advance(p,1,1,1,blocked);assert.ok(p.fx<.35);assert.ok(p.fy>.6);
});
test('tile entry events happen once per crossed tile and relocation stops remaining movement',()=>{
  const p=actor(),seen=[];M.advance(p,1,0,3,()=>false,(x,y)=>{seen.push([x,y]);return x<2;});
  assert.deepEqual(seen,[[1,0],[2,0]]);assert.ok(p.fx<2);assert.equal(p.x,2);
});
test('a sealed diagonal corner remains impassable',()=>{
  const p=actor();M.advance(p,1,1,2,(x,y)=>(x===1&&y===0)||(x===0&&y===1));
  assert.equal(p.x,0);assert.equal(p.y,0);
});
test('a newly arrived occupant never traps the player in an existing partial overlap',()=>{
  const p=actor();M.advance(p,1,0,.48,()=>false);const before=p.fx;
  assert.equal(M.advance(p,1,0,.05,(x,y)=>x===1&&y===0),0);
  M.advance(p,-1,0,.4,(x,y)=>x===1&&y===0);assert.ok(p.fx<before-.39);
});
