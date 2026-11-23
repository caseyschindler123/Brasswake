const { test, expect } = require('@playwright/test');
const { screenshot, observeErrors } = require('./flow');

async function dismiss(f) {
  const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
}
async function closeSheet(f) {
  for(const selector of ['#sheet [data-a=closesheet]','#say [data-a=closesheet]']){const b=f.locator(selector).last();if(await b.isVisible())await b.click();}
  for(let i=0;i<4&&await f.locator('#say-text').isVisible();i++)await f.locator('#say-text').click();
}
async function win(f, stats) {
  await dismiss(f);
  for(let n=0;n<15;n++){
    await dismiss(f);
    const state=await f.evaluate(()=>({over:!!__bw.F?.over,act:__bw.F?.act,st:__bw.F?.st,dead:__bw.S.hp<=0}));
    if(state.dead)throw Error('Dungeon traversal character died');
    if(state.over)break;
    if(state.st==='after'){
      const choose=f.locator('[data-a=fchoose]');if(await choose.isVisible())await choose.click();
    }
    if(await f.locator('[data-a=tonic]').isVisible())await f.locator('[data-a=tonic]').click();
    if(await f.locator('[data-a=fpage]').first().isVisible())await f.locator('[data-a=fpage]').first().click();
    await expect(f.locator('#sql')).toBeVisible();await dismiss(f);
    await f.locator('#sql').fill(await f.evaluate(()=>__bw.F.task.sql));
    await f.locator('#kb [data-fn=run]').click();stats.queries++;
    await f.waitForFunction(()=>__bw.F&&!__bw.F.busy);
  }
  expect(await f.evaluate(()=>!!__bw.F?.over)).toBe(true);
  stats.fights++;
  const loot=f.locator('[data-a=floot]');
  if(await loot.isVisible()){
    await loot.click();await dismiss(f);
    const take=f.locator('[data-a=lootall]');if(await take.isVisible())await take.click();
  }else await f.locator('[data-a=fdone]').click();
  await closeSheet(f);
}
async function canvasClick(f, x, y) {
  const point=await f.evaluate(({x,y})=>{const d=Scene.debug();return {x:(x*16+8-d.cam.x)*d.zoom,y:(y*16+8-d.cam.y)*d.zoom};},{x,y});
  await f.locator('#stage canvas.over').click({position:point});
}
async function assertTexture(f) {
  let samples=[];
  await expect.poll(async()=>{
    samples=await f.evaluate(async()=>{
    const {map:m,CS,TS}=Scene.debug(),im=new Image();im.src='art/'+DungeonArt.image;await im.decode();
    const atlas=document.createElement('canvas');atlas.width=im.width;atlas.height=im.height;const g=atlas.getContext('2d');g.drawImage(im,0,0);
    const samples=[];
    for(const [key,chunk] of m.chunks){const cx=key%1000,cy=Math.floor(key/1000);
      for(let ly=1;ly<CS-1;ly++)for(let lx=1;lx<CS-1;lx++){
        const x=cx*CS+lx,y=cy*CS+ly;if(m.dt[y*m.w+x]!==1)continue;
        const room=m.layout.rooms.find(R=>x>=R.x&&y>=R.y&&x<R.x+R.w&&y<R.y+R.h),alt=room&&(room.cx+room.cy+m.f)%4===0,rc=DungeonArt.themes[m.r][alt?'alternate':'floor'];
        const actual=Array.from(chunk.getContext('2d').getImageData(lx*TS+21,ly*TS+21,1,1).data);
        const expected=Array.from(g.getImageData(rc[0]+(x*TS+21)%rc[2],rc[1]+(y*TS+21)%rc[3],1,1).data);
        samples.push({actual,expected});if(samples.length===8)return samples;
      }
    }
    return samples;
    });
    return samples.length;
  },{message:'Wait for eight rendered dungeon floor samples'}).toBe(8);
  for(const sample of samples)expect(sample.actual).toEqual(sample.expected);
}
async function walk(f, goal, stats, adjacent=true, recovering=false) {
  if(stats.fixture&&typeof goal==='string'){
    await f.evaluate(id=>{
      const {map:m}=Scene.debug(),e=m.ents.find(e=>e.id===id);if(!e)return;
      for(const mon of m.ents)if(['mon','guard','keeper'].includes(mon.kind)){mon.agg=0;mon.wander=0;mon.tx=null;mon.fx=mon.x;mon.fy=mon.y;}
      const at=[[e.x-1,e.y],[e.x+1,e.y],[e.x,e.y-1],[e.x,e.y+1]].find(([x,y])=>!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x));
      if(at)Scene.hop(...at);
    },goal);await f.waitForTimeout(450);
  }
  const recent=[];
  for(let guard=0;guard<700;guard++){
    if(await f.locator('#say').isVisible())await closeSheet(f);
    if(await f.locator('#fight').isVisible()){await win(f,stats);recent.length=0;continue;}
    const step=await f.evaluate(({goal,adjacent})=>{
      const {map:m,P,cam,zoom}=Scene.debug(),start=P.y*m.w+P.x;
      const e=typeof goal==='string'?(m.ents.find(e=>e.id===goal&&!e.dead&&!e.dying)||m.ents.find(e=>e.id===goal)):null;
      if(typeof goal==='string'&&!e)return {missing:goal};
      const tx=e?e.x:goal[0],ty=e?e.y:goal[1],done=(x,y)=>adjacent?Math.abs(x-tx)+Math.abs(y-ty)===1:x===tx&&y===ty;
      if(done(P.x,P.y))return {done:true,e:e?{x:e.x,y:e.y,kind:e.kind,id:e.id}:null};
      function route(ignoreMonsters){
        const prev=new Int32Array(m.w*m.h).fill(-1),q=[start];prev[start]=start;let end=-1;
        for(let i=0;i<q.length;i++){
          const a=q[i],x=a%m.w,y=Math.floor(a/m.w);if(done(x,y)){end=a;break;}
          for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
            const X=x+dx,Y=y+dy,j=Y*m.w+X,occ=m.occ.get(j);
            if(X<0||Y<0||X>=m.w||Y>=m.h||m.solid[j]||prev[j]>=0||occ&&!(ignoreMonsters&&['mon','guard','keeper'].includes(occ.kind)))continue;
            prev[j]=a;q.push(j);
          }
        }
        if(end<0)return null;const path=[];for(let a=end;a!==start;a=prev[a])path.push([a%m.w,Math.floor(a/m.w)]);return path.reverse();
      }
      let path=route(false);
      const from=[P.x,P.y];
      if(!path){path=route(true);if(!path)return {blocked:{goal,at:from}};const mon=path.map(([x,y])=>m.occ.get(y*m.w+x)).find(Boolean);if(mon)return {fight:mon.id,first:path[0],from};}
      let at=null;
      for(const pos of path.slice(0,7)){
        const sx=(pos[0]*16+8-cam.x)*zoom,sy=(pos[1]*16+8-cam.y)*zoom;
        const box=document.querySelector('#stage').getBoundingClientRect();
        if(sx<28||sx>box.width-28||sy<115||sy>box.height-70)break;
        if(m.occ.has(pos[1]*m.w+pos[0]))break;
        if(!m.ents.some(e=>Math.hypot(e.fx+.5-(pos[0]+.5),e.fy+(e.big?-.2:.2)-(pos[1]+.5))<1.12))at=pos;
      }
      return {at,first:path[0],from};
    },{goal,adjacent});
    if(step.missing)throw Error('Missing destination '+step.missing);
    if(step.blocked)throw Error('Unreachable UI destination '+JSON.stringify(step.blocked));
    if(step.done)return step.e;
    if(step.fight&&!recovering){await engage(f,step.fight,stats,true);recent.length=0;continue;}
    recent.push(step.from.join(','));if(recent.length>8)recent.shift();
    const repeated=!stats.fixture&&recent.length===8&&new Set(recent).size<=3;
    if(repeated){
      stats.pathRecoveries=(stats.pathRecoveries||0)+1;
      recent.length=0;
      const nearby=recovering?null:await f.evaluate(goal=>{
        const {map,P}=Scene.debug(),distance=e=>Math.abs(e.x-P.x)+Math.abs(e.y-P.y);
        return map.ents.filter(e=>e.id!==goal&&!e.dead&&!e.dying&&!e.hidden&&['mon','guard','keeper'].includes(e.kind)&&distance(e)<=2)
          .sort((a,b)=>distance(a)-distance(b))[0]?.id;
      },goal);
      if(nearby){await engage(f,nearby,stats,true);continue;}
    }
    if(repeated||!step.at){
      const [x,y]=step.first,[px,py]=step.from;
      const key=x>px?'ArrowRight':x<px?'ArrowLeft':y>py?'ArrowDown':'ArrowUp';
      await f.locator('body').press(key,{delay:80});
    }else await canvasClick(f,...step.at);
    // Roaming creatures can step into a route and stop ground movement.
    // Replan from the actual position; the destination assertion above still
    // requires physically reaching the requested chamber or interaction.
    await f.waitForFunction(()=>!Scene.debug().P.path.length||!!__bw.F||!!__bw.SB,null,{timeout:12000});
    const actual=await f.evaluate(()=>Scene.pos());
    stats.steps+=Math.abs(actual[0]-step.from[0])+Math.abs(actual[1]-step.from[1]);
  }
  const diagnostic=await f.evaluate(goal=>{
    const {map,P}=Scene.debug(),F=__bw.F,e=typeof goal==='string'?map.ents.find(e=>e.id===goal):null;
    return {at:[P.x,P.y],goal,target:e?[e.x,e.y]:goal,
      nearby:map.ents.filter(e=>!e.dead&&!e.dying&&!e.hidden&&['mon','guard','keeper'].includes(e.kind)&&Math.abs(e.x-P.x)+Math.abs(e.y-P.y)<=3).map(e=>e.id),
      fight:F?{id:F.ent?.id,state:F.st,title:F.title}:null};
  },goal);
  throw Error('Too many walking steps: '+JSON.stringify(diagnostic));
}
async function interact(f,id,stats,recovering=false){
  for(let attempt=0;attempt<20;attempt++){
    const e=await walk(f,id,stats,true,recovering);
    if(await f.locator('#fight').isVisible()){
      if(await f.evaluate(id=>__bw.F?.ent?.id===id,id))return e;
      await win(f,stats);continue;
    }
    await canvasClick(f,e.x,e.y);await f.waitForTimeout(150);
    if(await f.locator('#fight').isVisible()){
      if(await f.evaluate(id=>__bw.F?.ent?.id===id,id))return e;
      await win(f,stats);continue;
    }
    if(['mon','guard','keeper'].includes(e.kind))continue;
    return e;
  }
  throw Error('Repeated ambushes prevented reaching '+id);
}
async function engage(f,id,stats,recovering=false){
  const status=await f.evaluate(id=>{const e=Scene.find(e=>e.id===id&&!e.dead&&!e.dying)||Scene.find(e=>e.id===id);return {kind:e?.kind,killed:!!__bw.DP.current().kills[id]};},id);
  if(status.killed&&(!status.kind||status.kind==='corpse'))return;
  await interact(f,id,stats,recovering);
  if(await f.locator('#fight').isVisible())await win(f,stats);
  else expect(await f.evaluate(id=>!!__bw.DP.current().kills[id],id)).toBe(true);
}

test('version six accounts migrate without losing their character or bank',async({page})=>{
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const account=await f.evaluate(()=>{
    const a=JSON.parse(localStorage.getItem('brasswake.acct.v7'));a.v=6;a.slots[a.cur].v=5;a.slots[a.cur].bank.gold=321;
    delete a.slots[a.cur].dungeon;delete a.slots[a.cur].dungeons;
    return a;
  });
  const name=account.slots[account.cur].name;
  await page.addInitScript(a=>{localStorage.setItem('brasswake.acct.v6',JSON.stringify(a));localStorage.removeItem('brasswake.acct.v7');},account);
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=playslot]').first().click();
  expect(await page.evaluate(()=>({v:__bw.A.v,character:__bw.S.v,name:__bw.S.name,gold:__bw.S.bank.gold,dungeon:__bw.S.dungeon}))).toEqual({v:7,character:6,name,gold:321,dungeon:null});
});

test('five fully mapped characters compact local and cloud saves and reload an inactive slot',async({page},info)=>{
  test.setTimeout(120000);
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const saved=await f.evaluate(()=>{
    const maps={};
    for(let r=1;r<=8;r++){
      const p=maps[r]={v:1,day:'capacity-test',seen:{},gates:{},lore:{},kills:{},seals:{},claimed:{}};
      for(let floor=0;floor<Dungeons.get(r).floors.length;floor++)p.seen[floor]=Array.from({length:Dungeons.build(r,floor).tiles.length},(_,i)=>i);
    }
    const legacy=JSON.stringify(maps);
    for(let i=0;i<5;i++){
      const s=JSON.parse(JSON.stringify(__bw.S));s.name='Map keeper '+i;s.dungeons=JSON.parse(JSON.stringify(maps));__bw.A.slots[i]=s;
    }
    __bw.S.dungeons=maps;__bw.save();
    const inspect=()=>{
      const raw=localStorage.getItem('brasswake.acct.v7'),a=JSON.parse(raw);
      return {bytes:raw.length*2,revision:a.rev,current:__bw.A.rev,slots:a.slots.filter(Boolean).length,
        compact:a.slots.every(s=>Object.values(s.dungeons).every(p=>Object.values(p.seen).every(v=>typeof v==='string')))};
    };
    const active=inspect();
    for(const s of __bw.A.slots)s.dungeons=JSON.parse(legacy);
    __bw.A.cur=-1;__bw.save();
    return [active,inspect()];
  });
  for(const state of saved){expect(state.revision).toBe(state.current);expect(state.slots).toBe(5);expect(state.compact).toBe(true);expect(state.bytes).toBeLessThan(1048576);}
  await page.addInitScript(()=>{
    const remote=JSON.parse(localStorage.getItem('brasswake.acct.v7'));remote.rev+=10000;remote.cur=-1;
    for(const s of remote.slots)for(const p of Object.values(s.dungeons))for(const floor of Object.keys(p.seen))p.seen[floor]=Array.from({length:124*109},(_,i)=>i);
    const db={doc:key=>({
      get:async()=>key.endsWith('/acct')?{exists:true,data:()=>({json:JSON.stringify(remote)})}:{exists:false},
      set:async data=>{window.__capacityCloudWrite=data.json.length*2;}
    })};
    window.claude={use:async kind=>kind==='db'?db:{id:async()=>'capacity-fixture'}};
  });
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.waitForFunction(()=>window.__capacityCloudWrite>0);
  const cloud=await page.evaluate(()=>{
    const raw=localStorage.getItem('brasswake.acct.v7'),a=JSON.parse(raw);
    return {bytes:raw.length*2,cloudBytes:window.__capacityCloudWrite,rev:a.rev,cur:a.cur,
      compact:a.slots.every(s=>Object.values(s.dungeons).every(p=>Object.values(p.seen).every(v=>typeof v==='string')))};
  });
  expect(cloud.rev).toBeGreaterThan(10000);expect(cloud.cur).toBe(-1);expect(cloud.compact).toBe(true);
  expect(cloud.bytes).toBeLessThan(1048576);expect(cloud.cloudBytes).toBeLessThan(1048576);
  await screenshot(page,info,'five-mapped-characters');
  await page.locator('[data-a=playslot]').nth(4).click();
  expect(await page.evaluate(()=>__bw.S.name)).toBe('Map keeper 4');
  expect(await page.evaluate(()=>{
    const size=Dungeons.build(8,3).tiles.length;
    return DungeonProgress.unpackSeen(__bw.S.dungeons[8].seen[3],size).reduce((sum,v)=>sum+v,0)===size;
  })).toBe(true);
});

test('a dungeon death survives reload before Wake up and its belongings survive a second dungeon reload',async({page})=>{
  test.setTimeout(120000);const stats={steps:0,fights:0,queries:0};
  await page.goto('/__visual?scene=tallyport');await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  let f=page.frames().find(f=>f.url().includes('visual_test=1'));
  await f.evaluate(()=>{window.__bwFast=true;__bw.S.gold=77;__bw.S.sk={magery:0};__bw.S.hp=1;const e=Scene.find(e=>e.kind==='stairs'&&e.r===1);Scene.warp(e.x+1,e.y);});
  await f.waitForTimeout(250);await f.locator('#ctx').click();await f.locator('[data-a=start][data-k=dungeon]').click();
  const setup=await f.evaluate(()=>{const e=Scene.find(e=>e.kind==='mon'&&e.inst.role==='armored');Scene.hop(e.x+1,e.y);return {id:e.id,x:e.x,y:e.y,back:__bw.DG.back};});
  await f.waitForTimeout(450);await canvasClick(f,setup.x,setup.y);await expect(f.locator('#fight')).toBeVisible();await dismiss(f);
  for(let i=0;i<8&&!(await f.evaluate(()=>!!__bw.F.over));i++){
    if(await f.locator('[data-a=fchoose]').isVisible())await f.locator('[data-a=fchoose]').click();
    await f.locator('[data-a=fpage]').first().click();await dismiss(f);await f.locator('#sql').fill('SELECT 0 AS wrong_answer');await f.locator('#kb [data-fn=run]').click();
    await f.waitForFunction(()=>!__bw.F.busy);
  }
  await expect(f.locator('[data-a=fdone]')).toContainText('Wake up');
  const dropped=await f.evaluate(()=>({pending:!!__bw.S.deathPending,dungeon:__bw.S.dungeon,gold:__bw.S.gold,body:[__bw.S.remains.x,__bw.S.remains.y]}));
  expect(dropped).toEqual({pending:true,dungeon:null,gold:0,body:setup.back});
  async function reload(){await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').first().click();f=page.mainFrame();await f.waitForFunction(()=>!!Scene.debug().map);}
  await reload();expect(await f.evaluate(()=>Scene.inDungeon())).toBe(false);expect(await f.evaluate(()=>__bw.S.hp)).toBeGreaterThan(0);
  await f.evaluate(back=>{window.__bwFast=true;Scene.warp(...back);},setup.back);
  const stairs=await f.evaluate(()=>{const e=Scene.find(e=>e.kind==='stairs'&&e.r===1);return[e.x,e.y];});
  await f.waitForTimeout(400);await canvasClick(f,...stairs);await f.locator('[data-a=start][data-k=dungeon]').click();
  await f.evaluate(()=>__bw.save());await reload();
  expect(await f.evaluate(()=>Scene.inDungeon())).toBe(true);
  const up=await f.evaluate(()=>Scene.find(e=>e.kind==='dtravel'&&e.to===-1).id);
  await interact(f,up,stats);await f.locator('[data-a=dtravel]').click();
  expect(await f.evaluate(()=>!!Scene.find(e=>e.mine))).toBe(true);
  await f.locator('#ctx').click();await dismiss(f);await f.locator('[data-a=lootall]').click();
  expect(await f.evaluate(()=>__bw.S.gold)).toBe(77);expect(await f.evaluate(()=>__bw.S.remains)).toBeNull();
});

for(let r=1;r<=8;r++){
  const expedition=process.env.BW_DUNGEON_EXPEDITIONS==='1';
  test('dungeon '+(expedition?'expedition ':'components ')+r+': rendered routes, controls, combat, loot and persistence',async({page},info)=>{
    test.setTimeout(expedition?1800000:240000);
    const errors=observeErrors(page),stats={r,fixture:!expedition,coverage:expedition?'complete expedition with actual canvas walking':'all-floor UI components with prepared positions',steps:0,queries:0,fights:0,pathRecoveries:0,floors:[]},start=Date.now();
    await page.goto('/__visual?scene=tallyport');
    await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
    let f=page.frames().find(f=>f.url().includes('visual_test=1'));
    // Expedition mode uses real UI movement after this initial surface setup.
    // The default component mode explicitly prepares positions in walk(),
    // while controls, SQL, travel, rewards and reload remain real UI actions.
    await f.evaluate(r=>{
      __bw.S.sk={magery:100,healing:100};__bw.S.pages={['s'+r]:1};__bw.S.tonics=50;__bw.S.hp=75;
      for(const slot of ['weapon','shield','armor','head','hands','feet','cloak']){
        const it=__bw.makeItem('legendary',r,slot,slot==='weapon'?'magery':undefined);it.bless=1;
        __bw.S.inv.push(it);__bw.S.eq[slot]=it.id;
      }
      __bw.S.er.a.audit={type:'hunt',tpl:'b'+r+'01',have:0,n:2,from:'Test hunt',x:'creature'};
      __bw.S.seen.fight=__bw.S.seen.fprompt=__bw.S.seen.loot=1;
      window.__bwFast=true;
      const stairs=Scene.find(e=>e.kind==='stairs'&&e.r===r);Scene.warp(stairs.x+1,stairs.y);__bw.save();
    },r);
    await f.waitForTimeout(250);
    await expect(f.locator('#ctx')).toContainText(await f.evaluate(r=>Dungeons.get(r).name,r));
    await f.locator('#ctx').click();
    await f.locator('[data-a=start][data-k=dungeon]').click();
    await f.waitForFunction(()=>Scene.debug().map.dungeonFloor);
    const count=await f.evaluate(r=>Dungeons.get(r).floors.length,r);
    await assertTexture(f);
    await screenshot(page,info,'dungeon-'+r+'-entrance');
    for(let floor=0;floor<count;floor++){
      expect(await f.evaluate(()=>__bw.DG.f)).toBe(floor);
      const entities=await f.evaluate(()=>Scene.debug().map.ents.map(e=>({id:e.id,kind:e.kind,lieutenant:!!e.lieutenant})));
      if(stats.fixture&&floor===0){const gate=entities.find(e=>e.kind==='dgate');await walk(f,gate.id,stats);await screenshot(page,info,'dungeon-'+r+'-barrier');}
      for(const kind of ['dlever','dsecret']){
        const e=entities.find(e=>e.kind===kind);await interact(f,e.id,stats);
        await f.locator('[data-a=dopen]').click();
        expect(await f.evaluate(id=>!!__bw.DP.current().gates[id],kind==='dlever'?await f.evaluate(id=>Scene.find(e=>e.id===id).target,e.id):e.id)).toBe(true);
      }
      const lore=entities.find(e=>e.kind==='dlore');await interact(f,lore.id,stats);await expect(f.locator('#say')).toBeVisible();await closeSheet(f);
      const cache=entities.find(e=>e.kind==='dcache');await interact(f,cache.id,stats);await expect(f.locator('#sheet')).toContainText('A hidden cache');await closeSheet(f);
      if(floor===0){await f.locator('#nav [data-t=map]').click();await expect(f.locator('.dungeon-map img')).toBeVisible();await expect(f.locator('#coach')).toBeHidden();await screenshot(page,info,'dungeon-'+r+'-map');await f.locator('[data-a=tab][data-t=world]').filter({hasText:'Return to dungeon'}).click();}
      await screenshot(page,info,'dungeon-'+r+'-floor-'+(floor+1));
      const lieutenant=entities.find(e=>e.lieutenant);
      if(lieutenant)await engage(f,lieutenant.id,stats);
      stats.floors.push(floor+1);
      console.log('Dungeon '+r+' floor '+(floor+1)+' explored; '+stats.fights+' fights, '+stats.queries+' queries.');
      if(floor<count-1){
        const down=await f.evaluate(()=>Scene.debug().map.ents.find(e=>e.kind==='dtravel'&&e.to>__bw.DG.f).id);
        await interact(f,down,stats);await f.locator('[data-a=dtravel]').click();
        await f.waitForFunction(expected=>__bw.DG.f===expected,floor+1);
      }else{
        const keeper=entities.find(e=>e.kind==='keeper');await engage(f,keeper.id,stats);
        const chest=entities.find(e=>e.kind==='chest');await interact(f,chest.id,stats);
        await expect(f.locator('#sheet')).toContainText('The vault chest');await screenshot(page,info,'dungeon-'+r+'-vault');await closeSheet(f);
        const gold=await f.evaluate(()=>__bw.S.gold);await interact(f,chest.id,stats);expect(await f.evaluate(()=>__bw.S.gold)).toBe(gold);
        const table=entities.find(e=>e.kind==='ltable');await interact(f,table.id,stats);await closeSheet(f);
        while(await f.locator('[data-a=sbeat]').isVisible())await f.locator('[data-a=sbeat]').click();
        expect(await f.evaluate(r=>!!__bw.S.tabs[r],r)).toBe(true);
      }
    }
    // A reload must preserve the final floor, discoveries and claimed vault.
    await f.evaluate(()=>__bw.save());
    const mapped=await f.evaluate(()=>Array.from(Scene.debug().map.discovered).flatMap((v,i)=>v?[i]:[]));
    expect(mapped.length).toBeGreaterThan(0);
    expect(await f.evaluate(()=>typeof __bw.DP.current().seen[__bw.DG.f])).toBe('string');
    const musicOn=await f.evaluate(()=>{const on=Sound.pref().mu;Sound.setMu(false);return on;});
    await f.waitForFunction(()=>!Sound.status().pending);
    await page.goto('/index.html?visual_test=1');
    await expect(page.locator('#artload')).toBeHidden({timeout:45000});
    await page.locator('[data-a=playslot]').first().click();f=page.mainFrame();
    await f.waitForFunction(()=>!!__bw.DG);
    expect(await f.evaluate(()=>__bw.DG.f)).toBe(count-1);
    expect(await f.evaluate(()=>__bw.DP.current().claimed.vault)).toBe(true);
    expect(await f.evaluate(indices=>indices.every(i=>Scene.debug().map.discovered[i]===1),mapped)).toBe(true);
    await f.evaluate(on=>{window.__bwFast=true;Sound.setMu(on);},musicOn);
    for(let floor=count-1;floor>=0;floor--){
      const up=await f.evaluate(()=>Scene.debug().map.ents.find(e=>e.kind==='dtravel'&&e.to<__bw.DG.f).id);
      await interact(f,up,stats);await f.locator('[data-a=dtravel]').click();
      if(floor)await f.waitForFunction(expected=>__bw.DG.f===expected,floor-1);
      else await f.waitForFunction(()=>!Scene.inDungeon());
    }
    expect(await f.evaluate(()=>__bw.S.dungeon)).toBeNull();
    expect(await f.evaluate(()=>__bw.S.stats.dungeons)).toBe(1);
    await screenshot(page,info,'dungeon-'+r+'-returned');
    await f.locator('#ctx').click();await f.locator('[data-a=start][data-k=dungeon]').click();
    expect(await f.evaluate(()=>__bw.DP.current().claimed.vault)).toBe(true);
    stats.elapsedMs=Date.now()-start;
    await info.attach(expedition?'expedition-evidence':'component-evidence',{body:JSON.stringify(stats,null,2),contentType:'application/json'});
    expect(errors).toEqual([]);
  });
}

module.exports={walk,interact,win};
