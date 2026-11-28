const {test}=require('node:test'),assert=require('node:assert/strict');
const Profiles=require('../src/character_profiles'),NPC=require('../src/npc_appearance'),View=require('../src/painted_character_view');
const TwoBody=require('../src/painted_two_body');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,name)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');

test('body profiles are authored from identity and occupation, independently of random appearance seeds',()=>{
  for(const[name,[build,height,reason]]of Object.entries(Profiles.named)){
    assert.ok(Number.isInteger(build)&&build>=0&&build<3);assert.ok(height>=.95&&height<=1.05);assert.ok(reason.length>20);
    assert.deepEqual(Profiles.npc({name,kind:'folk',x:1,y:2,r:1}),Profiles.npc({name,kind:'folk',x:998,y:200,r:8,role:'miner'}));
  }
  assert.equal(NPC.describe({kind:'guide',name:'Tamsin'}).build,1);
  assert.equal(NPC.describe({kind:'npc',name:'Ysolt Karn'}).build,1);
  assert.equal(NPC.describe({kind:'npc',name:'Maud Tallow'}).build,2);
  assert.equal(Profiles.npc({kind:'folk',role:'miner'}).build,1);
  assert.equal(Profiles.npc({kind:'folk',sub:'Off-duty sailor'}).build,1);
  assert.equal(Profiles.npc({kind:'folk',name:'Ordinary resident'}).build,0);
});

test('sex, build and outfit map bijectively to the thirty fitted bodies',()=>{
  const indices=new Set();for(let combo=1;combo<=10;combo++)for(let build=0;build<3;build++)indices.add(Profiles.index({combo,build}));
  assert.equal(indices.size,30);assert.equal(Math.min(...indices),1);assert.equal(Math.max(...indices),30);
  assert.equal(Profiles.index({combo:6,build:999}),16);
});

test('dye and special materials affect only their semantic painted surfaces',()=>{
  const ids=[1,2,3,4,5,6,7],mask=new Uint8ClampedArray(ids.flatMap(id=>[id*24,0,0,255]));
  const original=new Uint8ClampedArray(ids.flatMap(()=>[160,132,104,211])),palette={shadow:'#103060',mid:'#356cac',light:'#b0cfff'};
  const dyed=View.tintPixels(original.slice(),mask,{cloth:'#9a2244',skin:1});
  assert.notDeepEqual(dyed.slice(0,4),original.slice(0,4));assert.deepEqual(dyed.slice(4),original.slice(4));
  for(const [family,id]of [['leather',2],['metal',3]]){
    const tinted=View.tintPixels(original.slice(),mask,{armorMaterial:{family,palette},skin:1});
    for(let i=0;i<ids.length;i++)if(ids[i]===id)assert.notDeepEqual(tinted.slice(i*4,i*4+3),original.slice(i*4,i*4+3));else assert.deepEqual(tinted.slice(i*4,i*4+4),original.slice(i*4,i*4+4));
    for(let i=3;i<tinted.length;i+=4)assert.equal(tinted[i],211);
  }
});

test('equipment selects complete coordinated action poses',()=>{
  assert.equal(View.state({wkind:'crossbow',wpn:27},13),'crossbow');assert.equal(View.state({wkind:'bow'},13),'bow');assert.equal(View.state({wkind:'book'},16),'book');
  assert.equal(View.state({wkind:'long'},10),'swingtwo');assert.equal(View.state({wkind:'staff'},13),'thrusttwo');
  assert.equal(View.state({},23),'sit');assert.equal(View.state({},22),'block');assert.equal(View.state({},20),'hit');assert.equal(View.state({},19),'fall');
});

test('the two approved fittings cover every outfit, gait and heading at the approved phase and grip',()=>{
  const {painted,twoBodyMovement:art}=vm.runInNewContext(
    read('game/src/artpainted.js').toString()+read('game/src/artpaintedtwo.js').toString()+';ArtData;',
    {ArtData:{},atob}
  );
  for(const gait of ['walk','run']){
    const delays=art.delays[gait],duration=delays.reduce((sum,ms)=>sum+ms,0);
    let elapsed=0;
    for(const [phase,ms]of delays.entries()){
      assert.equal(TwoBody.indexFor(art,gait,(elapsed+.01)/duration),phase);
      assert.equal(TwoBody.indexFor(art,gait,(elapsed+ms-.01)/duration),phase);
      elapsed+=ms;
    }
  }
  const families=['tunic','robe','leather','mail','plate','knight'];
  for(const [outfit,family]of families.entries()){
    assert.equal(Object.keys(art.banks[family]).length,128);
    assert.equal(Object.keys(art.static[family].sit).length,10);
    assert.equal(art.dolls[family].length,2);
    for(const [sex,actor]of ['man','woman'].entries()){
      const combo=sex*5+Math.min(5,outfit+1);
      const look={combo,headStyle:TwoBody.headStyle(sex),armorGear:family==='knight'?'armor-knights-plate':null};
      assert.ok(TwoBody.supports(look));
      const fit=painted.combos[Profiles.index(look)];
      for(const gait of ['walk','run'])for(const [direction,heading]of art.heading.entries()){
        const legacy=fit.states[gait].frames[View.sourceDirection(direction,painted)][0];
        for(let phase=0;phase<8;phase++){
          const [index,mirror]=art.frames[actor+'/'+gait+'/'+heading][phase];
          const original=art.banks[family][index],frame=TwoBody.motion(art,look,gait,direction,phase,legacy);
          const [x,y]=original.palms[Number(mirror)];
          const sign=mirror?-1:1;
          assert.equal(frame.file,original.file);
          assert.equal(frame.mirror,mirror);
          assert.equal(frame.sockets.rightPalm.p[0],art.origin[0]+(x-art.cell/2)*art.scale*sign);
          assert.equal(frame.sockets.rightPalm.p[1],art.origin[1]+(y-art.ground)*art.scale);
          assert.ok(Number.isFinite(frame.carry.angle)&&frame.carry.length>0);
          assert.equal(frame.supports.length,legacy.supports.length);
          assert.equal(frame.flight,legacy.flight);
          const visibleSoles=mirror?original.soles.toReversed():original.soles;
          for(const [foot,[soleX,soleY]]of visibleSoles.entries()){
            const point=frame.feet[foot];
            assert.equal(point[0],art.origin[0]+(soleX-art.cell/2)*art.scale*sign);
            assert.equal(point[1],art.origin[1]+(soleY-art.ground)*art.scale);
            assert.ok(Math.abs((point[2]-point[1])-(legacy.feet[foot][2]-legacy.feet[foot][1]))<1e-9);
            assert.equal(point[3],legacy.feet[foot][3]);
          }
        }
      }
      for(let direction=0;direction<8;direction++)assert.ok(TwoBody.actionHead(art,look,direction)?.file);
      assert.equal(TwoBody.supports({...look,headStyle:sex?'f-bun':'m-long-beard'}),false);
      assert.equal(TwoBody.supports({...look,build:2}),false);
    }
  }
});

test('painted body and equipment banks match logical world headings',()=>{
  const {painted}=vm.runInNewContext(read('game/src/artpainted.js').toString()+';ArtData;',{ArtData:{},atob});
  const moves=[[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
  const body=painted.combos[1], cloak=painted.slots[0].cloak['cloak-wool'];
  for(const [heading,[dx,dy]] of moves.entries()){
    assert.equal(NPC.direction(dx,dy),heading);
    const source=View.sourceDirection(heading,painted);
    assert.equal(painted.sourceDirections[source],heading,'atlas heading '+heading);
    for(const [state,bank] of Object.entries(body.states)){
      const frame=bank.frames[source][0], layer=cloak.states[state].frames[source][0];
      assert.deepEqual(layer.head,frame.head,state+' cloak alignment at heading '+heading);
    }
    for(const state of ['walk','run']){
      const cycle=body.states[state].frames[source];
      // Summing both feet across the cycle separates the facing from individual foot turns.
      const toes=cycle.reduce(([x,y],{sockets:{leftFoot,rightFoot}})=>[
        x+leftFoot.axis[0]+rightFoot.axis[0],y+leftFoot.axis[1]+rightFoot.axis[1],
      ],[0,0]).map(sum=>sum/cycle.length);
      if(dx)assert.ok(toes[0]*dx>.45,state+' toes must point along horizontal heading '+heading);
      if(dy)assert.ok(toes[1]*dy>.45,state+' toes must point along vertical heading '+heading);
    }
  }
});

test('independent gloves and boots select the matching fitted profile and keep cloth dye separate',()=>{
  const palette={shadow:'#263c51',mid:'#6885a0',light:'#d3e4f0'},a={combo:7,build:2,skin:1,cloth:'#cc2255',handMaterial:{family:'metal',palette},footMaterial:{family:'leather',palette}};
  assert.deepEqual(View.slotSources(a),[{id:8,index:30,outfit:4},{id:9,index:28,outfit:2}]);
  const pixels=new Uint8ClampedArray([180,145,110,255,160,140,120,255,185,140,105,255]),mask=new Uint8ClampedArray([8*24,0,0,255,9*24,0,0,255,4*24,0,0,255]);
  const result=View.tintPixels(pixels.slice(),mask,a);assert.notDeepEqual(result.slice(0,8),pixels.slice(0,8));assert.deepEqual(result.slice(8),pixels.slice(8));
});

test('named fitted slot banks retain identity and leather boot dyes do not recolor fixed trim',()=>{
  const bank={},art={slots:{5:{hands:{'hands-thief':bank},feet:{'feet-riding':bank},cloak:{'cloak-royal':bank}}}},
    a={combo:7,build:2,gear:{hands:'hands-thief',feet:'feet-riding',cloak:'cloak-royal'}};
  assert.deepEqual(View.slotSources(a,art).map(s=>[s.id,s.slot,s.bank]),[[8,'hands',bank],[9,'feet',bank],[10,'cloak',bank]]);
  const pixels=new Uint8ClampedArray([150,110,75,255,180,145,90,255]),mask=new Uint8ClampedArray([6*24,0,9*24,255,7*24,0,9*24,255]);
  const result=View.tintPixels(pixels.slice(),mask,{combo:1,footMaterial:{palette:{shadow:'#19374b',mid:'#386f99',light:'#b4d8ed'}}});
  assert.notDeepEqual(result.slice(0,4),pixels.slice(0,4));assert.deepEqual(result.slice(4),pixels.slice(4));
});

test('profile width changes preserve anatomical arm lengths and shared hand sizes',()=>{
  const {make}=require('../../arttools/painted_profiles'),mesh=vm.runInNewContext(read('game/src/human_mesh_data.js').toString()+';HumanMeshData;');
  const length=b=>Math.hypot(...b.end.map((n,i)=>n-b.start[i]));
  for(let sex=0;sex<2;sex++)for(let build=0;build<3;build++){
    const profile=make(mesh,sex,build);
    for(let i=0;i<mesh.bones.length;i++)if(/^(upperArm|foreArm|hand|finger)/.test(mesh.bones[i].name))assert.ok(Math.abs(length(profile.bones[i])-length(mesh.bones[i]))<1e-10,mesh.bones[i].name);
  }
});

test('committed painted art and coordinates retain their reviewed sources and encoder inputs',()=>{
  for(const file of ['arttools/painted_release_manifest.json','arttools/painted_heads_manifest.json']){
    const manifest=JSON.parse(read(file));
    for(const f of manifest.inputs)assert.equal(hash(read(f.path).toString().replaceAll('\r\n','\n')),f.sha256,f.path+' requires reviewed replay');
    for(const f of manifest.files){const b=read('game/'+f.path);assert.equal(b.length,f.size,f.path);assert.equal(hash(b),f.sha256,f.path);}
    for(const f of [manifest.metadata,manifest.gaits].filter(Boolean))assert.equal(hash(read(f.path).toString().replaceAll('\r\n','\n')),f.sha256,f.path);
  }
});

test('all thirty painted fittings have complete unclipped states, contact and attachment metadata',()=>{
  const {painted}=vm.runInNewContext(read('game/src/artpainted.js').toString()+';ArtData;',{ArtData:{},atob}),gaits=require('../src/painted_gaits'),states=['idle','walk','run','swing','swingtwo','thrust','thrusttwo','bow','cast','book','crossbow','block','hit','fall','sit'];
  const manifest=JSON.parse(read('arttools/painted_release_manifest.json')),files=new Map(manifest.files.map(f=>[f.path.slice(4),f]));
  assert.equal(Object.keys(painted.combos).length,30);assert.equal(painted.frames,24);
  assert.equal(painted.directions,8);assert.equal(painted.actions,12);assert.equal(painted.profileGaits.length,6);
  for(const kind of ['walk','run']){assert.equal(painted.gaits[kind].stride,gaits[kind].stride);assert.equal(painted.gaits[kind].cadence,gaits[kind].cadence);}
  for(const [id,body]of Object.entries(painted.combos)){
    assert.equal(Profiles.index({combo:body.sex*5+body.outfit+1,build:body.build}),+id);
    assert.deepEqual(Object.keys(body.states).sort(),states.slice().sort());
    for(const [state,bank]of Object.entries(body.states)){
      const file=files.get(bank.file);assert.ok(file,bank.file);assert.equal(bank.frames.length,8);
      for(const row of bank.frames){assert.equal(row.length,['idle','sit'].includes(state)?1:['walk','run'].includes(state)?24:12);
        for(const f of row){assert.ok([...f.r,...f.m,...f.offset,...f.origin,...f.head,...f.hands].every(Number.isFinite));assert.equal(f.hands.length,4);assert.ok(f.head[2]>(state==='fall'?5:8)&&f.head[2]<12,'Measured skull width, including foreshortened fallen heads, must fit 48px/m');assert.equal(Object.keys(f.sockets).length,10);
          for(const [x,y,w,h]of [f.r,f.m])assert.ok(x>=1&&y>=1&&w>1&&h>1&&x+w<file.dimensions[0]&&y+h<file.dimensions[1]);
          assert.ok(f.offset[0]>0&&f.offset[1]>0&&f.offset[0]+f.r[2]<256&&f.offset[1]+f.r[3]<256);
          if(['walk','run'].includes(state)){assert.equal(f.feet.length,2);assert.equal(f.flight,f.supports.length===0);for(const foot of f.feet)assert.ok(foot.length===4&&foot.every(Number.isFinite));}
        }
      }
    }
    assert.ok(body.doll.head[2]>30&&body.doll.head[2]<65,'Measured frontal skull width');assert.ok(body.doll.hands.every(([x,y])=>x>20&&x<280&&y>200&&y<320));
  }
  for(let profile=0;profile<6;profile++){
    const catalog=painted.slots[profile];
    for(const [slot,ids]of Object.entries({hands:['hands-leather','hands-thief','hands-plated','hands-gilded','dojo-5'],feet:['feet-leather','feet-riding','feet-steel','feet-gilded'],cloak:['cloak-wool','cloak-travelling','cloak-silk','cloak-royal','relic-u_b4','relic-u_r4','relic-u_r8','relic-u_w7'],armor:['armor-knights-plate']})){
      assert.deepEqual(Object.keys(catalog[slot]).sort(),ids.slice().sort());
      for(const id of ids){const item=catalog[slot][id];assert.ok(files.has(item.doll.file));
        assert.deepEqual(Object.keys(item.states).sort(),states.slice().sort());
        for(const [state,bank]of Object.entries(item.states)){assert.ok(files.has(bank.file),bank.file);assert.equal(bank.frames.length,8);
          for(const row of bank.frames){assert.equal(row.length,['idle','sit'].includes(state)?1:['walk','run'].includes(state)?24:12);for(const frame of row)assert.ok([...frame.r,...frame.m,...frame.offset,...frame.head].every(Number.isFinite));}
        }
      }
    }
  }
  const heads=require('../src/artpaintedheads');assert.deepEqual(heads.map(s=>s.styles.length),[12,12]);
  for(const atlas of heads)for(const style of atlas.styles){assert.equal(style.directions.length,6);for(const [direction,f]of style.directions.entries()){assert.equal(f.direction,direction);assert.ok(f.anchor.every(Number.isFinite));const[x,y,w,h]=f.rect;assert.ok(x>0&&y>0&&x+w<atlas.size[0]&&y+h<atlas.size[1]);}}
});
