const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');

async function openDev(page){
  await page.goto('/__dev/game?visual_test=1');
  await page.waitForFunction(()=>window.Dev||document.documentElement.dataset.devError,null,{timeout:45000});
  expect(await page.evaluate(()=>document.documentElement.dataset.devError)).toBeUndefined();
}
async function resourcesVisible(page){
  const box=await page.locator('#hud .hud-resources').boundingBox();
  const viewport=page.viewportSize();expect(box).toBeTruthy();
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.x+box.width).toBeGreaterThan(viewport.width-24);
  expect(box.y).toBeGreaterThanOrEqual(0);
  for(const id of ['hp','mana','stamina'])await expect(page.locator(`#hud [data-resource=${id}] [role=meter]`)).toBeVisible();
  const run=await page.locator('#kb [data-fn=run]').boundingBox();
  if(run){expect(run.y+run.height).toBeLessThanOrEqual(viewport.height+1);expect(run.y).toBeGreaterThan(box.y+box.height);}
}

test('landscape SQL reference views replace letters and preserve the selected draft through rotation',async({page},info)=>{
  const errors=observeErrors(page);await page.setViewportSize({width:844,height:390});await openDev(page);
  await page.evaluate(()=>Dev.resources({mana:1,stamina:1}));
  await page.locator('#combat-bar [data-id=recover]').click();await expect(page.locator('#sql')).toBeVisible();
  const draft='/* keep my draft */ SELECT name FROM items;';await page.locator('#sql').fill(draft);
  await page.locator('#sql').evaluate(el=>el.setSelectionRange(27,31));
  const context=await page.evaluate(()=>({task:__bw.F.task.sql,hint:__bw.F.hint,fixed:__bw.F.fixed}));
  for(const [button,view] of [['[data-a=ftables]','tables'],['[data-fn=lcmd]','cmd'],['[data-fn=lfld]','fld'],['[data-a=queryhelp]','help']]){
    await page.locator(button).click();await expect(page.locator('#kb')).toHaveAttribute('data-view',view);
    await expect(page.locator('#kb>.row.r0')).toHaveCount(0);await expect(page.locator('#sql')).toHaveValue(draft);
    expect(await page.locator('#sql').evaluate(el=>[el.selectionStart,el.selectionEnd])).toEqual([27,31]);
    await resourcesVisible(page);
    if(view==='tables'||view==='help')await screenshot(page,info,'landscape-'+view);
    await page.locator('#kb [data-fn=ldone]').click();await expect(page.locator('#kb')).toHaveAttribute('data-view','keyboard');
  }
  for(const size of [{width:390,height:720},{width:812,height:375},{width:740,height:320},{width:844,height:390}]){
    await page.setViewportSize(size);await expect(page.locator('#sql')).toHaveValue(draft);await resourcesVisible(page);
    expect(await page.evaluate(()=>({task:__bw.F.task.sql,hint:__bw.F.hint,fixed:__bw.F.fixed}))).toEqual(context);
  }
  await page.locator('[data-a=combatback]').click();await expect(page.locator('#fight')).toBeHidden();
  await page.locator('#combat-bar [data-id=recover]').click();await expect(page.locator('#sql')).toHaveValue(draft);
  expect(await page.locator('#sql').evaluate(el=>[el.selectionStart,el.selectionEnd])).toEqual([27,31]);
  await screenshot(page,info,'landscape-keyboard');expect(errors).toEqual([]);
});

test('SQL command and field insertion use the selected range without changing reference mode',async({page})=>{
  const errors=observeErrors(page);await page.setViewportSize({width:844,height:390});await openDev(page);
  await page.evaluate(()=>Dev.resources({mana:1,stamina:1}));await page.locator('#combat-bar [data-id=recover]').click();
  await page.locator('#sql').fill('select replace_me from items');
  await page.locator('#sql').evaluate(el=>el.setSelectionRange(7,17));await page.locator('[data-fn=lfld]').click();
  await page.locator('#klist .li.cl[data-ins=name]').click();await expect(page.locator('#kb')).toHaveAttribute('data-view','fld');
  const inserted=await page.locator('#sql').inputValue();expect(inserted).toContain('name');expect(inserted).not.toContain('replace_me');
  await page.locator('[data-fn=fmt]').click();await expect(page.locator('#kb')).toHaveAttribute('data-view','fld');await expect(page.locator('#sql')).toHaveValue(/SELECT[\s\S]*FROM/);
  await page.locator('[data-fn=ret]').click();await expect(page.locator('#sql')).toHaveValue(/\n/);await expect(page.locator('#kb')).toHaveAttribute('data-view','fld');
  await page.locator('[data-fn=ldone]').click();await page.locator('[data-fn=sys]').click();await expect(page.locator('#sql')).toHaveAttribute('inputmode','text');
  await page.locator('[data-a=ftables]').click();await expect(page.locator('#kb')).toHaveAttribute('data-view','tables');await resourcesVisible(page);
  expect(errors).toEqual([]);
});

test('Technique Book equips exactly four stable slots across weapon and spell disciplines',async({page},info)=>{
  const errors=observeErrors(page);await page.setViewportSize({width:1280,height:800});await openDev(page);
  // Prepare learned knowledge; earned dojo learning is covered by the gameplay suite.
  await page.evaluate(()=>{Dev.skills({swords:70,magery:70});Techniques.teach(__bw.S,1);Techniques.teach(__bw.S,2);__bw.render();});
  await page.locator('#nav [data-t=hero]').click();if(await page.locator('[data-a=coachok]').isVisible())await page.locator('[data-a=coachok]').click();
  await page.locator('[data-a=combatbook]').click();await expect(page.locator('.technique-position')).toHaveCount(4);
  const ids=await page.evaluate(()=>Combat.snapshot().techniques.filter(t=>t.learned&&t.requirement<=70&&['swords','magery'].includes(t.discipline)).slice(0,4).map(t=>t.id));
  // Choose two weapon techniques and two spells, rather than relying on catalog ordering.
  const mixed=await page.evaluate(()=>['swords','magery'].flatMap(d=>Combat.snapshot().techniques.filter(t=>t.learned&&t.requirement<=70&&t.discipline===d).slice(0,2).map(t=>t.id)));
  expect(ids.length).toBeGreaterThanOrEqual(4);expect(mixed).toHaveLength(4);
  for(let slot=0;slot<4;slot++){
    await page.locator(`[data-a=techniqueslot][data-slot="${slot}"]`).click();
    await page.locator(`[data-a=combatequip][data-id="${mixed[slot]}"]`).click();
  }
  expect(await page.evaluate(()=>Combat.snapshot().loadout.map(t=>t?.id))).toEqual(mixed);
  await expect(page.locator('.technique-entry.equipped')).toHaveCount(4);await screenshot(page,info,'technique-book-mixed');
  await page.locator('[data-a=closesheet]').first().click();await page.locator('#nav [data-t=world]').click();
  await expect(page.locator('.combat-techniques .combat-action')).toHaveCount(4);await screenshot(page,info,'desktop-four-techniques');
  await page.setViewportSize({width:844,height:390});await expect(page.locator('.combat-techniques .combat-action')).toHaveCount(4);await screenshot(page,info,'landscape-four-techniques');
  expect(errors).toEqual([]);
});

test('rotation releases held movement instead of replaying the old input on the new layout',async({page})=>{
  const errors=observeErrors(page);await page.setViewportSize({width:844,height:390});await openDev(page);
  await page.keyboard.down('w');await page.waitForTimeout(160);
  await page.setViewportSize({width:390,height:720});
  await expect.poll(()=>page.evaluate(()=>!!Scene.debug().P.manual)).toBe(false);
  const stopped=await page.evaluate(()=>Scene.pos());await page.waitForTimeout(250);
  const after=await page.evaluate(()=>Scene.pos());expect(Math.hypot(after[0]-stopped[0],after[1]-stopped[1])).toBeLessThan(.05);
  await page.keyboard.up('w');expect(errors).toEqual([]);
});
