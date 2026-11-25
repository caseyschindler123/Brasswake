const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
const {dismiss,closeSheet,win,canvasClick,assertTexture,assertPortalArt,capturePortal,walk,interact,engage}=require('./dungeon-helper');
test('version six accounts migrate without losing their character or bank',async({page})=>{
  await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));
  const account=await f.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    const legacy={...stored.worlds[stored.world],v:6,rev:stored.rev,at:stored.at};
    const slot=legacy.slots[legacy.cur];slot.v=5;slot.bank.gold=321;
    delete slot.dungeon;delete slot.dungeons;
    return legacy;
  });
  const name=account.slots[account.cur].name;
  await page.addInitScript(a=>{
    for(const version of [7,8,9])localStorage.removeItem('brasswake.acct.v'+version);
    localStorage.setItem('brasswake.acct.v6',JSON.stringify(a));
  },account);
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=playslot]').first().click();
  expect(await page.evaluate(()=>({v:__bw.A.v,world:__bw.A.world,character:__bw.S.v,name:__bw.S.name,gold:__bw.S.bank.gold,dungeon:__bw.S.dungeon})))
    .toEqual({v:9,world:0,character:8,name,gold:321,dungeon:null});
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
      const raw=localStorage.getItem('brasswake.acct.v9'),a=JSON.parse(raw),world=a.worlds[a.world];
      return {bytes:raw.length*2,revision:a.rev,current:__bw.A.rev,slots:world.slots.filter(Boolean).length,
        compact:world.slots.every(s=>Object.values(s.dungeons).every(p=>Object.values(p.seen).every(v=>typeof v==='string')))};
    };
    const active=inspect();
    for(const s of __bw.A.slots)s.dungeons=JSON.parse(legacy);
    __bw.A.cur=-1;__bw.save();
    return [active,inspect()];
  });
  for(const state of saved){expect(state.revision).toBe(state.current);expect(state.slots).toBe(5);expect(state.compact).toBe(true);expect(state.bytes).toBeLessThan(1048576);}
  await page.addInitScript(()=>{
    const remote=JSON.parse(localStorage.getItem('brasswake.acct.v9')),world=remote.worlds[remote.world];
    remote.rev+=10000;world.cur=-1;
    for(const s of world.slots)for(const p of Object.values(s.dungeons))for(const floor of Object.keys(p.seen))p.seen[floor]=Array.from({length:124*109},(_,i)=>i);
    const db={doc:key=>({
      get:async()=>key.endsWith('/acct')?{exists:true,data:()=>({json:JSON.stringify(remote)})}:{exists:false},
      set:async data=>{window.__capacityCloudWrite=data.json.length*2;}
    })};
    window.claude={use:async kind=>kind==='db'?db:{id:async()=>'capacity-fixture'}};
  });
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.waitForFunction(()=>window.__capacityCloudWrite>0);
  const cloud=await page.evaluate(()=>{
    const raw=localStorage.getItem('brasswake.acct.v9'),a=JSON.parse(raw),world=a.worlds[a.world];
    return {bytes:raw.length*2,cloudBytes:window.__capacityCloudWrite,rev:a.rev,cur:world.cur,
      compact:world.slots.every(s=>Object.values(s.dungeons).every(p=>Object.values(p.seen).every(v=>typeof v==='string')))};
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
  await f.waitForTimeout(450);await dismiss(f);
  if(!await f.locator('#fight').isVisible())await canvasClick(f,setup.x,setup.y);
  await expect(f.locator('#fight')).toBeVisible();await dismiss(f);
  expect(await f.evaluate(()=>__bw.F.ent.id)).toBe(setup.id);
  for(let i=0;i<8&&!(await f.evaluate(()=>!!__bw.F.over));i++){
    if(await f.locator('[data-a=fchoose]').isVisible())await f.locator('[data-a=fchoose]').click();
    await f.locator('[data-a=fpage]').first().click();await dismiss(f);await f.locator('#sql').fill('SELECT 0 AS wrong_answer');await f.locator('#kb [data-fn=run]').click();
    await f.waitForFunction(()=>!__bw.F.busy);
  }
  await expect(f.locator('[data-a=fdone]')).toContainText('Wake up');
  const dropped=await f.evaluate(()=>({pending:!!__bw.S.deathPending,dungeon:__bw.S.dungeon,gold:__bw.S.gold,body:[__bw.S.remains.x,__bw.S.remains.y]}));
  expect(dropped).toEqual({pending:true,dungeon:null,gold:0,body:setup.back});
  async function reload(){await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').first().click();f=page.mainFrame();await f.waitForFunction(()=>!!Scene.debug().map);}
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
    // This verifies one day's vault. Keep its advancing calendar away from
    // midnight; daily rollover itself is covered by dungeon-progress.test.js.
    await page.addInitScript(offset => {
      const NativeDate=Date;
      globalThis.Date=new Proxy(NativeDate,{
        apply:()=>new NativeDate(NativeDate.now()+offset).toString(),
        construct:(target,args,newTarget)=>Reflect.construct(target,args.length?args:[NativeDate.now()+offset],newTarget),
        get:(target,key)=>key==='now'?()=>NativeDate.now()+offset:Reflect.get(target,key),
      });
    },Date.parse('2026-11-23T12:00:00Z')-Date.now());
    await page.goto('/__visual?scene=tallyport');
    await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
    let f=page.frames().find(f=>f.url().includes('visual_test=1'));
    // Expedition mode uses real UI movement after this initial surface setup.
    // The default component mode explicitly prepares positions in walk(),
    // while controls, SQL, travel, rewards and reload remain real UI actions.
    await f.evaluate(r=>{
      __bw.S.sk={magery:100,healing:100,eval:100,meditation:100,resisting:100,inscription:100,lockpicking:100};__bw.S.attr={str:100,dex:25,int:100};__bw.S.mana=100;__bw.S.stamina=25;__bw.S.pages={['s'+r]:1};__bw.S.tonics=50;__bw.S.hp=75;
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
    await assertPortalArt(f,'stairs',r,'down');
    await capturePortal(f,page,info,'dungeon-'+r+'-surface-stairs');
    await f.locator('#ctx').click();
    await f.locator('[data-a=start][data-k=dungeon]').click();
    await f.waitForFunction(()=>Scene.debug().map.dungeonFloor);
    const count=await f.evaluate(r=>Dungeons.get(r).floors.length,r);
    await assertTexture(f);
    for(let floor=0;floor<count;floor++){
      expect(await f.evaluate(()=>__bw.DG.f)).toBe(floor);
      const entities=await f.evaluate(()=>Scene.debug().map.ents.map(e=>({id:e.id,kind:e.kind,lieutenant:!!e.lieutenant})));
      const up=await f.evaluate(()=>Scene.find(e=>e.kind==='dtravel'&&e.to<__bw.DG.f).id);
      await assertPortalArt(f,up,r,'up');
      if(floor===0)await capturePortal(f,page,info,'dungeon-'+r+'-entrance');
      if(floor===1)await capturePortal(f,page,info,'dungeon-'+r+'-stairs-up');
      if(stats.fixture&&floor===0){const gate=entities.find(e=>e.kind==='dgate');await walk(f,gate.id,stats);await screenshot(page,info,'dungeon-'+r+'-barrier');}
      for(const kind of ['dlever','dsecret']){
        const e=entities.find(e=>e.kind===kind);await interact(f,e.id,stats);
        await f.locator('[data-a=dopen]').click();
        expect(await f.evaluate(id=>!!__bw.DP.current().gates[id],kind==='dlever'?await f.evaluate(id=>Scene.find(e=>e.id===id).target,e.id):e.id)).toBe(true);
      }
      const lore=entities.find(e=>e.kind==='dlore');await interact(f,lore.id,stats);await expect(f.locator('#say')).toBeVisible();await closeSheet(f);
      const cache=entities.find(e=>e.kind==='dcache');await interact(f,cache.id,stats);
      for(let attempt=0;attempt<10&&await f.locator('[data-a=lockwork]').first().isVisible();attempt++){
        await f.locator('[data-a=lockwork][data-kind=lock]').click();await f.locator('#sql').fill(await f.evaluate(()=>__bw.Q.task.sql));await f.locator('#kb [data-fn=run]').click();stats.queries++;await f.locator('[data-a=qleave]').last().click();
        if(!await f.locator('#sheet').isVisible())await interact(f,cache.id,stats);
      }
      await expect(f.locator('#sheet')).toContainText('A hidden cache');await closeSheet(f);
      if(floor===0){await f.locator('#nav [data-t=map]').click();await expect(f.locator('.dungeon-map img')).toBeVisible();await expect(f.locator('#coach')).toBeHidden();await screenshot(page,info,'dungeon-'+r+'-map');await f.locator('[data-a=tab][data-t=world]').filter({hasText:'Return to dungeon'}).click();}
      await screenshot(page,info,'dungeon-'+r+'-floor-'+(floor+1));
      const lieutenant=entities.find(e=>e.lieutenant);
      if(lieutenant)await engage(f,lieutenant.id,stats);
      stats.floors.push(floor+1);
      console.log('Dungeon '+r+' floor '+(floor+1)+' explored; '+stats.fights+' fights, '+stats.queries+' queries.');
      if(floor<count-1){
        const down=await f.evaluate(()=>Scene.debug().map.ents.find(e=>e.kind==='dtravel'&&e.to>__bw.DG.f).id);
        await interact(f,down,stats,false,async()=>{
          await assertPortalArt(f,down,r,'down');
          if(floor===0)await screenshot(page,info,'dungeon-'+r+'-stairs-down');
        });
        await f.locator('[data-a=dtravel]').click();
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
    await page.waitForLoadState('networkidle');
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
