const {test,expect}=require('@playwright/test');
const {screenshot,observeErrors}=require('./flow');
const {speech,clickWorld,learnMovement,person,query,visit,beginnerFight,roadFarewell,finishGuidedDay,beginnerAnswer}=require('./first-day-helper');

// Retain action traces, DOM snapshots and named screenshots without
// encoding gameplay frames throughout a multi-minute real-time journey.
const journey = test.extend({ trace: { mode: 'retain-on-failure', screenshots: false } });

for (const [path,look] of [['warrior',0],['thief',2],['mage',4],['crafter',6]]) journey('a new player meets Tamsin, learns SQL and completes the guided day without skipping · '+path,async({page},info)=>{
  journey.setTimeout(750000);const errors=observeErrors(page),stats={fixture:false,steps:0,queries:0,solveVisibleFight:beginnerFight};
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator(`[data-a=pick][data-look="${look}"]`).click();await page.locator('[data-a=begin]').click();
  await require('./intro-helper').fullArrival(page,info,screenshot);await expect(page.locator('[data-a=conceal]')).toHaveCount(0);await page.waitForTimeout(500);await speech(page);await learnMovement(page,stats);
  await person(page,'folk',stats);if(await page.evaluate(()=>__bw.S.gd<3)){await speech(page);await person(page,'folk',stats);}await expect.poll(()=>page.evaluate(()=>__bw.S.gd)).toBe(3);await speech(page);await page.waitForTimeout(500);await speech(page);
  await person(page,'dojo',stats);await expect.poll(()=>page.evaluate(()=>Scene.inHall())).toBe(1);
  await person(page,'odalys',stats);await speech(page,'[data-a=start][data-k=intro]');
  await expect(page.locator('#enc')).toContainText('practice copy');await page.locator('[data-s=irow]').click();
  await page.locator('[data-kind=row][data-v="1"]').click();await expect(page.locator('[data-s=icol]')).toBeDisabled();
  await page.locator('[data-kind=row][data-v="0"]').click();await page.locator('[data-s=icol]').click();
  await page.locator('[data-kind=column][data-v=destination]').click();await page.locator('[data-s=i2]').click();await screenshot(page,info,'query-source-and-result');
  await page.locator('[data-s=ipredict]').click();await page.locator('[data-kind=result][data-v=names]').click();await page.locator('[data-s=i3]').click();
  await page.locator('[data-a=blank][data-w=destination]').click();await page.locator('[data-a=blank][data-w=manifest]').click();await page.locator('[data-a=blankrun]').click();await page.locator('[data-s=reps]').click();
  const gold=await page.evaluate(()=>__bw.S.gold);
  await query(page,'SELECT quantity FROM manifest');await expect(page.locator('#q-out')).toContainText('Not yet');expect(await page.evaluate(()=>__bw.S.gold)).toBe(gold);
  for(const sql of ['select name from manifest','SELECT destination FROM manifest','SELECT name, quantity FROM manifest','SELECT * FROM manifest','SELECT name FROM items','SELECT name, city FROM customers']){
    await query(page,sql);stats.queries++;const next=page.locator('[data-a=introcontinue]');if(await next.isVisible())await next.click();
  }
  await expect(page.locator('#enc .reward-gold')).toContainText('+25 gold');expect(await page.evaluate(before=>__bw.S.gold-before,gold)).toBe(25);await screenshot(page,info,'first-lesson-gold-pile');
  await page.locator('[data-a=qleave]').last().click();await speech(page,'[data-a=intropractice]');await page.locator('[data-a=practicepage]').first().click();await query(page,'SELECT name FROM items');
  await expect(page.locator('#enc')).toContainText('Your first ability');expect(await page.evaluate(()=>!!__bw.S.seen['intro.practice'])).toBe(true);await screenshot(page,info,'safe-first-ability');
  await finishGuidedDay(page,info,stats,path==='mage',path==='thief');
  expect(stats.steps).toBeGreaterThan(10);expect(errors).toEqual([]);
});
