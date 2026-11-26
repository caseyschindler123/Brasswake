const assert=require('node:assert/strict');
const {test}=require('node:test');
const Worlds=require('../src/character_worlds');

test('three worlds independently own five character slots and shared reward state',()=>{
  const a=Worlds.fresh();
  assert.equal(a.worlds.length,3);
  for(const w of a.worlds)assert.equal(w.slots.length,5);
  a.slots[0]={v:8,name:'Main',bank:{gold:17,items:[]}};
  a.slots[1]={v:8,name:'Support',bank:{gold:2,items:[]}};
  a.main=0;a.cur=1;a.homes.push({id:'house',store:[{id:'sword'}]});a.atlas={owned:true,homeId:'house'};
  for(const key of ['codex','paid','djp','cmds'])a[key].earned=1;
  assert.equal(Worlds.select(a,1),true);
  assert.equal(a.cur,-1);assert.equal(a.main,-1);assert.deepEqual(a.homes,[]);assert.equal(a.atlas,undefined);
  for(const key of ['codex','paid','djp','cmds'])assert.deepEqual(a[key],{});
  a.slots[0]={v:8,name:'Other main',bank:{gold:55,items:[]}};a.main=0;a.cur=0;
  Worlds.select(a,0);
  assert.equal(a.slots[0].bank.gold,17);assert.equal(a.slots[1].bank.gold,2);
  assert.equal(a.homes[0].store[0].id,'sword');assert.equal(a.cur,1);assert.equal(a.atlas.homeId,'house');
  assert.equal(Worlds.select(a,3),false);assert.equal(a.world,0);
});

test('legacy accounts retain every character, bank, main and household in world one',()=>{
  for(const version of [6,7,8]){
    const legacy={v:version,rev:24,at:61,cur:4,main:2,wv:3,
      slots:Array.from({length:5},(_,i)=>({v:7,name:'Legacy '+i,bank:{gold:i*10,items:[{id:'i'+i}]},boss:{1:1}})),
      homes:[{id:'home',store:[{id:'heirloom'}]}],codex:{rare:1},paid:{job:1},djp:{m1:1},cmds:{intro:2}};
    const a=Worlds.normalize(legacy);
    assert.equal(a.v,9);assert.equal(a.main,2);assert.equal(a.cur,4);assert.equal(a.rev,24);
    assert.deepEqual(a.slots,legacy.slots);assert.deepEqual(a.homes,legacy.homes);
    assert.deepEqual(a.cmds,legacy.cmds);assert.equal(a.wv,3);
    for(const w of a.worlds.slice(1)){assert.deepEqual(w.slots,Array(5).fill(null));assert.deepEqual(w.homes,[]);}
    a.homes[0].store.push({id:'new'});assert.equal(legacy.homes[0].store.length,1);
  }
});

test('serialized reload, cloud and import normalization preserve all worlds without reference leakage',()=>{
  const a=Worlds.fresh();
  for(let i=0;i<3;i++){
    Worlds.select(a,i);a.slots[0]={v:8,name:'World '+i,bank:{gold:100+i,items:[]}};a.main=0;a.cur=0;
    a.homes.push({id:'same-coordinate-house',x:32,y:45,store:[{id:'world-'+i}]});a.cmds.lesson=i+1;a.paid.job=i+1;
  }
  const json=JSON.stringify(a);assert.equal(Object.hasOwn(JSON.parse(json),'slots'),false);
  for(const input of [a,JSON.parse(json)]){
    const restored=Worlds.normalize(input);assert.equal(restored.world,2);
    for(let i=0;i<3;i++){
      Worlds.select(restored,i);assert.equal(restored.slots[0].name,'World '+i);assert.equal(restored.homes[0].store[0].id,'world-'+i);assert.equal(restored.paid.job,i+1);
    }
    restored.worlds[0].homes[0].store[0].id='changed';
    assert.equal(restored.worlds[1].homes[0].store[0].id,'world-1');assert.equal(a.worlds[0].homes[0].store[0].id,'world-0');
  }
});

test('normalization bounds worlds and slots, rejects unsupported versions and ignores root legacy shadows',()=>{
  assert.equal(Worlds.normalize({v:99}),null);
  const a=Worlds.normalize({v:9,world:8,slots:[{name:'leak'}],homes:[{id:'leak'}],worlds:[{slots:[{},null,null,null,null,{name:'sixth'}],cur:5,main:5},null,null,{homes:[{id:'fourth'}]}]});
  assert.equal(a.world,0);assert.equal(a.worlds.length,3);assert.equal(a.slots.length,5);assert.equal(a.cur,-1);assert.equal(a.main,-1);assert.deepEqual(a.homes,[]);
});

test('fifteen fully explored characters and bounded learning mirrors fit device storage without sharing discoveries',()=>{
  const D=require('../src/dungeons'),P=require('../src/dungeon_progress'),C=require('../src/cartography');
  const Learning=require('../src/learning'),learning=Learning.fresh();
  Learning.introduce(learning,Learning.CONCEPTS.map(c=>c.id));
  for(let circle=0;circle<=8;circle++)for(const task of Learning.pool(circle))Learning.record(learning,task,{ok:false,first:true,sql:task.sql});
  const a=Worlds.fresh(),surface=C.encode(C.createMask().fill(63));
  for(const world of a.worlds)world.learning=Learning.normalize(learning);
  for(let world=0;world<3;world++)for(let slot=0;slot<5;slot++){
    const s={v:8,name:`Explorer ${world}-${slot}`,learningSnapshot:Learning.normalize(learning),cartography:{v:1,explored:surface,maps:{}},dungeons:{}};
    for(let r=1;r<=8;r++){const dungeon=D.get(r),p=P.ensure(s,r,'today');for(let f=0;f<dungeon.floors.length;f++)p.seen[f]=P.packSeen(new Uint8Array(124*109).fill(1));}
    a.worlds[world].slots[slot]=s;
  }
  const json=JSON.stringify(a),bytes=Buffer.byteLength(json,'utf16le');
  assert.ok(bytes<4*1024*1024,`complete fifteen-character exploration uses ${bytes} UTF-16 bytes`);
  const restored=Worlds.normalize(JSON.parse(json));
  restored.worlds[0].slots[0].cartography.explored='';
  assert.equal(restored.worlds[2].slots[4].cartography.explored,surface);
  assert.deepEqual(restored.worlds[2].learning,learning);
  assert.deepEqual(restored.worlds[2].slots[4].learningSnapshot,learning);
  assert.ok(P.unpackSeen(restored.worlds[2].slots[4].dungeons[8].seen[3],124*109).every(v=>v===1));
});
