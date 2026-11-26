const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Buildings = require('../src/buildings');
const Interiors = require('../src/interiors');
const ServicePlaces = require('../src/service_places');
const TerrainEdges = require('../src/terrain_edges');

const neighbors = [[0,-1],[1,0],[0,1],[-1,0]];

test('every regional casino frontage has three distinct stations with reachable dealer and patron approaches', () => {
  const {w,h,stations} = Interiors.casino;
  for (let r=1; r<=8; r++) {
    const plan = Buildings.compile({id:'casino-'+r,w,h,doors:['south'],diagram:Interiors.frontage('casino',w,h,r)});
    const occupied = new Set();
    for (const {footprint,dealer,seats} of stations) for (const [x,y] of [...footprint,dealer,...seats]) {
      assert.equal(plan.tiles[y*w+x],Buildings.FLOOR);
      assert.ok(!occupied.has(y*w+x),`fixture collision at ${r}:${x},${y}`);
      occupied.add(y*w+x);
    }
    const {inside} = plan.doors[0], queue = [[inside.x,inside.y]], seen = new Set([inside.y*w+inside.x]);
    assert.ok(!occupied.has(inside.y*w+inside.x));
    for (let head=0;head<queue.length;head++) for(const [dx,dy] of neighbors){
      const [x,y] = [queue[head][0]+dx,queue[head][1]+dy], i = y*w+x;
      if (!Buildings.walkable(plan,x,y) || occupied.has(i) || seen.has(i)) continue;
      queue.push([x,y]); seen.add(i);
    }
    for (const {key,dealer,seats} of stations) for (const [x,y] of [dealer,...seats])
      assert.ok(neighbors.some(([dx,dy])=>seen.has((y+dy)*w+x+dx)),`${key} approach in region ${r}`);
  }
});

test('when a town has no eligible nearby plot, a dry edge parcel supplies the same venue without moving fixed sites', () => {
  const w=320,h=320,r=7,n=w*h;
  const m={w,h,t:new Uint8Array(n).fill(9),reg:new Uint8Array(n).fill(r),solid:new Uint8Array(n),o:new Uint8Array(n),
    keep:new Uint8Array(n),seen:new Uint8Array(n),props:[{x:193,y:156}]};
  const {w:bw,h:bh}=Interiors.casino;
  for(const [x,y,land] of [[192,152,0],[232,154,5]])for(let yy=y-1;yy<=y+bh;yy++)for(let xx=x-1;xx<=x+bw;xx++){
    m.t[yy*w+xx]=land;m.seen[yy*w+xx]=1;
  }
  const source=fs.readFileSync(require.resolve('../src/scene_venues'),'utf8');
  const {venueParcel}=vm.runInNewContext(source+'\n({venueParcel})',{
    TOWN:{7:[160,160]}, Geography:{inTown:()=>false}, chartOpen:(m,x,y)=>m.t[y*m.w+x]<9,
    Interiors, host:{regionName:()=> 'Highwatch'}, worldGrownBuilding:(_m,x,y,w,h,type,r,options)=>({x,y,w,h,type,r,id:options.id}),
  });
  assert.deepEqual({...venueParcel(m,r,'casino',bw,bh,{id:'casino-7'})},
    {x:232,y:154,w:bw,h:bh,type:'casino',r,id:'casino-7'});
  assert.deepEqual(m.props,[{x:193,y:156}]);
});

test('business signs inspect the rendered premises, accept a 44 px target and leave service actions to physical interaction', () => {
  const building = {x:5,y:5,by:175}, door={x:4,y:5,side:'south'};
  const place={kind:'service',id:'stable-1',name:'Harbour Stables',type:'stable',r:1,building,door};
  const world={cartography:{destinations:[place]}}, events=[], noop=()=>{};
  const context={world,map:world,zoom:2,K:3,T:16,vw:195,vh:360,cam:{x:65.13,y:40.22},
    host:{inspectService:p=>events.push(p)}, ServicePlaces:{...ServicePlaces,paint:noop},
    architecturePiece:()=>null,worldPiece:()=>null,lw:c=>c.width/3,lh:c=>c.height/3,
    mk:(width,height)=>({width,height,getContext:()=>new Proxy({}, { get:()=>noop })})};
  const source=fs.readFileSync(require.resolve('../src/scene_services'),'utf8');
  const {inspectServiceSign,serviceLayers}=vm.runInNewContext(source+'\n({inspectServiceSign,serviceLayers})',context);
  const list=[];
  serviceLayers(list);
  assert.equal(list.length,1);
  const [,sign,x,y]=list[0], align=n=>Math.round(n*3)/3;
  const sx=(x-align(context.cam.x))*2+sign.width/3,sy=(y-align(context.cam.y))*2+sign.height/3;
  assert.equal(inspectServiceSign(sx+21.5,sy),true,'padding beyond the painted sign is selectable');
  assert.deepEqual(events,[{id:'stable-1',name:'Harbour Stables',type:'stable',r:1,services:['Buy a horse']}]);
  assert.equal(inspectServiceSign(sx+22.5,sy),false);
  building.inside=true;
  assert.equal(inspectServiceSign(sx,sy),false,'a cutaway interior cannot pick an exterior sign');
  assert.equal(ServicePlaces.typeFor({slot:'palace',civic:true}),'civic');
  assert.equal(ServicePlaces.typeFor({slot:'stable',stalls:Interiors.stable.stalls}),'stable');
  assert.equal(ServicePlaces.typeFor({slot:'stable'}),null,'private farm shelters are not horse shops');
});

test('terrain uses joined masonry and irregular narrow shoulders without changing physical terrain', () => {
  const w=5, m={w,h:w,t:new Uint8Array(w*w),reg:new Uint8Array(w*w).fill(1),solid:new Uint8Array(w*w)};
  for(const [x,y,t] of [[1,1,3],[2,1,3],[1,2,3],[1,3,2],[2,3,2],[3,3,2],[4,3,2]])m.t[y*w+x]=t;
  const before=m.t.slice(), paths=[], marks=[];
  let points;
  const g={beginPath(){points=[];},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},
    closePath(){},fill(){paths.push(points);},stroke(){marks.push(points);},fillRect(...rect){marks.push(rect);},save(){},restore(){}};
  TerrainEdges.paint(m,g,0,0,w,48,true);
  assert.deepEqual(m.t,before);
  assert.ok(m.solid.every(n=>n===0));
  assert.ok(paths.some(p=>p.some(([x,y])=>x===48&&y===48)&&p.some(([x,y])=>x>48&&y>48)),'mitered outer block');
  assert.ok(paths.some(p=>p.some(([x,y])=>x===96&&y===48)&&p.some(([x,y])=>x>96&&y===48)),'masonry continues past the tile seam');
  assert.ok(paths.some(p=>p.length===10),'irregular shoulder contour');
  assert.ok(marks.some(a=>a.length===4&&a[1]===144&&a[2]===48),'center soil is compacted as a continuous color wash');
  assert.ok(marks.some(p=>p.length===2),'small grass growth along the shoulder');
});
