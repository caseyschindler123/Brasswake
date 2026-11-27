// Test-only commands. build.js never includes this file.
(() => {
  const nativeRandom=Math.random;
  let baseline, serial=0, seed=1;
  const wait=async predicate=>{const end=performance.now()+30000;while(!predicate()){
    if(performance.now()>end)throw Error('Dev scenario did not become ready');await new Promise(r=>setTimeout(r,30));}};
  const bw=()=>window.__bw;
  const integer=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)throw Error('Invalid '+label);return v;};
  function random(value=1){seed=integer(value,1,2147483646,'seed');Math.random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};}
  function idle(){if(bw().F||bw().Q)throw Error('Reset the scenario before changing its setup');}
  function snapshot(){return JSON.parse(JSON.stringify({hero:bw().S,position:Scene.pos(),fight:bw().F&&{hp:bw().F.hp,over:bw().F.over},spawned:Scene.ents().filter(e=>e.dev).map(e=>({id:e.id,tpl:e.inst.tpl}))}));}
  async function reset(value=1){
    random(value);document.querySelector('#dev-building-preview')?.remove();Scene.clearPursuits();
    bw().ACT.import();document.querySelector('#savebox').value=btoa(unescape(encodeURIComponent(baseline)));bw().ACT.doimport();
    Engine.resetSandbox();bw().ACT.tab({t:'world'});await wait(()=>Scene.pos()&&!bw().F&&!bw().Q);return snapshot();
  }
  function skills(values={}){
    idle();const next={...bw().S.sk};
    for(const [id,value]of Object.entries(values)){
      if(!Progression.ids.includes(id)||!Number.isFinite(value)||value<0||value>Progression.skillCap(bw().S,id))throw Error('Invalid skill '+id);
      next[id]=value;
    }
    if(Object.values(next).reduce((a,b)=>a+b,0)>700)throw Error('Skill total exceeds 700');
    bw().S.sk=next;Progression.normalize(bw().S);bw().render();return snapshot();
  }
  function attributes(values={}){
    idle();const next={...bw().S.attr};for(const [id,value]of Object.entries(values)){
      if(!['str','dex','int'].includes(id)||!Number.isFinite(value)||value<10||value>100)throw Error('Invalid attribute');next[id]=value;}
    if(Object.values(next).reduce((a,b)=>a+b,0)>225)throw Error('Attribute total exceeds 225');
    bw().S.attr=next;Progression.normalize(bw().S);bw().render();return snapshot();
  }
  function resources(values={}){
    idle();const limits={hp:Progression.maxHp(bw().S),mana:Progression.maxMana(bw().S),stamina:Progression.maxStamina(bw().S),gold:1000000};
    for(const [id,value]of Object.entries(values))if(!(id in limits)||!Number.isFinite(value)||value<0||value>limits[id])throw Error('Invalid resource '+id);
    Object.assign(bw().S,values);bw().render();return snapshot();
  }
  function grant({slot='weapon',weapon='swords',rarity='common',tier=1,equip=true,variant}={}){
    idle();if(!['weapon','armor','shield','ring','charm','head','hands','feet','cloak'].includes(slot))throw Error('Invalid item slot');
    if(!['common','uncommon','rare','epic','legendary'].includes(rarity)||!Object.hasOwn(BattleRules.WEAPONS,weapon))throw Error('Invalid item catalog value');
    integer(tier,1,8,'tier');if(bw().S.inv.length>=60)throw Error('Inventory is full');
    if(variant!==undefined&&!Number.isInteger(variant))throw Error('Invalid weapon variant');
    let item=bw().makeItem(rarity,tier,slot,weapon);
    // Exact authored weapon art can be selected without changing generated stats.
    if(variant!==undefined){if(slot!=='weapon'||![0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,25,26,27].includes(variant))throw Error('Invalid weapon variant');for(let i=0;i<256&&item.v!==variant;i++)item=bw().makeItem(rarity,tier,slot,weapon);if(item.v!==variant)throw Error('Variant is unavailable for this weapon/rarity');}
    bw().S.inv.push(item);if(equip)bw().ACT.equip({id:item.id});else bw().render();return JSON.parse(JSON.stringify(item));
  }
  function teleport({region=1,x,y,dungeon,interior}={}){
    idle();integer(region,1,8,'region');
    if(x!==undefined&&(!Number.isInteger(x)||!Number.isInteger(y)))throw Error('Invalid coordinates');
    Scene.clearPursuits();bw().ACT.closesheet();bw().ACT.tab({t:'world'});
    const town=Scene.towns()[region],point=x===undefined?[town[0],town[1]+3]:[x,y];
    const safe=Scene.safePosition(point,region);
    if(x!==undefined&&(safe[0]!==x||safe[1]!==y))throw Error('Destination is not safe ground');
    bw().S.region=region;bw().S.dungeon=null;bw().S.interior=null;Scene.load(safe,region);
    if(dungeon!==undefined){integer(dungeon,0,Dungeons.get(region).floors.length-1,'dungeon floor');bw().DP.enter(region);bw().DP.floor(dungeon);}
    if(interior!==undefined){const building=Scene.debug().map.blds.find(b=>b.id===interior||b.slot===interior);if(!building?.enter)throw Error('Unknown interior');Scene.load([building.x+building.room.door,building.y+building.h-2],region);}
    bw().render();return snapshot();
  }
  function spawn({monster='b102',count=1}={}){
    idle();if(!Object.hasOwn(Content.MONSTERS,monster)||!Content.BOUNTIES.some(b=>b.id===monster))throw Error('Unknown combat monster');integer(count,1,12,'monster count');
    const map=Scene.debug().map,p=Scene.pos(),created=[];
    const spots=[];for(let radius=1;radius<9;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;const x=p[0]+dx,y=p[1]+dy,k=y*map.w+x;
      if(x>0&&y>0&&x<map.w&&y<map.h&&!map.solid[k]&&!map.occ.has(k)&&map.t[k]!==4)spots.push([x,y]);}
    if(spots.length<count)throw Error('Not enough safe arena space');
    for(let i=0;i<count;i++){const[x,y]=spots[i],id='dev-'+(++serial);const template=Scene.debug().world.ents.find(e=>e.kind==='mon'&&e.inst?.tpl===monster)||Scene.find(e=>e.kind==='mon');if(!template)throw Error('Monster art is not ready');const e={...template,id,dev:true,kind:'mon',dead:0,dying:undefined,x,y,fx:x,fy:y,r:bw().S.region,inst:{tpl:monster,elite:false},name:Content.MONSTERS[monster][0],solid:0,wander:0,agg:0,unseen:true,tx:null,ty:null,combat:undefined,combatConfig:undefined,pursuitAnchor:null,engaged:false,chase:0,alert:0,home:[x,y]};map.ents.push(e);created.push(id);}
    return created;
  }
  function battle(id){idle();const e=Scene.find(e=>e.dev&&e.id===id);if(!e)throw Error('Unknown spawned monster');bw().HOST.interact(e);return snapshot();}
  function building({region=1,shape='rect',width=14,height=12,doors=['south'],furniture=[]}={}){
    idle();integer(region,1,8,'region');integer(width,11,32,'building width');integer(height,11,32,'building height');
    if(!['rect','L','courtyard'].includes(shape)||!Array.isArray(doors)||doors.some(d=>!['north','south','east','west'].includes(d)))throw Error('Invalid building specification');
    if(!Array.isArray(furniture)||furniture.length>32||furniture.some(o=>!Object.hasOwn(ArchitectureArt.at,o.p)||!Number.isFinite(o.x)||!Number.isFinite(o.y)||o.x<0||o.y<0||o.x>width||o.y>height))throw Error('Invalid furniture');
    const plan=Buildings.compile({id:'dev-building',w:width,h:height,shape,doors});
    const images=new Map(),piece=key=>{const entry=ArchitectureArt.at[key];if(!entry)return null;const image=images.get(entry.f);if(!image)return null;
      const c=document.createElement('canvas'),[x,y,w,h]=entry.r;c.width=w;c.height=h;c.hr=1;c.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);return c;};
    return Promise.all(ArchitectureArt.files.map(file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(file,img);resolve();};img.onerror=reject;img.src='art/'+file;}))).then(()=>{
      const view=BuildingView.create(plan,{piece,r:region,painted:true,storeyLift:0,furniture});
      const old=document.querySelector('#dev-building-preview');if(old)old.remove();const wrap=document.createElement('dialog');wrap.id='dev-building-preview';wrap.style='max-width:90vw;max-height:80vh;overflow:auto;background:#d9ccab';
      const close=document.createElement('button');close.textContent='Close building preview';close.onclick=()=>wrap.remove();wrap.append(close);
      const canvas=document.createElement('canvas'),b=view.bounds;canvas.width=Math.ceil(b.w*3);canvas.height=Math.ceil(b.h*3);canvas.style='display:block;max-width:100%;height:auto';const g=canvas.getContext('2d');let roof=true;
      const paint=()=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.scale(3,3);g.translate(-b.x,-b.y);g.drawImage(view.floor,0,0,view.floor.width/3,view.floor.height/3);for(const wall of [...view.walls,...view.furniture].sort((a,b)=>a.sortY-b.sortY))g.drawImage(wall.image,wall.x,wall.y,wall.image.width/3,wall.image.height/3);if(roof)g.drawImage(view.roof,0,-view.wallHeight,view.roof.width/3,view.roof.height/3);};
      const toggle=document.createElement('button');toggle.textContent='Toggle roof';toggle.onclick=()=>{roof=!roof;paint();};wrap.style.display='block';wrap.append(toggle,canvas);paint();document.body.append(wrap);wrap.showModal();return {width:plan.w,height:plan.h,shape,doors:plan.doors};
    });
  }
  async function boot(){
    await wait(()=>window.__bw&&document.querySelector('#artload')?.hidden);
    const click=selector=>{const e=document.querySelector(selector);if(!e)throw Error('Missing setup control '+selector);e.click();};
    click('[data-a=newslot]');click('[data-a=pick][data-look="0"]');click('[data-a=begin]');
    await wait(()=>document.querySelector('[data-a=boatskiprescue]')||document.querySelector('#boat-name'));
    if(document.querySelector('[data-a=boatskiprescue]'))click('[data-a=boatskiprescue]');await wait(()=>document.querySelector('#boat-name'));
    document.querySelector('#boat-name').value='Developer';click('[data-a=boatname]');click('[data-a=skipguide]');
    await wait(()=>Scene.pos()&&document.querySelector('#onboard')?.hidden);
    bw().S.tut=3;bw().S.gd=99;bw().S.tabs={bag:1,hero:1,map:1,ledger:1};bw().S.pages.a1=1;
    bw().S.seen={...bw().S.seen,fight:1,fprompt:1,bag:1,hero:1,map:1,ledger:1};bw().ACT.closesheet();bw().render();
    baseline=JSON.stringify(bw().A);random(Number(new URLSearchParams(location.search).get('seed'))||1);
    const api=Object.freeze({reset,skills,attributes,resources,grant,teleport,spawn,battle,building,snapshot,
      catalog:()=>({monsters:Content.BOUNTIES.filter(b=>Content.MONSTERS[b.id]).map(b=>({id:b.id,name:Content.MONSTERS[b.id][0]})),weapons:Object.keys(BattleRules.WEAPONS),skills:Progression.ids,regions:Content.REGIONS})});
    Object.defineProperty(window,'Dev',{value:api});document.documentElement.dataset.devReady='true';
  }
  addEventListener('pagehide',()=>{Math.random=nativeRandom;},{once:true});
  boot().catch(e=>{document.documentElement.dataset.devError=String(e);console.error(e);});
})();
