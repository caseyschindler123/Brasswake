const { test, expect } = require('@playwright/test');
const { observeErrors, playerFlow, screenshot } = require('./flow');
require('./playability');
require('./sound');
require('./dungeons');
require('./music');
require('./arming');
require('./first-day');
require('./world-travel');
require('./world-buildings');

// Local tests use the installed SQL engine and local game fonts. The live test
// deliberately uses the real hosted dependencies without these substitutions.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
});

test('a player can create, query, navigate, export, import, and reload', async ({ page }, info) => {
  const errors = observeErrors(page);
  await page.goto('/index.html?visual_test=1');
  await playerFlow(page, info);
  expect(errors).toEqual([]);
});

for (const scene of ['title', 'tallyport', 'fight', 'bag', 'paperdoll', 'dungeon', 'dojo', 'interior']) {
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
