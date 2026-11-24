const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Rig=require('../src/actor_rig');
const ctx={ArtData:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../src/artbody.js'),'utf8'),ctx);
test('every body and direction retains its walking head size throughout the run',()=>{
  const body=ctx.ArtData.body;
  for(const combo of Object.keys(body.combos))for(let direction=0;direction<5;direction++){
    const widths=Array.from({length:8},(_,frame)=>Rig.headAnchor(body,combo,direction+5,frame)[2]);
    assert.equal(new Set(widths).size,1);const walk=body.combos[combo].a.slice(direction*8,(direction+1)*8).map(a=>a[2]).sort((a,b)=>a-b);
    assert.equal(widths[0],walk[4]);
  }
});
test('the complete gait advances by travelled distance regardless of render sampling',()=>{
  const frames=new Set();for(let d=0;d<2.25;d+=.01)frames.add(Rig.phase(d,true));
  assert.equal(frames.size,8);assert.equal(Rig.phase(2.25,true),0);assert.equal(Rig.phase(0,false),0);
});
