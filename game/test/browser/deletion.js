const { test, expect } = require('@playwright/test');
const Worlds = require('../../src/character_worlds');
const { skipArrival } = require('./intro-helper');
const { observeErrors, screenshot } = require('./flow');

const titleAction = (page, name) => page.locator(`#title [data-a="${name}"]`);
const sheetAction = (page, name) => page.locator(`#sheet [data-a="${name}"]`);
const ready = page => expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('brasswake.acct.v9')));

async function create(page, name) {
  await titleAction(page, 'newslot').first().click();
  await page.locator('[data-a=pick][data-look="4"]').click();
  await titleAction(page, 'begin').click();
  await skipArrival(page, name);
  await expect(page.locator('#title')).toBeHidden();
  await page.evaluate(() => __bw.ACT.reset());
  await expect(page.locator('#title h1')).toHaveText('Brasswake');
}

async function twoWorlds(page) {
  await page.goto('/index.html?visual_test=1');
  await ready(page);
  await create(page, 'Ada');
  await titleAction(page, 'worldpick').nth(1).click();
  await create(page, 'Bryn');
}

async function characterWarning(page) {
  await titleAction(page, 'delpick').click();
  await titleAction(page, 'delslot').first().click();
}

async function enterVerification(page, phrase) {
  await titleAction(page, 'deleteverify').click();
  await page.locator('#delete-phrase').fill(phrase);
}

function riderAccount() {
  const account = Worlds.fresh();
  account.rev = 17;
  account.cur = account.main = 0;
  account.slots[0] = {
    name: 'Ada', v: 8, wv: 3, region: 1, path: 'warrior', look: 0, tut: 3, g: 'done',
    horse: { owned: true, mounted: false },
  };
  return JSON.parse(JSON.stringify(account));
}

async function seedAccount(page, account) {
  await page.addInitScript(value => {
    const key = 'brasswake.acct.v9';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, account);
}

async function existingRider(page) {
  const fixture = riderAccount();
  await seedAccount(page, fixture);
  return fixture;
}

async function delayedCloudRead(page, account) {
  await page.addInitScript(account => {
    const cloud = { saved: null };
    const ref = {
      get: () => new Promise(resolve => {
        cloud.deliver = () => resolve({ exists: true, data: () => ({ json: JSON.stringify(account) }) });
      }),
      set: async payload => { cloud.saved = JSON.parse(payload.json); },
    };
    const db = { doc: path => path.endsWith('/acct') ? ref : { get: async () => ({ exists: false }) } };
    const connection = new Promise(resolve => { cloud.connect = () => resolve(db); });
    const user = { id: async () => 'deletion-delayed-read-fixture' };
    window.claude = { use: async service => service === 'db' ? connection : user };
    window.__deleteCloudRead = cloud;
  }, account);
}

async function openCloudRead(page) {
  await page.evaluate(() => window.__deleteCloudRead.connect());
  await page.waitForFunction(() => typeof window.__deleteCloudRead.deliver === 'function');
}

test('deletion · backing up keeps both character confirmations valid and stale hot data cannot undo deletion', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page);
  await twoWorlds(page);
  await titleAction(page, 'worldpick').nth(0).click();
  await characterWarning(page);
  await expect(page.locator('#title')).toContainText('Shared houses and storage stay.');
  await expect(titleAction(page, 'deletecommit')).toHaveCount(0);

  await titleAction(page, 'backup').click();
  await sheetAction(page, 'export').click();
  const oldCode = await page.locator('#savebox').inputValue();
  const stale = JSON.parse(Buffer.from(oldCode, 'base64').toString('utf8'));
  expect(stale.worlds[0].slots[0].name).toBe('Ada');
  await page.locator('#sheet .sheet-x').click();

  await enterVerification(page, 'Bryn');
  await titleAction(page, 'deletecommit').click();
  await expect(page.locator('#delete-status')).toContainText('Nothing was deleted');
  expect(await page.evaluate(() => __bw.A.worlds[0].slots[0].name)).toBe('Ada');
  await screenshot(page, info, 'character-delete-verification');
  await page.locator('#delete-phrase').fill('Ada');
  await titleAction(page, 'deletecommit').click();
  await expect(page.locator('#title h1')).toHaveText('Brasswake');
  const committed = await stored(page);
  expect(committed.rev).toBeGreaterThan(stale.rev);
  expect(committed.worlds[0].slots[0]).toBeNull();

  await page.addInitScript(acct => {
    window.claude = { hot: { ready: start => start({ acct, tab: 'world' }) } };
  }, stale);
  await page.reload();
  await ready(page);
  const state = await page.evaluate(() => ({
    empty: __bw.A.worlds[0].slots.every(c => c === null),
    other: __bw.A.worlds[1].slots[0].name,
    main: __bw.A.worlds[0].main,
  }));
  expect(state).toEqual({ empty: true, other: 'Bryn', main: -1 });
  expect(errors).toEqual([]);
});

test('deletion · cancelling a world reset preserves it and final verification clears only that household', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = observeErrors(page);
  await twoWorlds(page);
  await titleAction(page, 'delworld').click();
  await enterVerification(page, 'DELETE WORLD 2');
  await titleAction(page, 'totitle').click();
  expect(await page.evaluate(() => __bw.A.worlds[1].slots[0].name)).toBe('Bryn');
  await titleAction(page, 'delworld').click();
  await enterVerification(page, 'DELETE WORLD 2');
  await expect(page.locator('#title')).toContainText('DELETE WORLD 2');
  await screenshot(page, info, 'world-delete-verification');
  await titleAction(page, 'deletecommit').click();
  await page.reload();
  await ready(page);
  const state = await page.evaluate(() => ({
    worlds: __bw.A.worlds.length, world: __bw.A.world, other: __bw.A.worlds[0].slots[0].name,
    cleared: __bw.A.worlds[1],
  }));
  expect(state.worlds).toBe(3);
  expect(state.world).toBe(1);
  expect(state.other).toBe('Ada');
  expect(state.cleared.slots.every(c => c === null)).toBe(true);
  expect(state.cleared.homes).toEqual([]);
  expect(errors).toEqual([]);
});

for (const unavailable of [false, true]) test(unavailable
  ? 'deletion · an unavailable older cloud write does not prevent the queued deletion'
  : 'deletion · the queued cloud deletion follows an older in-flight write', async ({ page }) => {
  test.setTimeout(120000);
  const errors = observeErrors(page);
  await existingRider(page);
  await page.addInitScript(unavailable => {
    const cloud = { writes: [], saved: null };
    const ref = {
      get: async () => ({ exists: false }),
      async set(payload) {
        const account = JSON.parse(payload.json);
        cloud.writes.push(account);
        if (cloud.writes.length === 1) await new Promise((resolve, reject) => {
          cloud.release = () => unavailable
            ? reject(Object.assign(new Error('The previous cloud write could not finish'), { code: 'unavailable' }))
            : resolve();
        });
        cloud.saved = account;
      },
    };
    const db = { doc: () => ref }, user = { id: async () => 'deletion-cloud-fixture' };
    window.claude = { use: async service => service === 'db' ? db : user };
    window.__deleteCloud = cloud;
  }, unavailable);
  await page.goto('/index.html?visual_test=1');
  await ready(page);
  await page.waitForFunction(() => typeof window.__deleteCloud.release === 'function');
  expect(await page.evaluate(() => window.__deleteCloud.writes[0].worlds[0].slots[0].horse.owned)).toBe(true);

  await characterWarning(page);
  await enterVerification(page, 'Ada');
  await titleAction(page, 'deletecommit').click();
  await expect(page.locator('#title h1')).toHaveText('Brasswake');
  const device = await stored(page);
  expect(device.worlds[0].slots[0]).toBeNull();
  expect(await page.evaluate(() => window.__deleteCloud.writes.length)).toBe(1);

  // Settle the old write only after the device has committed deletion.
  await page.evaluate(() => window.__deleteCloud.release());
  await expect.poll(() => page.evaluate(() => window.__deleteCloud.saved?.worlds[0].slots[0]),
    { timeout: 4000 }).toBeNull();
  const remote = await page.evaluate(() => window.__deleteCloud.saved);
  expect(remote.rev).toBeGreaterThanOrEqual(device.rev);
  expect(remote.worlds[0]).toMatchObject({ cur: -1, main: -1 });
  expect(errors).toEqual([]);
});

test('deletion · the device persists deletion before attempting scene restoration', async ({ page }) => {
  test.setTimeout(120000);
  const errors = observeErrors(page), injected = 'Intentional deletion scene restore failure';
  await existingRider(page);
  await page.goto('/index.html?visual_test=1');
  await ready(page);
  await titleAction(page, 'playslot').first().click();
  await page.waitForFunction(() => Scene.pos() && Scene.debug().map === Scene.debug().world);
  await page.locator('#nav [data-t=hero]').click();
  if (await page.locator('[data-a=coachok]').isVisible()) await page.locator('[data-a=coachok]').click();
  await page.locator('#view [data-a=reset]').click();
  await characterWarning(page);
  await enterVerification(page, 'Ada');
  await page.evaluate(message => {
    window.__deleteRestoreAttempts = 0;
    Scene.restoreHomes = () => {
      window.__deleteRestoreAttempts++;
      throw new Error(message);
    };
  }, injected);
  await titleAction(page, 'deletecommit').click();
  await expect.poll(() => page.evaluate(() => window.__deleteRestoreAttempts)).toBeGreaterThan(0);
  const device = await stored(page);
  expect(device.worlds[0]).toMatchObject({ cur: -1, main: -1 });
  expect(device.worlds[0].slots[0]).toBeNull();
  await page.reload();
  await ready(page);
  expect(await page.evaluate(() => __bw.A.worlds[0].slots[0])).toBeNull();
  expect(errors.filter(error => !error.includes(injected))).toEqual([]);
});

test('deletion · a higher-revision startup cloud read cannot resurrect a character deleted while it was pending', async ({ page }) => {
  test.setTimeout(120000);
  const errors = observeErrors(page);
  const stale = await existingRider(page);
  stale.rev = 100;
  await delayedCloudRead(page, stale);
  await page.goto('/index.html?visual_test=1');
  await ready(page);
  await characterWarning(page);
  await enterVerification(page, 'Ada');
  // Delay opening the bridge until everything is ready, then ensure the
  // account read is actually pending before the player confirms deletion.
  await openCloudRead(page);
  await titleAction(page, 'deletecommit').click();
  await expect(page.locator('#title h1')).toHaveText('Brasswake');
  const beforeCloud = await stored(page);
  expect(beforeCloud.rev).toBeLessThan(stale.rev);
  expect(beforeCloud.worlds[0].slots[0]).toBeNull();

  await page.evaluate(() => window.__deleteCloudRead.deliver());
  await expect.poll(() => page.evaluate(() => window.__deleteCloudRead.saved?.rev)).toBeGreaterThan(stale.rev);
  const cloud = await page.evaluate(() => window.__deleteCloudRead.saved);
  expect(cloud.worlds[0]).toMatchObject({ cur: -1, main: -1 });
  expect(cloud.worlds[0].slots[0]).toBeNull();
  expect(await stored(page)).toMatchObject({ rev: cloud.rev });
  expect((await stored(page)).worlds[0].slots[0]).toBeNull();
  await expect(titleAction(page, 'playslot')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('deletion · backgrounding an unselected account preserves a newer pending cloud save', async ({ page }) => {
  const errors = observeErrors(page), local = Worlds.fresh(), remote = riderAccount();
  local.rev = 49;
  remote.rev = 50;
  await seedAccount(page, JSON.parse(JSON.stringify(local)));
  await delayedCloudRead(page, remote);
  await page.goto('/index.html?visual_test=1');
  await ready(page);
  await expect(titleAction(page, 'playslot')).toHaveCount(0);
  await page.waitForFunction(() => Scene.pos());
  await openCloudRead(page);

  // Dispatch the two lifecycle notifications without unloading the page
  // that still owns the pending bridge request.
  const revisions = await page.evaluate(() => {
    const before = __bw.A.rev;
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    try { document.dispatchEvent(new Event('visibilitychange')); }
    finally { delete document.hidden; }
    const afterBackground = __bw.A.rev;
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    return [before, afterBackground, __bw.A.rev];
  });
  // Let the 1.5-second dock cartography autosave run while the account is
  // still unselected and the cloud read is still unresolved.
  await page.waitForTimeout(1700);
  const beforeCloud = await stored(page);
  await page.evaluate(() => window.__deleteCloudRead.deliver());
  await page.waitForFunction(() => window.__deleteCloudRead.saved !== null);
  expect(revisions).toEqual([local.rev, local.rev, local.rev]);
  expect(beforeCloud.rev).toBe(local.rev);
  await expect(titleAction(page, 'playslot')).toContainText('Ada');
  const device = await stored(page);
  const cloud = await page.evaluate(() => window.__deleteCloudRead.saved);
  for (const account of [device, cloud]) {
    expect(account.rev).toBeGreaterThanOrEqual(remote.rev);
    expect(account.worlds[0].slots[0]).toMatchObject({
      name: 'Ada', horse: { owned: true, mounted: false },
    });
  }
  expect(errors).toEqual([]);
});
