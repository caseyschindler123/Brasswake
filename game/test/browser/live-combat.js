const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
async function open(page){await page.goto('/__dev/game?visual_test=1');await page.waitForFunction(()=>window.Dev||document.documentElement.dataset.devError,null,{timeout:45000});expect(await page.evaluate(()=>document.documentElement.dataset.devError)).toBeUndefined();}
async function ready(page,id){await page.waitForFunction(id=>__bw.Combat.descriptor(id).ready,id,{timeout:15000});}
async function run(page,sql){await page.locator('#fight #sql').fill(sql);await page.locator('#kb [data-fn=run]').click();await page.waitForTimeout(350);}

test('live combat: SQL freezes pursuit and retains draft, assistance and costs across cancellation',async({page},info)=>{
  const errors=observeErrors(page);await open(page);
  const before=await page.evaluate(()=>{Dev.skills({magery:80});Dev.grant({weapon:'magery'});const [id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id);__bw.Combat.selectTarget(e);__bw.Combat.begin('basic.magery');return {mana:__bw.S.mana,hp:__bw.S.hp,task:__bw.F.task.sql,position:[e.fx,e.fy]};});
  await expect(page.locator('#fight #sql')).toBeVisible();
  await page.locator('#fight #sql').fill('SELECT draft');await page.evaluate(()=>{__bw.F.hint=1;__bw.F.fixed=1;__bw.F.editorState={selectionStart:4};});
  await page.waitForTimeout(1100);
  expect(await page.evaluate(()=>({mana:__bw.S.mana,hp:__bw.S.hp,remaining:__bw.Combat.snapshot().recovery.remaining}))).toEqual({mana:before.mana,hp:before.hp,remaining:0});
  await page.evaluate(()=>{__bw.Combat.cancel();__bw.Combat.begin('basic.magery');});
  expect(await page.locator('#fight #sql').inputValue()).toBe('SELECT draft');
  expect(await page.evaluate(()=>({sql:__bw.F.task.sql,hint:__bw.F.hint,fixed:__bw.F.fixed}))).toEqual({sql:before.task,hint:1,fixed:1});
  await run(page,'SELECT 999 AS wrong');
  expect(await page.evaluate(()=>__bw.S.mana)).toBe(before.mana-3);
  expect(await page.evaluate(()=>__bw.Combat.snapshot().recovery.total)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>__bw.F.queryPower)).toBe(0);
  await screenshot(page,info,'live-combat-wrong-action');expect(errors).toEqual([]);
});

test('live combat: real spell effects use opponent-relative SQL and current skill gates',async({page},info)=>{
  const errors=observeErrors(page);await open(page);
  await page.evaluate(()=>{Dev.skills({magery:100});Dev.grant({weapon:'magery'});Techniques.teach(__bw.S,1);__bw.Combat.equip('magery.frost-dart',0);const [id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id);__bw.Combat.selectTarget(e);__bw.Combat.begin('magery.frost-dart');});
  expect(await page.evaluate(()=>__bw.F.kc)).toBe(2);
  const mana=await page.evaluate(()=>__bw.S.mana),sql=await page.evaluate(()=>__bw.F.task.sql);
  await run(page,sql);
  const outcome=await page.evaluate(()=>({mana:__bw.S.mana,target:__bw.Combat.snapshot().target,phase:__bw.F.st}));
  expect(outcome.mana).toBe(mana-6);expect(outcome.phase).toBe('after');expect(outcome.target.hp).toBeLessThan(outcome.target.max);
  await page.evaluate(()=>{__bw.Combat.cancel();__bw.S.sk.magery=49;});
  expect(await page.evaluate(()=>__bw.S.techniques.equipped[0])).toBe('magery.frost-dart');expect(await page.evaluate(()=>__bw.Combat.descriptor('magery.frost-dart').eligible)).toBe(false);
  await screenshot(page,info,'live-combat-technique');expect(errors).toEqual([]);
});

test('live combat: aggression warns, ranged enemies hit, and separation ends pursuit',async({page})=>{
  const errors=observeErrors(page);await open(page);
  await page.evaluate(()=>{const wild=Scene.ents().find(e=>e.kind==='mon'&&e.r===1&&!Geography.inTown(e.x,e.y));if(!wild)throw Error('No wilderness encounter');const at=Scene.safePosition([wild.x,wild.y+2],1);Dev.teleport({region:1,x:at[0],y:at[1]});for(const other of Scene.ents())if(other.kind==='mon')other.agg=0;
    const [id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id),m=Scene.debug().map,p=Scene.pos(),directions=[[1,0],[-1,0],[0,1],[0,-1]],direction=directions.find(([dx,dy])=>[1,2,3].every(n=>!m.solid[(p[1]+dy*n)*m.w+p[0]+dx*n]&&!m.occ.has((p[1]+dy*n)*m.w+p[0]+dx*n)));
    if(!direction)throw Error('No clear ranged approach');Scene.hallMove(e,p[0]+direction[0]*3,p[1]+direction[1]*3);e.home=[e.x,e.y];e.agg=1;e.wander=0;e.combat=undefined;window.testEnemy=id;});
  await page.waitForFunction(()=>{const e=Scene.find(e=>e.id===window.testEnemy);return e.combat?.awareness>0&&e.combat.phase==='alert';});
  const hp=await page.evaluate(()=>__bw.S.hp);
  await page.waitForFunction(()=>Scene.find(e=>e.id===window.testEnemy)?.combat?.phase==='chase');
  await page.evaluate(()=>{window.testRandom=Math.random;Math.random=()=>.01;});
  await page.waitForFunction(hp=>__bw.S.hp<hp,hp,{timeout:15000});
  await page.evaluate(()=>{Math.random=window.testRandom;const e=Scene.find(e=>e.id===window.testEnemy);e.pursuitAnchor=[e.x-2,e.y];e.combat.profile.leash=.1;});
  await page.waitForFunction(()=>!__bw.Combat.active());
  expect(errors).toEqual([]);
});

test('live combat: native movement pauses melee recovery without erasing progress',async({page})=>{
  const errors=observeErrors(page);await open(page);
  const key=await page.evaluate(()=>{Dev.teleport({region:1});Dev.grant({weapon:'swords'});const p=Scene.debug().P,m=Scene.debug().map;const choices=[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]];return choices.find(([,dx,dy])=>[1,2,3].every(n=>!m.solid[(p.y+dy*n)*m.w+p.x+dx*n]&&!m.occ.has((p.y+dy*n)*m.w+p.x+dx*n)))?.[0];});
  expect(key).toBeTruthy();
  await page.evaluate(()=>{const[id]=Dev.spawn({monster:'b101'}),e=Scene.find(e=>e.id===id);Scene.hallMove(e,...Scene.pos().map((v,i)=>v+(i?0:1)));__bw.Combat.selectTarget(e);__bw.Combat.begin('basic.swords');});
  await run(page,'SELECT 999 AS wrong');await page.evaluate(()=>__bw.Combat.cancel());
  const before=await page.evaluate(()=>({p:[Scene.debug().P.fx,Scene.debug().P.fy],r:__bw.Combat.snapshot().recovery.remaining}));
  await page.keyboard.down(key);await page.waitForTimeout(450);await page.keyboard.up(key);
  const after=await page.evaluate(()=>({p:[Scene.debug().P.fx,Scene.debug().P.fy],r:__bw.Combat.snapshot().recovery.remaining}));
  expect(after.p).not.toEqual(before.p);expect(after.r).toBeGreaterThan(before.r-.16);
  await page.waitForFunction(r=>__bw.Combat.snapshot().recovery.remaining<r-.15,after.r);
  expect(errors).toEqual([]);
});

test('live combat: earned mixed dojo training grants permanent cross-discipline knowledge and reloads',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="0"]').click();await page.locator('[data-a=begin]').click();await require('./intro-helper').skipArrival(page,'Tech learner');
  await page.evaluate(()=>{__bw.S.tut=3;__bw.S.gd=99;__bw.S.seen={...__bw.S.seen,hero:1,fight:1,fprompt:1};__bw.SH.dojo({r:1});__bw.ACT.learninghub({r:1});});
  const before=await page.evaluate(()=>({sk:JSON.stringify(__bw.S.sk),gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana}));
  await page.locator('[data-a=learnpractice]').click();
  for(let i=0;i<3;i++){await page.locator('#enc #sql').fill(await page.evaluate(()=>__bw.Q.task.sql));await page.locator('#enc #kb [data-fn=run]').click();await expect(page.locator('#enc')).toContainText('Your query gives the requested result.');if(i<2){await page.waitForTimeout(350);await page.locator('[data-a=learnnext]').click();}}
  const learned=await page.evaluate(()=>({ids:Object.keys(__bw.S.techniques.learned),dojo:__bw.S.techniques.dojo[1],sk:JSON.stringify(__bw.S.sk),gold:__bw.S.gold,hp:__bw.S.hp,mana:__bw.S.mana}));
  expect(learned.ids).toEqual(expect.arrayContaining(['swords.cross-cut','fencing.stop-thrust','archery.true-shot','magery.frost-dart']));expect(learned.dojo).toBe(true);expect(learned.sk).toBe(before.sk);expect(learned.gold).toBe(before.gold);expect(learned.hp).toBe(before.hp);expect(learned.mana).toBe(before.mana);
  await screenshot(page,info,'dojo-earned-techniques');await page.evaluate(()=>__bw.save());await page.reload();await expect(page.locator('[data-a=playslot]').first()).toContainText('Tech learner');
  expect(await page.evaluate(()=>Object.keys(__bw.S.techniques.learned))).toEqual(learned.ids);expect(errors).toEqual([]);
});

test('live combat: Hide stays reachable as contextual utility and preserves its SQL training',async({page})=>{
  const errors=observeErrors(page);await open(page);await page.evaluate(()=>{Dev.skills({hiding:100,stealth:20});__bw.Combat.begin('hide');});
  await expect(page.locator('#enc #sql')).toBeVisible();const sql=await page.evaluate(()=>__bw.Q.task.sql);await page.locator('#enc #sql').fill(sql);await page.locator('#enc #kb [data-fn=run]').click();
  expect(await page.evaluate(()=>__bw.Combat.snapshot().recovery.discipline)).toBe('support');
  expect(await page.evaluate(()=>__bw.Combat.snapshot().actions.some(a=>a.id==='hide'))).toBe(true);expect(errors).toEqual([]);
});

test('live combat: real dungeon walls block targeting and enemy awareness',async({page})=>{
  const errors=observeErrors(page);await open(page);
  const boundary=await page.evaluate(()=>{Dev.teleport({region:1,dungeon:0});const m=Scene.debug().map;let pair=null;
    for(let y=2;y<m.h-2&&!pair;y++)for(let x=2;x<m.w-3&&!pair;x++)if(!m.solid[y*m.w+x]&&m.solid[y*m.w+x+1]&&!m.solid[y*m.w+x+2]&&!m.occ.has(y*m.w+x)&&!m.occ.has(y*m.w+x+2))pair=[x,y];
    if(!pair)throw Error('No authored wall boundary found');Scene.hop(...pair);const[id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id);Scene.hallMove(e,pair[0]+2,pair[1]);e.home=[e.x,e.y];e.agg=1;__bw.Combat.selectTarget(e);const facts=Scene.combatFacts(e),started=__bw.Combat.begin('basic.magery');window.testWallEnemy=id;return {visible:facts.visible,started,reason:__bw.Combat.descriptor('basic.magery').reason};});
  expect(boundary.visible).toBe(false);expect(boundary.started).toBe(false);expect(boundary.reason).toContain('obstacle');await page.waitForTimeout(1200);
  expect(await page.evaluate(()=>Scene.find(e=>e.id===window.testWallEnemy).combat.awareness)).toBe(0);expect(errors).toEqual([]);
});

test('live combat: bag draught respects prepared supplies, shared recovery and SQL commitment',async({page})=>{
  const errors=observeErrors(page);await open(page);
  await page.evaluate(()=>{Dev.resources({hp:40});__bw.Combat.setSupply('draught');const[id]=Dev.spawn({monster:'b104'});__bw.Combat.selectTarget(Scene.find(e=>e.id===id));__bw.Combat.begin('basic.magery');});
  await run(page,'SELECT 999 AS wrong');
  const before=await page.evaluate(()=>{const data={hp:__bw.S.hp,mana:__bw.S.mana,tonics:__bw.S.tonics};__bw.ACT.tonic();return data;});
  expect(await page.evaluate(()=>({hp:__bw.S.hp,mana:__bw.S.mana,tonics:__bw.S.tonics}))).toEqual(before);
  await ready(page,'supply');await page.evaluate(()=>__bw.ACT.tonic());expect(await page.evaluate(()=>__bw.F.definition.effect)).toBe('draught');
  await run(page,await page.evaluate(()=>__bw.F.task.sql));expect(await page.evaluate(()=>__bw.S.tonics)).toBe(before.tonics-1);expect(await page.evaluate(()=>__bw.S.mana)).toBe(before.mana);expect(await page.evaluate(()=>__bw.S.hp)).toBe(before.hp+30);expect(errors).toEqual([]);
});

test('live combat: a real victory creates loot and leaves no corpse aggression',async({page})=>{
  const errors=observeErrors(page);await open(page);
  const gold=await page.evaluate(()=>{Dev.skills({magery:100,eval:100});Dev.attributes({int:100});Dev.resources({mana:100});Dev.grant({weapon:'magery',rarity:'epic',tier:8});const[id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id);if(!CreatureLoot.carries(e))throw Error('Victory fixture must carry earned loot');__bw.Combat.selectTarget(e);__bw.Combat.begin('basic.magery');window.testRandom=Math.random;Math.random=()=>.01;return __bw.S.gold;});
  await run(page,await page.evaluate(()=>__bw.F.task.sql));
  expect(await page.evaluate(()=>__bw.F.over)).toBe(true);expect(await page.evaluate(()=>__bw.S.stats.kills)).toBe(1);expect(await page.evaluate(()=>__bw.Combat.active())).toBe(false);
  await page.evaluate(()=>Math.random=window.testRandom);await page.locator('[data-a=floot]').click();await page.locator('[data-a=lootall]').click();expect(await page.evaluate(()=>__bw.S.gold)).toBeGreaterThan(gold);expect(errors).toEqual([]);
});

test('live combat: live enemy damage retains death recovery and corpse belongings',async({page})=>{
  const errors=observeErrors(page);await open(page);
  await page.evaluate(()=>{const wild=Scene.ents().find(e=>e.kind==='mon'&&e.r===1&&!Geography.inTown(e.x,e.y)),at=Scene.safePosition([wild.x,wild.y+2],1);Dev.teleport({region:1,x:at[0],y:at[1]});for(const e of Scene.ents())if(e.kind==='mon')e.agg=0;Dev.resources({hp:1});const[id]=Dev.spawn({monster:'b104'});const e=Scene.find(e=>e.id===id);__bw.Combat.selectTarget(e);Scene.combatEngage(e);e.combat.cooldown=0;window.testRandom=Math.random;Math.random=()=>.01;});
  await page.waitForFunction(()=>__bw.F?.kick===true,null,{timeout:15000});
  expect(await page.evaluate(()=>!!__bw.S.remains)).toBe(true);expect(await page.evaluate(()=>__bw.S.remains.loot.gold)).toBeGreaterThan(0);
  await page.evaluate(()=>Math.random=window.testRandom);await page.locator('[data-a=fdone]').click();expect(await page.evaluate(()=>__bw.S.hp)).toBe(await page.evaluate(()=>__bw.maxHp()));expect(await page.evaluate(()=>__bw.S.deathPending)).toBeNull();expect(errors).toEqual([]);
});

module.exports={open,ready,run};
