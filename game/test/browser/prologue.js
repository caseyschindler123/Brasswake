const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
const {nameAboard,shipApproach}=require('./intro-helper');

async function visibleRescue(page,info){
  await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="3"]').click();await page.locator('[data-a=begin]').click();
  await require('./intro-helper').fullArrival(page,info,screenshot,{name:'Sea Traveller',origin:'dwarrowdeep',visibleOnly:true});
}
test('visible controls carry the rescued character all the way ashore',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/index.html?visual_test=1');await visibleRescue(page,info);expect(errors).toEqual([]);
});

test('a failed SQL download explains the problem and leaves a saved way back',async({page})=>{
  await page.route('**/__sql.js',route=>route.abort('failed'));
  await page.route('**/sql-asm.js',route=>route.abort('failed'));
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="0"]').click();await page.locator('[data-a=begin]').click();
  await expect(page.locator('#onboard')).toContainText('could not be downloaded');await page.locator('[data-a=boatmenu]').click();await expect(page.locator('#title')).toBeVisible();
  expect(await page.evaluate(()=>{
    const account=JSON.parse(localStorage.getItem('brasswake.acct.v9'));
    return account.worlds[account.world].slots[0].prologue.phase;
  })).toBe('rescue');
});
module.exports={visibleRescue};

test('boat checkpoints resume and character switching keeps ship coordinates out of the world',async({page},info)=>{
  test.setTimeout(180000);const errors=observeErrors(page);
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="3"]').click();await page.locator('[data-a=begin]').click();
  await page.locator('[data-a=boatskiprescue]').click();await page.locator('#boat-name').fill('Mara');await page.locator('[data-a=boatmenu]').click();await page.locator('[data-a=playslot][data-i="0"]').click();await expect(page.locator('#boat-name')).toHaveValue('Mara');await nameAboard(page,'Mara');
  await page.locator('[data-a=boathome][data-id=sylvanreach]').click();
  async function reopen(phase){
    await page.locator('[data-a=boatmenu]').click();await expect(page.locator('#title')).toBeVisible();
    await page.reload();await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot][data-i="0"]').click();
    await expect(page.locator('#onboard')).toHaveAttribute('data-phase',phase);expect(await page.evaluate(()=>__bw.S.pos)).toBe(null);
  }
  await reopen('recognition');await expect(page.locator('#onboard')).toContainText('lockpicker');await expect(page.locator('#onboard')).toContainText('Mara');
  await page.locator('[data-a=boatnext]').click();await page.locator('[data-a=boatnext]').click();await page.locator('[data-a=boatnext]').click();await page.waitForTimeout(4000);
  await shipApproach(page,'shipPerson');const deck=await page.evaluate(()=>Scene.pos());await reopen('walk');expect(await page.evaluate(()=>Scene.pos())).toEqual(deck);
  await page.locator('[data-a=boatmenu]').click();await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="6"]').click();await page.locator('#cr-name').fill('Supporting');await page.locator('[data-a=begin]').click();
  expect(await page.evaluate(()=>Scene.inShip())).toBe(false);expect(await page.evaluate(()=>__bw.S.pos===null||__bw.S.pos[0]>18)).toBe(true);
  await page.locator('#nav [data-t=hero]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await page.locator('[data-a=reset]').click();await page.locator('[data-a=playslot][data-i="0"]').click();
  await expect(page.locator('#onboard')).toHaveAttribute('data-phase','walk');expect(await page.evaluate(()=>Scene.pos())).toEqual(deck);expect(await page.evaluate(()=>__bw.S.pos)).toBe(null);
  if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();await page.locator('[data-a=boatnext]').click();await reopen('arrival');await shipApproach(page,'shipExit');await expect(page.locator('#ctx')).toHaveText('Step ashore');
  if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();
  await expect(page.locator('#onboard')).toBeHidden();await expect.poll(()=>page.evaluate(()=>({done:__bw.S.prologue.phase,gd:__bw.S.gd,ship:Scene.inShip()}))).toEqual({done:'done',gd:1,ship:false});await screenshot(page,info,'resumed-arrival-ashore');expect(errors).toEqual([]);
});
