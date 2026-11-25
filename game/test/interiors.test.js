const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Buildings = require('../src/buildings');
const Interiors = require('../src/interiors');

const regions = Array.from({length:8}, (_, n) => n + 1);
const streetRooms = [
  ['tavern',7,7,['south','east']], ['bank',6,6,['south','east']], ['shop',6,5,['south','east']],
  ['guild',7,5,['south']], ['casino',7,5,['south']], ['dojo',7,5,['south']],
  ['house',5,4,['south']], ['cottage',5,4,['south']],
];
const source = fs.readFileSync(path.resolve(__dirname,'../src/scene_venues.js'), 'utf8');
const livingSource = fs.readFileSync(path.resolve(__dirname,'../src/scene_living.js'), 'utf8');
const neighbors = [[0,-1], [1,0], [0,1], [-1,0]];

test('all eight town kits compile distinct usable frontages, preserve both public shop doors, and leave actual exterior space', () => {
  for (const r of regions) for (const [slot, w, h, doors] of streetRooms) {
    const diagram = Interiors.frontage(slot,w,h,r);
    const plan = Buildings.compile({ id:slot+r, w,h,doors,diagram });
    assert.deepEqual(plan.doors.map(d=>d.side), doors);
    assert.ok(plan.tiles.includes(Buildings.VOID), slot + ' has a physical setback');
    for (const d of plan.doors) assert.ok(Buildings.walkable(plan,d.inside.x,d.inside.y));
  }
  assert.notDeepEqual(Interiors.frontage('tavern',7,7,1), Interiors.frontage('tavern',7,7,2));
  assert.equal(new Set(regions.map(r=>Interiors.civic[r].name)).size, 8);
  assert.equal(new Set(regions.map(r=>Interiors.civic[r].shape)).size, 3);
});

function canvas(w,h) {
  const noop=()=>{};
  return { width:w, height:h, getContext:()=>new Proxy({createLinearGradient:()=>({addColorStop:noop})}, { get:(target,key)=>target[key]||noop, set:()=>true }) };
}
function fixture() {
  const world = { w:80, h:80, venues:new Map(), ents:[], occ:new Map(), solid:new Uint8Array(6400) };
  let time=0;
  const sounds=[];
  const api = { world, map:world, P:{x:1,y:1,fx:1,fy:1}, Buildings, Interiors, T:16, K:3, mk:canvas, AD:null,document:{createElement:()=>canvas(0,0)},
    BIO:Object.fromEntries(regions.map(r=>[r,{}])), chartSteps:neighbors,
    performance:{ now:()=>time }, clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), emit:s=>sounds.push(s),
    folkSprite:()=>null, architecturePiece:()=>null, host:{regionName:r=>'Region '+r},
    chartOpen:(m,x,y)=>x>=0 && y>=0 && x<m.w && y<m.h && !m.solid[y*m.w+x] && !m.occ.has(y*m.w+x),
    addEnt(m,e) { m.ents.push(e); m.occ.set(e.y*m.w+e.x,e); return e; },
    worldBuilding(m,b,opts) {
      b.plan=Buildings.compile({id:opts.id||'hall',x:b.x,y:b.y,w:b.w,h:b.h,diagram:opts.diagram,doors:opts.doors});
      b.name=opts.name; b.room={fl:'floor'};
      for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)
        m.solid[(b.y+y)*m.w+b.x+x]=b.plan.tiles[y*b.w+x]===Buildings.WALL?1:0;
    },
    nextTo:e=>Math.abs(e.x-api.P.x)+Math.abs(e.y-api.P.y)===1,
    go(m,x,y) { api.map=m; Object.assign(api.P,{x,y,fx:x,fy:y}); },
  };
  const view=fs.readFileSync(path.join(__dirname,'../src/building_view.js'),'utf8');
  const methods=vm.runInNewContext(view+'\n'+source+'\n'+livingSource+'\n({ venueUpper, enterVenue, exitVenue, restoreVenue, venueState, venueHall, venueDoors, venueProp })', api);
  return { api, methods, sounds, tick(ms) {time+=ms;} };
}
function floorFlood(m, entry, target) {
  const queue=[entry], seen=new Set([entry.join(',')]);
  for(let head=0;head<queue.length;head++) {
    const [x,y]=queue[head];
    if(x===target[0] && y===target[1]) return true;
    for(const [dx,dy] of neighbors) {
      const nx=x+dx,ny=y+dy,key=nx+','+ny;
      if(nx<0||ny<0||nx>=m.w||ny>=m.h||seen.has(key)||m.solid[ny*m.w+nx]||m.occ.has(ny*m.w+nx)) continue;
      seen.add(key); queue.push([nx,ny]);
    }
  }
  return false;
}

function groundVenue(r,type) {
  const civic=Interiors.civic[r], w=type==='healer'?5:type==='tavern'?7:civic.w, h=type==='healer'?4:type==='tavern'?7:civic.h;
  const shape=type==='civic' && civic.shape==='court'?'courtyard':type==='civic' && civic.shape==='L'?'L':'rect';
  const plan=Buildings.compile({id:type+r,w,h,shape,diagram:type==='tavern'?Interiors.frontage(type,w,h,r):undefined});
  let at=plan.tiles.lastIndexOf(Buildings.FLOOR);
  const building={name:type,w,h,plan,x:10,y:10};
  return {id:plan.id,name:type,type,r,building,stair:{x:10+at%w,y:10+Math.floor(at/w)}};
}

test('indoor stairs upgrade after art readiness and fit regional painted travel pieces without distortion', () => {
  const {api,methods}=fixture(),art=new Map();api.artVer=1;
  api.architecturePiece=(r,name)=>art.get(r+':'+name);
  for(const r of regions){
    const fallback=methods.venueProp('venue_stairs_up',r);
    assert.equal(fallback.source,undefined);
    for(const [kind,name,width,height,maxW,maxH] of [
      ['venue_stairs_up','stairs_up',260,208,32,32],
      ['venue_stairs_down','stairs_down',322,165,34,24]]){
      const source=canvas(width,height);art.set(r+':'+name,source);
      const sprite=methods.venueProp(kind,r),scale=Math.min(maxW*3/width,maxH*3/height);
      assert.equal(sprite.source,source);assert.notEqual(sprite,fallback);
      assert.equal(sprite.c.width,Math.round(width*scale));assert.equal(sprite.c.height,Math.round(height*scale));
      assert.ok(sprite.c.width/3>=30&&sprite.c.height/3>=17,'stair remains readable beside an adult');
      assert.equal(sprite.ax,sprite.c.width/6);assert.equal(sprite.ay,sprite.c.height/3-1);
      assert.equal(methods.venueProp(kind,r),sprite);
    }
  }
});

test('all 24 upper rooms have dry landings and reachable attendants and return stairs', () => {
  const {api,methods}=fixture();
  for(const r of regions) for(const type of ['tavern','healer','civic']) {
    const venue=groundVenue(r,type);
    const room=methods.venueUpper(venue);
    assert.ok(room.blds[0].indoor);
    assert.equal(room.blds[0].fa,0);
    assert.ok(api.chartOpen(room,...room.entry));
    assert.equal(room.dungeon,false);
    assert.equal(room.w,venue.building.w);
    assert.equal(room.h,venue.building.h);
    venue.building.plan.tiles.forEach((t,i)=>{
      if(t===Buildings.VOID || t===Buildings.COURT)assert.equal(room.solid[i],1);
    });
    const staff=room.ents.find(e=>e.kind==='folk'), down=room.ents.find(e=>e.kind==='venuedown');
    assert.equal(down.venueId,venue.id);
    assert.deepEqual([down.x,down.y],[venue.stair.x-venue.building.x,venue.stair.y-venue.building.y]);
    for(const e of [staff,down]) assert.ok(neighbors.some(([dx,dy])=>floorFlood(room,room.entry,[e.x+dx,e.y+dy])),type+' '+r);
    if(type==='healer'){
      assert.ok(room.blds[0].furniture.some(f=>f.p.endsWith('_bed')));
      assert.ok(room.blds[0].furniture.some(f=>f.p==='venue_medicine'));
    }
  }
});

test('stair travel requires a live nearby staircase, restores indoor coordinates and returns to the same landing', () => {
  const {api,methods}=fixture(), {world}=api;
  const venue=groundVenue(1,'tavern'), stair=api.addEnt(world,{...venue.stair,kind:'venueup',venueId:'building-1'});
  world.venues.set('building-1',{...venue,id:'building-1',stair});
  assert.equal(methods.enterVenue(stair),false);
  const back=[stair.x-1,stair.y]; api.go(world,...back);
  assert.equal(methods.enterVenue({...stair}),false);
  assert.equal(methods.enterVenue(stair),true);
  const upper=api.map, downCell=upper.ents.find(e=>e.kind==='venuedown');
  let at;
  for(let y=1;y<upper.h-1;y++)for(let x=1;x<upper.w-1;x++)if(api.chartOpen(upper,x,y)&&Math.abs(x-downCell.x)+Math.abs(y-downCell.y)>1)at=[x,y];
  api.go(upper,...at);
  const saved=methods.venueState();
  assert.deepEqual({...saved,back:Array.from(saved.back)},{v:1,id:'building-1',r:1,f:1,x:at[0],y:at[1],back});
  api.go(world,...back);
  assert.equal(methods.restoreVenue({...saved,r:2}),false);
  assert.equal(methods.restoreVenue({...saved,id:'missing'}),false);
  assert.equal(methods.restoreVenue(saved),true);
  assert.deepEqual([api.P.x,api.P.y],at);
  assert.equal(methods.exitVenue(api.map.ents.find(e=>e.kind==='venuedown')),false);
  assert.equal(methods.restoreVenue({...saved,x:9999,y:-2}),true);
  const down=api.map.ents.find(e=>e.kind==='venuedown');
  assert.equal(methods.exitVenue(down),true);
  assert.equal(api.map,world);
  assert.deepEqual([api.P.x,api.P.y],back);
  assert.equal(methods.venueState(),null);
});

test('dojo uses an always-cut-away modular hall and preserves the real ring, entrance and equipment collision', () => {
  const {methods}=fixture();
  for(const r of regions){
    const m={ r,w:11,h:16,paint:'dj/I'+r+'.jpg',solid:new Uint8Array(176).fill(1),blds:[] };
    for(let y=3;y<=14;y++)for(let x=1;x<=9;x++)m.solid[y*11+x]=0;
    m.solid[15*11+5]=0; m.solid[3*11+2]=1;
    methods.venueHall(m);
    assert.equal(m.paint,undefined);
    assert.ok(m.blds[0].indoor);
    assert.ok(m.blds[0].plan.walls.length>0);
    assert.equal(m.solid[3*11+2],1);
    for(const [x,y] of [[5,15],[5,13],[5,4],[4,8],[7,8]])assert.equal(m.solid[y*11+x],0);
  }
});

test('door leaves swing progressively and sound once opening and once closing', () => {
  const {api,methods,tick,sounds}=fixture();
  const b={x:10,y:10,w:5,h:5,r:1,by:15*16-1,fa:1,
    plan:Buildings.compile({id:'door-motion',w:5,h:5,doors:['south']}),slot:'house'};
  const door=b.plan.doors[0],x=b.x+door.x,y=b.y+door.y;
  api.go(api.world,x,y+3);
  methods.venueDoors(b,[]);
  assert.equal(b.doorMotion[0].amount,0);
  api.go(api.world,x,y+1);
  tick(75); methods.venueDoors(b,[]);
  assert.ok(b.doorMotion[0].amount>0&&b.doorMotion[0].amount<1);
  for(let i=0;i<5;i++){tick(80);methods.venueDoors(b,[]);}
  assert.equal(b.doorMotion[0].amount,1);
  assert.deepEqual(sounds,['door']);
  api.go(api.world,x,y+3);
  for(let i=0;i<5;i++){tick(80);methods.venueDoors(b,[]);}
  assert.equal(b.doorMotion[0].amount,0);
  assert.deepEqual(sounds,['door','door']);
});

test('interior saves retain only bounded coordinates and a canonical building reference', () => {
  const good={v:1,id:'building-7-620-145',r:7,f:1,x:3,y:2,back:[623,151]};
  const normalized=Interiors.normalizeProgress({...good,debug:'discard'});
  assert.deepEqual(normalized,good);
  assert.notEqual(normalized.back,good.back);
  for(const bad of [null,{}, {...good,v:2},{...good,r:0},{...good,r:9},{...good,f:0},
    {...good,id:'A\nB'},{...good,id:'x'.repeat(97)},{...good,x:128},{...good,y:-1},
    {...good,back:[768,0]},{...good,back:[0,1152]},{...good,back:[1.5,2]}]) {
    assert.equal(Interiors.normalizeProgress(bad),null);
  }
});
