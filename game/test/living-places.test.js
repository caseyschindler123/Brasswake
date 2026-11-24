const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const Buildings=require('../src/buildings.js');
const Dungeons=require('../src/dungeons.js');

function harness(){
  const canvases=[];
  function canvas(w,h){
    const ops=[],c={width:w,height:h,ops};
    const g=new Proxy({canvas:c,ops,createLinearGradient(){return {addColorStop(){}};},createPattern(){return 'pattern';}},
      {get(target,key){if(key in target)return target[key];return (...args)=>ops.push([key,...args]);},set(target,key,value){target[key]=value;return true;}});
    c.getContext=()=>g;canvases.push(c);return c;
  }
  const context={T:16,K:3,TS:48,CS:16,Buildings,Dungeons,Map,Set,Uint8Array,Math,
    mk:canvas,document:{createElement:()=>canvas(0,0)},Path2D:class{moveTo(){}lineTo(){}closePath(){}},
    Interiors:{timber:Array(9).fill('#796047'),trim:Array(9).fill('#826f62')},
    performance:{now:()=>1000},cam:{x:0,y:0},vw:200,vh:220,map:null,world:null,P:{x:0,y:0,fx:0,fy:0},
    have:()=>false,artRect:()=>null,img:()=>{},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
    emit:()=>{},chartSteps:[[1,0],[-1,0],[0,1],[0,-1]],lw:c=>c.width/3,lh:c=>c.height/3};
  context.dirOf=(dx,dy)=>dx>0?'s':dx<0?'l':dy>0?'f':'b';
  context.npcStepClear=(e,dx,dy)=>{
    const m=context.map,i=(e.y+dy)*m.w+e.x+dx;
    return !m.solid[i]&&(!m.occ.has(i)||m.occ.get(i)===e);
  };
  context.sit=(m,e,x,y)=>{
    const old=e.y*m.w+e.x;if(m.occ.get(old)===e)m.occ.delete(old);
    m.occ.set(y*m.w+x,e);e.x=x;e.y=y;
  };
  vm.createContext(context);
  for(const file of ['building_view.js','scene_dungeon.js','scene_venues.js','scene_living.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
  vm.runInContext('globalThis.api={BuildingView,venueDoorImage,venueDoorArt,venueDoors,venueEntrance,livingDraw,livingLayers,LIVING_ART,livingNpcStep,LIVING_NPCS,dungeonDress,dungeonRoomUse,dungeonFixture,dungeonPaint,dungeonFloorDetail,dungeonLiving};',context);
  return {context,canvases,canvas,...context.api};
}

function polygon(c){
  const result=[];
  for(const [op,...a]of c.ops){if(op==='fill'&&result.length)break;if(op==='moveTo'||op==='lineTo')result.push(a);}
  return result;
}

test('closed leaves fill the entire structural doorway and all animation frames stay inside their canvases',()=>{
  const h=harness();
  for(const side of ['north','east','south','west']){
    const art=h.venueDoorImage(1,side,0),points=polygon(art.c).map(([x,y])=>[x-art.ax,y-art.ay]);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    assert.equal(Math.min(...ys),-33,side);
    if(side==='north'||side==='south'){
      assert.equal(Math.min(...xs),-8);assert.equal(Math.max(...xs),8);assert.equal(Math.max(...ys),0);
    }else assert.equal(Math.max(...ys),16);
    for(let f=0;f<=8;f++){
      const a=h.venueDoorImage(1,side,f);
      for(const [x,y]of polygon(a.c))assert.ok(x>=0&&x<=a.c.width/3&&y>=0&&y<=a.c.height/3,`${side}/${f}: ${x},${y}`);
    }
  }
});

test('side jamb feet and moving leaf share the exact threshold endpoints',()=>{
  const h=harness(),plan=Buildings.compile({id:'doors',w:7,h:7,doors:['north','east','south','west']});
  const view=h.BuildingView.create(plan,{piece:()=>null});
  for(const d of plan.doors.filter(d=>d.facing.x)){
    const boundary=(d.x+(d.facing.x>0?1:0))*16;
    const jamb=view.walls.find(a=>a.x===boundary-4&&a.y===d.y*16-33&&a.image.height===52*3);
    assert.ok(jamb,d.side);
    const posts=jamb.image.ops.filter(([op,x,y,w,height])=>op==='fillRect'&&w===2.5&&height===33);
    assert.deepEqual(posts.map(p=>p[2]+33),[33,49]);
  }
});

test('all dungeon themes get purposeful furnishings exclusively in recesses without changing navigation or entity anchors',()=>{
  const h=harness(),kinds=new Set();let count=0;
  for(let r=1;r<=8;r++)for(const f of Dungeons.get(r).floors){
    const layout=Dungeons.build(r,f.f),before=JSON.stringify(layout),props=h.dungeonDress(layout,r);
    assert.ok(props.length>=12,`${r}/${f.f}: ${props.length}`);
    for(const p of props){
      assert.equal(layout.tiles[p.y*layout.w+p.x],Dungeons.WALL);
      if(p.recess){
        assert.equal(p.recess.side,'south');
        assert.ok([1,2,3].some(dy=>layout.tiles[(p.recess.y-dy)*layout.w+p.x]===Dungeons.FLOOR));
        for(const dy of [0,1])for(const dx of [-1,0,1])assert.equal(layout.tiles[(p.recess.y+dy)*layout.w+p.x+dx],Dungeons.WALL);
        assert.equal(p.sc,.75,'the full image fits inside the solid 3×2 recess');
      }else assert.equal(layout.tiles[(p.y+1)*layout.w+p.x],Dungeons.FLOOR);
      assert.ok(!layout.entities.some(e=>Math.abs(e.x-p.x)<2&&Math.abs(e.y-p.y)<3));
      kinds.add(p.kind);count++;
    }
    assert.equal(JSON.stringify(layout),before);
  }
  assert.ok(kinds.size>=7);assert.ok(count>500);
  assert.equal(h.dungeonRoomUse('Empty Bunks',1),'bed');
  assert.equal(h.dungeonRoomUse('Scribe’s Bench',1),'records');
  assert.equal(h.dungeonRoomUse('Pump Room',1),'wheel');
});

test('all eight arrivals have nearby near-wall recesses with their complete fixture behind solid ground',()=>{
  const h=harness();
  for(let r=1;r<=8;r++){
    const layout=Dungeons.build(r,0),room=layout.rooms[0];
    const props=h.dungeonDress(layout,r),p=props.find(p=>p.recess&&p.recess.y===room.y+room.h&&Math.abs(p.x-room.cx)<=3);
    assert.ok(p,`${r}: a near-wall display can be seen from the entry`);
    const art=h.dungeonFixture(p.kind.slice('dn_fixture_'.length),r);
    const left=p.x*16+8-art.ax*p.sc,top=p.y*16+(p.hang?14:15)-art.ay*p.sc;
    const right=left+art.c.width/3*p.sc,bottom=top+art.c.height/3*p.sc;
    assert.ok(top>=p.recess.y*16&&bottom<=(p.recess.y+2)*16,`${r}: fixture stays behind the near boundary`);
    assert.ok(left>=(p.x-1)*16&&right<=(p.x+2)*16);
  }
});

test('purpose fixtures prefer proportional painted atlas cuts and replace cached fallbacks when art arrives',()=>{
  const h=harness(),atlas={},cuts={};let ready=false;
  const choices={wheel:'control',forge:'control',tomb:'landmark',crystal:'landmark',roots:'landmark',records:'lore',shelf:'lore',bed:'decoration',crates:'decoration'};
  for(let r=1;r<=8;r++)for(const type of ['control','landmark','lore','decoration']){
    const rc=[r,type,60+r*3,90-r*2];atlas[r+'-'+type]=rc;
    cuts[rc.join('/')]=h.canvas(rc[2],rc[3]);
  }
  h.context.DungeonArt={image:'dun/kit.webp',props:atlas};
  h.context.artRect=(name,rc)=>ready?{c:cuts[rc.join('/')]}:null;
  const fallback=h.dungeonFixture('forge',5);
  assert.equal(fallback.c.ops.some(([op])=>op==='drawImage'),false);
  assert.equal(h.dungeonFixture('forge',5),fallback);
  ready=true;
  const upgraded=h.dungeonFixture('forge',5);
  assert.notEqual(upgraded,fallback);
  for(let r=1;r<=8;r++)for(const [kind,type]of Object.entries(choices)){
    const art=h.dungeonFixture(kind,r),op=art.c.ops.find(([op])=>op==='drawImage');
    assert.ok(op,`${r}/${kind}: uses painted art`);
    const [,source,x,y,width,height]=op;
    assert.equal(source,cuts[atlas[r+'-'+type].join('/')]);
    assert.ok(Math.abs(width/height-source.width/source.height)<1e-9,'preserves painted proportions');
    assert.ok(x>=2&&y>=3&&x+width<=46&&y+height<=37.000001,'fits existing fixture frame');
    assert.equal(h.dungeonFixture(kind,r),art,'reuses the ready painted canvas');
  }
});

test('near and side cutaway faces, coping and piers stay inside already-solid tiles',()=>{
  const h=harness(),w=16,dt=new Uint8Array(w*w),room={x:3,y:3,w:8,h:7,cx:7,cy:6,name:'Test'};
  for(let y=3;y<10;y++)for(let x=3;x<11;x++)dt[y*w+x]=1;
  const m={w,h:w,r:1,f:0,dt,props:[],layout:{theme:Dungeons.themes[1],rooms:[],entities:[]}};
  const before=dt.slice(),c=h.canvas(800,800);h.dungeonPaint(m,c.getContext('2d'),0,0);
  // The near-wall face starts below the last floor row, in wall row 10.
  assert.ok(c.ops.some(([op,x,y,width,height])=>op==='fillRect'&&x===5*48&&y===10*48+5&&width===48&&height===25));
  assert.ok(c.ops.some(([op,x,y,width,height])=>op==='fillRect'&&x===11*48&&y===6*48&&width===22&&height===48));
  assert.ok(c.ops.some(([op,x,y,width,height])=>op==='fillRect'&&x===4*48+13&&y===10*48+4&&width===16&&height===29),'periodic front pier');
  assert.deepEqual(dt,before);
});

test('wall faces have actual coping and plinth depth; visible water and motes remain presentation only',()=>{
  const h=harness(),w=24,dt=new Uint8Array(w*w).fill(1);dt[5*w+5]=0;dt[8*w+8]=2;
  const map={w,h:w,r:1,f:0,dt,solid:new Uint8Array(w*w),layout:{theme:Dungeons.themes[1],rooms:[]}};
  const c=h.canvas(800,800),g=c.getContext('2d');
  h.dungeonPaint(map,g,0,0);
  assert.ok(c.ops.some(([op,x,y,width,height])=>op==='fillRect'&&x===240&&y===248&&width===48&&height===40));
  assert.ok(c.ops.some(([op,x,y,width,height])=>op==='fillRect'&&x===240&&y===283&&width===48&&height===5));
  map.dungeonFloor=true;h.context.map=map;
  const before=JSON.stringify(map);h.dungeonLiving(g,0,0,1000);
  assert.ok(c.ops.some(([op])=>op==='ellipse'));assert.equal(JSON.stringify(map),before);
  const beforeOps=c.ops.length;h.dungeonLiving(g,1000,1000,1000);
  assert.equal(c.ops.slice(beforeOps).some(([op])=>op==='ellipse'),false,'offscreen water receives no draw work');
});

test('frontage decoration and roof smoke leave collision and occupied ground untouched',()=>{
  const h=harness(),plan=Buildings.compile({id:'inn',w:7,h:7,doors:['south','east']}),b={x:2,y:2,w:7,h:7,by:144,r:1,slot:'tavern',modular:true,fa:1,plan};
  const map={w:32,h:32,blds:[b],solid:new Uint8Array(1024),ents:[],occ:new Map()};h.context.map=map;
  const before=JSON.stringify(map),list=[];
  for(const d of plan.doors)h.venueEntrance(b,d,list,0,0);
  h.livingDraw(h.canvas(300,300).getContext('2d'),0,0,1234);h.livingLayers(list,1234);
  assert.ok(list.length>=7,'two entrances, wall-side stock, chimney and bounded smoke');
  assert.equal(JSON.stringify(map),before);
});

test('animated door frames and settlement decoration retain bounded caches across the whole world',()=>{
  const h=harness();
  for(let r=1;r<=8;r++)for(const side of ['north','east','south','west'])for(let f=0;f<=8;f++)h.venueDoorImage(r,side,f);
  assert.equal(h.venueDoorArt.size,96);
  const plan=Buildings.compile({id:'fronts',w:7,h:7,doors:['south','east']});
  for(let r=1;r<=8;r++)for(const slot of ['shop','tavern','work','bank','guild','civic','temple','healer','house','warehouse','casino'])
    for(const d of plan.doors)h.venueEntrance({r,slot,w:7,h:7,fa:1,plan},d,[],0,0);
  assert.equal(h.LIVING_ART.size,96);
});

function routineFixture(){
  const h=harness(),w=30,plan=Buildings.compile({id:'shop',w:7,h:7,doors:['south']}),b={x:7,y:4,w:7,h:7,r:1,slot:'shop',modular:true,plan};
  const map={w,h:w,blds:[b],props:[],solid:new Uint8Array(w*w),t:new Uint8Array(w*w).fill(3),reg:new Uint8Array(w*w).fill(1),occ:new Map(),venueRoofs:new Map(),doorApproaches:new Set()};
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){map.solid[y*w+x]=1;map.venueRoofs.set(y*w+x,b);}
  for(const d of plan.doors)for(const p of [d.outside,d.inside,d])map.doorApproaches.add((b.y+p.y)*w+b.x+p.x);
  const e={x:10,y:15,fx:10,fy:15,r:1,kind:'folk',sub:'Townsfolk',name:'Greda',wander:2,solid:1,t:0,home:[10,15]};
  map.occ.set(e.y*w+e.x,e);h.context.map=map;h.context.world=map;h.context.P={x:29,y:29,fx:29,fy:29};
  return {h,map,e};
}

test('town routines deterministically visit reachable frontage stops, face activity and remain within their original public home radius',()=>{
  const play=()=>{
    const {h,map,e}=routineFixture(),seen=[];let pauses=0;
    for(let n=0;n<150;n++){
      assert.equal(h.livingNpcStep(e,.05),true);
      const i=e.y*map.w+e.x;
      assert.ok(!map.solid[i]&&!map.venueRoofs.has(i)&&!map.doorApproaches.has(i));
      assert.ok(Math.hypot(e.x-10,e.y-15)<=8);assert.equal(map.occ.get(i),e);
      if(e.t>2){pauses++;assert.ok(['browse','rest','unload'].includes(e.livingActivity));assert.ok(['l','s','b','f'].includes(e.dir));}
      seen.push([e.x,e.y,e.t,e.dir]);
      e.fx=e.x;e.fy=e.y;e.tx=null;e.ty=null;e.t=0;
    }
    assert.ok(pauses>=4);assert.ok(new Set(seen.map(p=>p.slice(0,2).join(','))).size>=5);return seen;
  };
  assert.deepEqual(play(),play());
});

test('routines never displace the hero or a new occupant and do not handle teachers, service staff, rivals or road travellers',()=>{
  const {h,map,e}=routineFixture();assert.equal(h.livingNpcStep(e,.05),true);
  e.fx=e.x;e.fy=e.y;e.tx=null;e.ty=null;
  const state=h.LIVING_NPCS.get(e),[nx,ny]=state.path[0],before=[e.x,e.y];
  h.context.P={x:nx,y:ny,fx:nx,fy:ny};assert.equal(h.livingNpcStep(e,.05),true);assert.deepEqual([e.x,e.y],before);
  h.context.P={x:29,y:29,fx:29,fy:29};e.t=0;
  const blocker={kind:'npc'},block=ny*map.w+nx;map.occ.set(block,blocker);
  assert.equal(h.livingNpcStep(e,.05),true);assert.deepEqual([e.x,e.y],before);assert.equal(map.occ.get(block),blocker);
  for(const patch of [{kind:'npc'},{kind:'rival'},{venueId:'shop'},{i:0},{quest:'intro'},{sub:'On the road'}])
    assert.equal(h.livingNpcStep({...e,t:0,...patch},.05),false);
  h.context.map={...map};assert.equal(h.livingNpcStep(e,.05),false,'other maps never reuse a world routine');
});

test('window facade caps are drawn above painted panels without changing the structural plan',()=>{
  const h=harness(),plan=Buildings.compile({id:'windows',w:9,h:7,doors:['south']}),before=JSON.stringify(plan);
  const view=h.BuildingView.create(plan,{piece:()=>null});
  const caps=view.walls.filter(a=>a.image.ops.some(([op,x,y,w,height])=>op==='fillRect'&&y===9&&height===1.5)
    ||a.image.ops.some(([op,x,y,w,height])=>op==='fillRect'&&y===5&&height===2));
  assert.ok(caps.length>0);assert.equal(JSON.stringify(plan),before);
});

test('all eight dungeon entrances have deterministic room-scale floor insets near the phone view without changing authored navigation',()=>{
  const h=harness(),signatures=new Set();
  for(let r=1;r<=8;r++){
    const layout=Dungeons.build(r,0),m={r,f:0,w:layout.w,h:layout.h,dt:layout.tiles,layout},R=layout.rooms[0];
    const before=JSON.stringify(layout),c=h.canvas(1000,1000),g=c.getContext('2d');let painted=0;
    for(let y=layout.entry[1]-2;y<=layout.entry[1]+2;y++)for(let x=layout.entry[0]-2;x<=layout.entry[0]+2;x++)
      if(h.dungeonFloorDetail(m,g,x,y,R))painted++;
    assert.ok(painted>=5,`${r}: entrance detail must be visible near the arrival`);
    const strokes=c.ops.filter(([op])=>op==='stroke'||op==='strokeRect'||op==='ellipse');
    assert.ok(strokes.length>0,`${r}: embedded drains, inlays, seams or borders`);
    signatures.add(JSON.stringify(strokes));
    const again=h.canvas(1000,1000);
    for(let y=layout.entry[1]-2;y<=layout.entry[1]+2;y++)for(let x=layout.entry[0]-2;x<=layout.entry[0]+2;x++)
      h.dungeonFloorDetail(m,again.getContext('2d'),x,y,R);
    assert.deepEqual(again.ops,c.ops);assert.equal(JSON.stringify(layout),before);
  }
  assert.equal(signatures.size,8);
});

test('floor insets skip bridges, hazards and entity feet, and room purposes change the embedded markings',()=>{
  const h=harness(),w=20,dt=new Uint8Array(w*w).fill(1),R={x:2,y:2,w:15,h:13,cx:9,cy:8,name:'Pump Room'};
  const m={w,h:w,r:1,f:0,dt,layout:{theme:Dungeons.themes[1],rooms:[R],entities:[{kind:'dtravel',x:9,y:8}]}};
  for(const [x,y,t]of [[4,4,2],[5,4,3],[6,4,4],[9,8,1],[10,9,1]]){
    dt[y*w+x]=t;const c=h.canvas(100,100);
    assert.equal(h.dungeonFloorDetail(m,c.getContext('2d'),x,y,R),false,`${x}/${y}/${t}`);assert.equal(c.ops.length,0);
  }
  const pump=h.canvas(1000,1000),bunks=h.canvas(1000,1000);
  assert.equal(h.dungeonFloorDetail(m,pump.getContext('2d'),12,11,R),true);
  assert.equal(h.dungeonFloorDetail(m,bunks.getContext('2d'),12,11,{...R,name:'Empty Bunks'}),true);
  assert.notDeepEqual(pump.ops,bunks.ops);
});
