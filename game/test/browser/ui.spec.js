const { test, expect } = require('@playwright/test');
const { observeErrors, playerFlow, screenshot } = require('./flow');
const { MODULES, suitesFromEnvironment } = require('../ui-suites');
const selected = new Set(suitesFromEnvironment());
for (const name of MODULES) if (selected.has(name)) require('./' + name);

if(selected.has('canary'))test('release canary: boot, real SQL and device persistence',async({page})=>{
  const errors=observeErrors(page);await page.goto('/index.html?visual_test=1');expect(await page.evaluate(()=>typeof window.Dev)).toBe('undefined');
  await expect(page.locator('#artload')).toBeHidden({timeout:45000});
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="0"]').click();await page.locator('[data-a=begin]').click();
  await require('./intro-helper').skipArrival(page,'Canary');
  await page.locator('#nav [data-t=ledger]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
  await page.locator('[data-a=lsub][data-s=sandbox]').click();await page.locator('#con-sql').fill('SELECT 42 AS canary');await page.locator('[data-a=conrun]').click();
  await expect(page.locator('#con-out td').first()).toHaveText('42');
  await page.locator('#nav [data-t=hero]').click();if(await coach.isVisible())await coach.click();
  await page.locator('[data-a=savenow]').click();await page.reload();await expect(page.locator('[data-a=playslot]').first()).toContainText('Canary');expect(errors).toEqual([]);
});

// Local tests use the installed SQL engine and local game fonts. The live test
// deliberately uses the real hosted dependencies without these substitutions.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
});

if (selected.has('smoke')) test('a player can create, query, navigate, export, import, and reload', async ({ page }, info) => {
  const errors = observeErrors(page);
  await page.waitForLoadState('networkidle');
  await page.goto('/index.html?visual_test=1');
  await playerFlow(page, info);
  expect(errors).toEqual([]);
});

const scenes = selected.has('scenes') ? process.env.BW_SCENES?JSON.parse(process.env.BW_SCENES):['title', 'tallyport', 'fight', 'bag', 'paperdoll', 'dungeon', 'dojo', 'interior'] : selected.has('smoke') ? ['title', 'tallyport'] : [];
if(!Array.isArray(scenes)||scenes.some(s=>!require('../scope-policy').SCENES.includes(s)))throw Error('Invalid scene selection');
if(selected.has('scenes')&&!scenes.length)throw Error('Selected scenes cannot be empty');
for (const scene of scenes) {
  test('visual scene: ' + scene, async ({ page }, info) => {
    const errors = observeErrors(page);
    await page.goto('/__visual?scene=' + scene);
    await expect(page.locator('body')).toHaveAttribute('data-ready', scene, { timeout: 45000 });
    const frame = page.frames().find(frame => frame.url().includes('visual_test=1'));
    expect(frame).toBeTruthy();
    await expect(frame.locator('#artload')).toBeHidden();
    const brokenImages = await frame.locator('img').evaluateAll(images =>
      images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
    expect(brokenImages).toEqual([]);
    const layout = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
    expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height);
    if (scene === 'title') await expect(frame.locator('#title h1')).toHaveText('Brasswake');
    else await expect(frame.locator('#stage canvas').first()).toBeAttached();
    if (scene === 'fight') await expect(frame.locator('#fight')).toBeVisible();
    if (scene === 'bag') await expect(frame.locator('#nav [data-t="bag"]')).toHaveAttribute('aria-current', 'page');
    if (scene === 'paperdoll') await expect(frame.locator('#sheet')).toBeVisible();
    if (scene === 'dungeon') expect(await frame.evaluate(() => Scene.inDungeon())).toBeTruthy();
    if (scene === 'dojo') expect(await frame.evaluate(() => Scene.inHall())).toBeTruthy();
    await screenshot(page, info, scene);
    expect(errors).toEqual([]);
  });
}
