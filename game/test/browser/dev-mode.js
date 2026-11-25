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
