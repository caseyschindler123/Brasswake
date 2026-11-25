const { test, expect } = require('@playwright/test');
const { observeErrors, playerFlow } = require('./flow');
const {fullArrival}=require('./intro-helper');
const {screenshot}=require('./flow');

test('the published generated soundtrack and effects obey independent persistent controls', async ({ page }, info) => {
  const errors = observeErrors(page);
  await require('./audio-release').audioRelease(page, info, './?commit=' + process.env.BW_EXPECT_COMMIT);
  expect(errors).toEqual([]);
});

test('the published game downloads, cold reopens offline, and restores a save file',async({page,context},info)=>{
  test.setTimeout(300000);
  await require('./offline-flow').offlineFlow(page,context,info,{url:'./',live:true});
});

test('the published battle grades SQL and compares the wrong query', async ({ page }, info) => {
  const errors = observeErrors(page);
  await page.goto('./?commit=' + process.env.BW_EXPECT_COMMIT);
  await require('./battle-release').battleRelease(page, info);
  expect(errors).toEqual([]);
});

test('the published rescue uses visible controls and reaches Tallyport',async({page},info)=>{
  const expected=process.env.BW_EXPECT_COMMIT;expect(expected).toMatch(/^[a-f0-9]{40}$/);const errors=observeErrors(page);
  await page.goto('./?commit='+expected);await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="3"]').click();await page.locator('[data-a=begin]').click();
  await fullArrival(page,info,screenshot,{name:'Sea Traveller',origin:'dwarrowdeep',visibleOnly:true});
  expect(await page.evaluate(()=>typeof window.__bw)).toBe('undefined');expect(errors).toEqual([]);
});

test('the published intro keeps character selection in its portrait menu and resumes a name draft',async({page},info)=>{
  const expected=process.env.BW_EXPECT_COMMIT;expect(expected).toMatch(/^[a-f0-9]{40}$/);const errors=observeErrors(page);
  await page.goto('./?commit='+expected);await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="0"]').click();await page.locator('[data-a=begin]').click();
  const rescue=page.locator('[data-a=boatskiprescue]');if(await rescue.isVisible())await rescue.click();
  await expect(page.locator('#boat-name')).toBeVisible();await page.locator('#boat-name').fill('Menu Traveller');
  await expect(page.locator('#onboard [data-a=boatmenu]')).toHaveCount(0);
  await page.getByRole('button',{name:'Character menu',exact:true}).click();await expect(page.locator('#sheet-body')).toContainText('Progress saves automatically');await screenshot(page,info,'published-intro-character-menu');
  await page.getByRole('button',{name:'Continue playing',exact:true}).click();await expect(page.locator('#sheet')).toBeHidden();await expect(page.locator('#boat-name')).toHaveValue('Menu Traveller');
  await page.getByRole('button',{name:'Character menu',exact:true}).click();await page.locator('#sheet').getByRole('button',{name:'Return to characters',exact:true}).click();
  await expect(page.locator('#title')).toBeVisible();await page.waitForLoadState('networkidle');await page.reload();await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').first().click();
  await expect(page.locator('#boat-name')).toHaveValue('Menu Traveller');expect(await page.evaluate(()=>typeof window.__bw)).toBe('undefined');expect(errors).toEqual([]);
});

test('the exact deployed commit serves a working game', async ({ page, request }, info) => {
  const expected = process.env.BW_EXPECT_COMMIT;
  expect(expected, 'Set BW_EXPECT_COMMIT to the full commit to verify').toMatch(/^[a-f0-9]{40}$/);
  // test/live.js has already verified the live commit and HTML hash.
  const errors = observeErrors(page);
  await page.goto('./?commit=' + expected);
  await playerFlow(page, info);
  expect(await page.evaluate(() => typeof window.__bw)).toBe('undefined');
  expect(errors).toEqual([]);
});
