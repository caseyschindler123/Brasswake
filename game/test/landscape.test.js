const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Landscape=require('../src/landscape');

function world(){
  const w=160,h=96,n=w*h,m={w,h,t:new Uint8Array(n),b:new Uint8Array(n),reg:new Uint8Array(n),
    keep:new Uint8Array(n),solid:new Uint8Array(n),o:new Uint8Array(n),occ:new Map(),sites:[],ents:[]};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;m.reg[i]=m.b[i]=1+Math.floor(x/20);
    if(x%13===0){m.t[i]=2;m.keep[i]=1;}else if(y%17===0){m.t[i]=4;m.solid[i]=1;}
    else if(x%3===0&&y%3===0){m.o[i]=1+x%3;m.solid[i]=1;}
  }
  m.occ.set(300,{id:'resident'});m.sites.push({kind:'home',x:35,y:35,r:2});return m;
}
const physical=m=>JSON.stringify({t:[...m.t],b:[...m.b],reg:[...m.reg],keep:[...m.keep],solid:[...m.solid],o:[...m.o],occ:[...m.occ],sites:m.sites,ents:m.ents});

test('ecology is repeatable, uses no gameplay RNG and leaves every physical byte and entity untouched',()=>{
  const m=world(),before=physical(m),random=Math.random;
  try{
    Math.random=()=>{throw Error('Gameplay RNG consumed');};
    const a=Landscape.build(m),b=Landscape.build(m);
    assert.deepEqual(a,b);assert.equal(physical(m),before);assert.ok(a.stats.trees>300);assert.ok(a.stats.details>500);
    for(let r=1;r<=8;r++)assert.ok(a.stats.regions[r]>20,'family '+r+' has undergrowth');
  }finally{Math.random=random;}
});

test('decorative clusters exclude roads, water, protected ground and solid cells',()=>{
  const m=world(),data=Landscape.build(m);
  for(const chunk of data.chunks.values()){
    assert.ok(chunk.length<=Landscape.MAX_CHUNK);
    for(const o of chunk){const i=o.anchor;assert.ok(m.t[i]<2);assert.equal(m.solid[i],0);if(!o.tended)assert.equal(m.keep[i],0);assert.equal(m.o[i],0);}
  }
  const near=Landscape.visible(data,10,10,40,40);
  assert.ok(near.length>0);assert.ok(near.every(o=>o.x>=10&&o.x<=40&&o.y>=10&&o.y<=40));
  assert.equal(Landscape.visible(data,10000,10000,10010,10010).length,0);
  for(const trail of data.trails){assert.ok(trail.points.length<=32);for(const [x,y]of trail.points){const i=Math.floor(y)*m.w+Math.floor(x);assert.equal(m.solid[i],0);assert.ok(m.t[i]<=2);}}
});

test('wandering and respawning actors do not change the landscape generated on reload',()=>{
  const m=world(),a=Landscape.build(m);for(let i=0;i<m.w*m.h;i+=7)m.occ.set(i,{id:'temporary-actor'});
  assert.deepEqual(Landscape.build(m),a);
});

test('tended public planting stays on the grass side of planted trees and leaves paving clear',()=>{
  const m=world(),x=51,y=34;m.props=[{x,y,r:8,kind:'tree0'}];
  for(const dx of [-1,1]){const i=(y-1)*m.w+x+dx;m.t[i]=0;m.o[i]=0;m.solid[i]=0;m.keep[i]=1;}
  const data=Landscape.build(m),beds=[...data.chunks.values()].flat().filter(o=>o.tended&&o.r===8);
  assert.equal(beds.length,2);assert.ok(beds.every(o=>o.y===y-1&&m.t[o.anchor]===0));
});

test('every regional family has two species and four distinct growth stages with stable shape variation',()=>{
  for(let r=1;r<=8;r++){
    const keys=new Set(),scales=new Set(),widths=new Set();
    for(let x=0;x<1000;x++){
      const t=Landscape.tree(x,31,r);keys.add(t.key);scales.add(t.scale);widths.add(t.width);
      assert.deepEqual(t,Landscape.tree(x,31,r));assert.ok(t.scale>=.78&&t.scale<=1.1);assert.ok(t.width>=.91&&t.width<=1.09);
    }
    assert.equal(keys.size,8);assert.ok(scales.size>900);assert.ok(widths.size>900);
  }
});

test('wind stays subtle and rooted; reduced motion and fallen timber stay still',()=>{
  const tree=Landscape.tree(50,60,1),near=Landscape.tree(51,60,1);
  let moving=false;
  for(let t=0;t<40;t+=.1){const a=Landscape.wind(tree,t);assert.ok(Math.abs(a)<.0071);moving||=Math.abs(a)>.003;
    assert.ok(Math.abs(a-Landscape.wind(near,t))<.0045);assert.equal(Landscape.wind(tree,t,true),0);}
  assert.ok(moving);assert.equal(Landscape.wind({slot:6,phase:0,x:2,y:3},10),0);
});

test('foreground foliage reveals actors inside its bounds and retains full opacity for actors in front',()=>{
  const b={x:0,y:0,w:80,h:90,foot:90};
  assert.equal(Landscape.alpha(b,[{x:40,y:40,foot:65}]),.16);
  assert.equal(Landscape.alpha(b,[{x:40,y:40,foot:95}]),1);
  assert.equal(Landscape.alpha(b,[{x:90,y:40,foot:65}]),1);
});

test('wild species follow the ground biome across political borders, including snow and desert',()=>{
  assert.equal(Landscape.family(6,7),7);assert.equal(Landscape.family(7,6),6);
  assert.equal(Landscape.family(2,9),3);assert.equal(Landscape.family(5,10),7);assert.equal(Landscape.family(4,11),4);
  const m=world();m.b.fill(7);const d=Landscape.build(m);
  assert.ok([...d.trees.values()].every(t=>t.r===7));
});

function renderer(){
  const state={Landscape,Map,T:16,K:3,matchMedia:()=>({matches:false}),IMG:{},
    LandscapeArt:{files:['landscape/test.webp'],at:{1:{tree2:[2,2,180,240],detail0:[190,2,48,54]}}},
    img:n=>{state.IMG[n]={ok:false};},have:n=>state.IMG[n]?.ok,
    cut:(n,x,y,w,h)=>({width:w,height:h,hr:1}),lw:c=>c.width/3,lh:c=>c.height/3};
  vm.createContext(state);vm.runInContext(fs.readFileSync(require.resolve('../src/scene_landscape.js'),'utf8')+
    ';globalThis.api={landscapePiece,landscapeEntry,landscapePaint,landscapeLayers,landscapeActors};',state);return state;
}

test('foreground reveal includes nearby usable entrances and world objects while ignoring distant doors',()=>{
  const s=renderer();s.P={fx:10,fy:10};s.map={ents:[{kind:'stairs',fx:10,fy:12}],blds:[
    {x:8,y:8,plan:{doors:[{x:2,y:1}]}},{x:80,y:80,plan:{doors:[{x:2,y:1}]}}]};
  const points=s.api.landscapeActors();assert.equal(points.length,3);
  assert.ok(points.some(a=>a.x===168&&a.y===138&&a.foot===159));
});

test('late vegetation loads never cache a missing frame, and wind keeps the trunk foot fixed',()=>{
  const s=renderer();assert.equal(s.api.landscapePiece(1,'tree2'),null);s.IMG['landscape/test.webp'].ok=true;
  const piece=s.api.landscapePiece(1,'tree2');assert.ok(piece);assert.equal(s.api.landscapePiece(1,'tree2'),piece);
  const transforms=[],g={save(){},restore(){},translate(){},transform(...a){transforms.push(a);},drawImage(){}};
  const t={...Landscape.tree(50,60,1),stage:2,key:'tree2',r:1};
  const entry=s.api.landscapeEntry(t,975,[],1000),plant=entry[10];
  assert.equal(entry[3]+plant.h,976);
  s.api.landscapePaint(g,piece.c,0,0,false,.38,plant,1000);
  const [a,b,c,d,tx,ty]=transforms[0];assert.equal(c*plant.h+tx,0);assert.equal(d*plant.h+ty,plant.h);assert.equal(g.globalAlpha,1);
});

test('placing a house suppresses decorative undergrowth without rebuilding the physical world',()=>{
  const s=renderer(),m=world();m.landscape=Landscape.build(m);s.world=s.map=m;
  const o=[...m.landscape.chunks.values()].flat().find(o=>!o.ground&&o.key==='detail0'&&o.r===1);assert.ok(o);
  s.api.landscapePiece(1,'detail0');s.IMG['landscape/test.webp'].ok=true;
  const list=[];s.api.landscapeLayers(list,1000,o.x-1,o.y-1,o.x+1,o.y+1,[]);
  assert.ok(list.some(a=>a[10].anchor===o.anchor));
  m.solid[o.anchor]=1;const after=[];s.api.landscapeLayers(after,1000,o.x-1,o.y-1,o.x+1,o.y+1,[]);
  assert.ok(!after.some(a=>a[10].anchor===o.anchor));
  m.solid[o.anchor]=0;m.occ.set(o.anchor,{kind:'mon'});const occupied=[];
  s.api.landscapeLayers(occupied,1000,o.x-1,o.y-1,o.x+1,o.y+1,[]);assert.ok(!occupied.some(a=>a[10].anchor===o.anchor));
});

test('packed regional vegetation has complete bounded, padded source rectangles',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../src/artlandscape.js'),'utf8')+';globalThis.kit=LandscapeArt',ctx);
  const manifest=JSON.parse(fs.readFileSync(require.resolve('../../arttools/packed_manifest.json'),'utf8'));
  for(let r=1;r<=8;r++){
    const record=manifest.find(a=>a.path==='art/'+ctx.kit.files[r-1]);assert.ok(record);
    const rects=Object.values(ctx.kit.at[r]);assert.equal(rects.length,16);
    for(const [x,y,w,h]of rects){assert.ok(w>6&&h>6&&x>=2&&y>=2&&x+w<=record.dimensions[0]-2&&y+h<=record.dimensions[1]-2);}
    for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){
      const [x,y,w,h]=rects[a],[u,v,s,t]=rects[b];assert.ok(x+w+2<=u||u+s+2<=x||y+h+2<=v||v+t+2<=y,'no sprite bleed');
    }
  }
});
