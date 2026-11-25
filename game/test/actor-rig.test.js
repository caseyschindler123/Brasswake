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

test('run contacts retain a grounded foot and recovery frames have a real flight phase without stretching the body',()=>{
  for(const combo of Object.keys(ctx.ArtData.body.combos))for(let direction=0;direction<5;direction++){
    const poses=Array.from({length:8},(_,k)=>Rig.pose(ctx.ArtData.body,combo,direction+5,k));
    assert.equal(poses[0].lift,0);assert.equal(poses[4].lift,0);
    assert.ok(poses[2].lift>3&&poses[6].lift>3);
    assert.equal(new Set(poses.map(p=>p.headHeight)).size,1);
    assert.equal(new Set(poses.map(p=>p.anchor[2])).size,1);
    assert.equal(Rig.pose(ctx.ArtData.body,combo,direction,2).lift,0);
  }
});

test('head placement follows the actual skull rather than a body-centred run anchor',()=>{
  const w=80,h=80,p=new Uint8ClampedArray(w*h*4);
  for(let y=12;y<22;y++)for(let x=48;x<58;x++)p[(y*w+x)*4+3]=255;
  for(let y=23;y<77;y++)for(let x=30;x<51;x++)p[(y*w+x)*4+3]=255;
  const head=Rig.headProfile(p,w,h);
  assert.equal(head.top,12);assert.equal(head.center,52.5);assert.equal(head.width,10);
  const profiles=[];profiles[2*8+2]={top:13,center:42,width:9};profiles[7*8]=head;
  assert.deepEqual(Rig.pose(ctx.ArtData.body,1,7,0,profiles).anchor,[12,52.5,9]);
});
test('legacy and malformed appearance saves cannot request nonexistent atlases or skin transforms',()=>{
  const fallback={body:0,skin:1,hair:0,hc:1,beard:-1,hat:-1,wear:0,dye:0};
  const look=Rig.normalizeLook({body:99,skin:99,hair:NaN,hc:-3,beard:8,hat:'bad',wear:4,dye:null},fallback);
  assert.deepEqual(look,fallback);
  const legacy={body:1,hair:8,hc:2,beard:-1,hat:3,wear:1,dye:'frost'};
  assert.equal(Rig.normalizeLook(legacy,fallback),legacy);assert.equal(legacy.skin,1);assert.equal(legacy.dye,'frost');
});
