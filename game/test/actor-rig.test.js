const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Rig=require('../src/actor_rig');
const Baked=require('../src/human_gaits');
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
  const stride=Rig.gait(true).stride,frames=new Set();for(let d=0;d<stride;d+=.001)frames.add(Rig.phase(d,true));
  assert.equal(frames.size,64);assert.equal(Rig.phase(stride,true),0);assert.equal(Rig.phase(0,false),0);
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


test('base travel speed follows the rebuilt rig stride at realistic high cadence',()=>{
  for(const [running,expectedCadence,source] of [[false,132,Baked.walk],[true,180,Baked.run]]){
    const gait=Rig.gait(running);assert.equal(gait.stride,source.stride);
    assert.ok(Math.abs(Rig.speed(running)/gait.stride*120-expectedCadence)<1e-12);
    assert.equal(Rig.phase(gait.stride,running),0);
    // Existing pursuit speed relative to the player survives the slower pace.
    const oldSpeed=running?4.6:2.2,pursuer=running?3.6:2;
    assert.ok(Math.abs(pursuer*Rig.paceScale(running)/Rig.speed(running)-pursuer/oldSpeed)<1e-12);
  }
});

test('contact sounds follow visible half-strides independently of frame sampling and speed boosts',()=>{
  for(const running of [false,true])for(const boost of [1,1.15]){
    let distance=0,contacts=0,elapsed=0;
    for(let i=0;i<900;i++){
      const dt=[.016,.05,.009,.033][i%4],next=distance+Rig.speed(running)*boost*dt;
      const count=Rig.contacts(distance,next,running);
      if(count){const phase=next/Rig.gait(running).stride%1;assert.ok(Rig.gait(running).contacts.some(c=>(phase-c+1)%1<=dt*Rig.gait(running).cadence*boost/120+1e-12));}
      contacts+=count;distance=next;elapsed+=dt;
    }
    assert.equal(contacts,Rig.contacts(0,distance,running));
    assert.ok(Math.abs(contacts-Rig.gait(running).cadence*boost*elapsed/60)<1);
    assert.equal(Rig.contacts(distance,distance,running),0);
    assert.equal(Rig.contacts(distance,distance-1,running),0);
    assert.equal(Rig.contacts(NaN,distance,running),0);
  }
});

test('changing pace preserves cycle phase and physical distance without phantom contacts',()=>{
  const actor={};Rig.advance(actor,.46,false);const before=Rig.distance(actor)/Rig.gait(false).stride,actual=actor.wd;
  const travel=.000001,contacts=Rig.advance(actor,travel,true),after=(Rig.distance(actor)-travel)/Rig.gait(true).stride;
  assert.ok(Math.abs(before-after)<1e-12);assert.equal(actor.wd,actual+travel);assert.equal(contacts,0);
  const still=Rig.distance(actor);assert.equal(Rig.advance(actor,0,false),0);assert.equal(Rig.distance(actor),still);
  Rig.advance(actor,.31,true);const runPhase=Rig.distance(actor)/Rig.gait(true).stride;
  Rig.advance(actor,travel,false);assert.ok(Math.abs((Rig.distance(actor)-travel)/Rig.gait(false).stride-runPhase)<1e-12);
});
