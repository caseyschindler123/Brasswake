const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
async function open(page){await page.goto('/__dev/game?visual_test=1');await page.waitForFunction(()=>window.Dev||document.documentElement.dataset.devError,null,{timeout:45000});expect(await page.evaluate(()=>document.documentElement.dataset.devError)).toBeUndefined();}
test('developer commands prepare real gear, skills, monsters and reset without leaking storage',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__health');await page.evaluate(()=>localStorage.setItem('player-sentinel','keep'));
  await open(page);
  const initial=await page.evaluate(()=>Dev.snapshot());
  const result=await page.evaluate(()=>{Dev.skills({swords:60});Dev.attributes({str:75,dex:75,int:75});Dev.resources({gold:1234});const item=Dev.grant({weapon:'swords'});const ids=Dev.spawn({monster:'b102',count:2});return {item,ids,state:Dev.snapshot()};});
  expect(result.state.hero.sk.swords).toBe(60);expect(result.state.hero.gold).toBe(1234);expect(result.state.hero.eq.weapon).toBe(result.item.id);expect(result.ids).toHaveLength(2);
  await screenshot(page,info,'developer-arena');
  await page.evaluate(()=>Dev.battle(Dev.snapshot().spawned[0].id));await expect(page.locator('#fight')).toBeVisible();
  await page.locator('[data-a=fpage][data-id=a1]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await page.locator('#sql').fill('SELECT -987654321 AS unrelated_result');await page.locator('#kb [data-fn=run]').click();await expect(page.locator('.query-power')).toContainText('0% power');
  const reset=await page.evaluate(()=>Dev.reset(1));expect(reset.hero.gold).toBe(initial.hero.gold);expect(reset.spawned).toEqual([]);expect(reset.fight).toBeNull();
  await page.goto('/__health');expect(await page.evaluate(()=>localStorage.getItem('player-sentinel'))).toBe('keep');expect(await page.evaluate(()=>typeof window.Dev)).toBe('undefined');expect(errors).toEqual([]);
});
test('developer building and travel use real geometry and reject invalid setup',async({page},info)=>{
  await open(page);await page.evaluate(()=>Dev.teleport({region:2}));expect(await page.evaluate(()=>__bw.S.region)).toBe(2);
  for(const command of [()=>Dev.skills({swords:999}),()=>Dev.spawn({monster:'unknown'}),()=>Dev.teleport({region:0}),()=>Dev.grant({slot:'unknown'})]){
    expect(await page.evaluate(source=>{try{(0,eval)('('+source+')')();return false;}catch{return true;}},command.toString())).toBe(true);
  }
  await page.evaluate(()=>Dev.building({region:2,shape:'courtyard'}));await expect(page.locator('#dev-building-preview canvas').first()).toBeVisible();await screenshot(page,info,'developer-building');
  const roof=await page.locator('#dev-building-preview canvas').evaluate(c=>c.toDataURL());await page.getByRole('button',{name:'Toggle roof'}).click();expect(await page.locator('#dev-building-preview canvas').evaluate(c=>c.toDataURL())).not.toBe(roof);
  await page.getByRole('button',{name:'Close building preview'}).click();await page.evaluate(()=>Dev.teleport({region:1,dungeon:1}));expect(await page.evaluate(()=>Scene.inDungeon())).toBeTruthy();await page.evaluate(()=>Dev.reset());
});
test('developer panel exposes the same commands with an isolated ready character',async({page},info)=>{
  await page.goto('/__dev');await expect(page.locator('#status')).toContainText('Ready.',{timeout:45000});await page.locator('[data-command=grant]').click();await expect(page.locator('#status')).toContainText('grant completed');await screenshot(page,info,'developer-panel');
});
module.exports={open};

test('creature loot follows species through real victories and collection',async({page},info)=>{
  test.setTimeout(120000);
  const errors=observeErrors(page);await open(page);
  for(const scenario of ['gull','wolf-leader','bandit','dungeon-rat']){
    await page.evaluate(async scenario=>{
      await Dev.reset(17);__bw.S.pages.h1=1;Dev.skills({swords:100,tactics:100,anatomy:100});Dev.attributes({str:100,dex:100,int:25});Dev.resources({hp:Progression.maxHp(__bw.S)});Dev.grant({weapon:'swords',rarity:'legendary',tier:8});
      if(scenario==='dungeon-rat'){
        Dev.teleport({region:1,dungeon:0});const e=Scene.find(e=>e.species==='d11'&&e.kind==='mon');if(!e)throw Error('Missing dungeon rat');__bw.DP.fight(e);
      }else{
        const id=Dev.spawn({monster:scenario==='gull'?'b102':scenario==='bandit'?'b401':'b403'})[0];
        if(scenario==='wolf-leader'){const e=Scene.find(e=>e.id===id);Object.assign(e.inst,{lk:'l24',lead:1,lair:'loot-regression',elite:true});}
        Dev.battle(id);
      }
    },scenario);
    if(scenario==='bandit')await expect(page.locator('[data-a=fsteal]')).toBeVisible();else {
      await expect(page.locator('[data-a=fsteal]')).toHaveCount(0);
      expect(await page.evaluate(()=>{__bw.ACT.fsteal();return __bw.F.act;})).toBe('fight');
    }
    for(let n=0;n<20&&!await page.evaluate(()=>__bw.F.over);n++){
      const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
      const choose=page.locator('[data-a=fchoose]');if(await choose.isVisible())await choose.click();
      await page.locator('[data-a=fpage]').first().click();if(await coach.isVisible())await coach.click();
      await page.locator('#sql').fill(await page.evaluate(()=>__bw.F.task.sql));await page.locator('#kb [data-fn=run]').click();await page.waitForFunction(()=>__bw.F&&!__bw.F.busy);
    }
    expect(await page.evaluate(()=>!!__bw.F.body)).toBe(true);
    const result=await page.evaluate(()=>({loot:__bw.F.body.loot,gold:__bw.S.gold,meat:__bw.S.meat||0,hide:__bw.S.mats.hide||0}));
    if(scenario==='bandit')expect(result.loot.gold).toBeGreaterThan(0);
    else{expect(result.loot.gold).toBe(0);expect(result.loot.items).toEqual([]);expect(result.loot.scrolls).toEqual([]);expect(result.loot.mats).toEqual({});expect(result.loot.sigils).toBeUndefined();}
    if(scenario==='gull'){expect(result.loot.meat).toBeGreaterThan(0);expect(result.loot.hide).toBeUndefined();}
    if(scenario==='wolf-leader')expect(result.loot.hide).toBe(3);
    if(scenario==='dungeon-rat')expect(result.loot.hide).toBe(1);
    await page.locator('[data-a=floot]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    await expect(page.locator('[data-a=lootall]')).toBeVisible();await expect(page.locator('#toast > div')).toHaveCount(0);await screenshot(page,info,'creature-loot-'+scenario);
    await page.locator('[data-a=lootall]').click();
    const after=await page.evaluate(()=>({gold:__bw.S.gold,meat:__bw.S.meat||0,hide:__bw.S.mats.hide||0}));
    if(scenario==='bandit')expect(after.gold-result.gold).toBeGreaterThan(0);else expect(after.gold-result.gold).toBe(0);
    expect(after.meat-result.meat).toBe(result.loot.meat||0);expect(after.hide-result.hide).toBe(result.loot.hide||0);
  }
  expect(errors).toEqual([]);
});
