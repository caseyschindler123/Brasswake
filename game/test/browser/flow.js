const { expect } = require('@playwright/test');

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
  page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure()?.errorText));
  return errors;
}

async function dismissCoach(page) {
  const button = page.locator('[data-a="coachok"]');
  if (await button.isVisible()) await button.click();
}

async function screenshot(page, info, name) {
  const file = info.outputPath(name + '.png');
  await page.screenshot({ path: file, animations: 'disabled' });
  await info.attach(name, { path: file, contentType: 'image/png' });
}

async function playerFlow(page, info) {
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#st-load')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('#title h1')).toHaveText('Brasswake');
  await screenshot(page, info, 'title');
  await page.locator('[data-a="newslot"]').first().click();
  await page.locator('[data-a="pick"][data-look="4"]').click();
  await page.locator('[data-a="begin"]').click();
  await require('./intro-helper').skipArrival(page,'Release Tester');
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#stage canvas').first()).toBeVisible();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await screenshot(page, info, 'world');

  await page.locator('#nav [data-t="ledger"]').click();
  await dismissCoach(page);
  await page.locator('[data-a="lsub"][data-s="sandbox"]').click();
  await page.locator('#con-sql').fill('/* release check; */ SELECT 42 AS release_check; -- finished;');
  await page.locator('[data-a="conrun"]').click();
  await expect(page.locator('#con-out')).toContainText('release_check');
  await expect(page.locator('#con-out td').first()).toHaveText('42');
  await screenshot(page, info, 'sql-result');
  await page.locator('[data-a=lsub][data-s=grimoire]').click();
  await page.locator('[data-a=reviewintro]').click();
  await expect(page.locator('.manifest')).toContainText('Healing Draught');
  await page.locator('[data-s=irow]').click();await page.locator('[data-kind=row][data-v="0"]').click();
  await page.locator('[data-s=icol]').click();await page.locator('[data-kind=column][data-v=destination]').click();
  await page.locator('[data-s=i2]').click();await page.locator('[data-s=ipredict]').click();
  await page.locator('[data-kind=result][data-v=names]').click();await page.locator('[data-s=i3]').click();
  await page.locator('[data-a=blank][data-w=destination]').click();await page.locator('[data-a=blank][data-w=manifest]').click();
  await page.locator('[data-a=blankrun]').click();await expect(page.locator('#enc')).toContainText('The porter has the destinations');
  await screenshot(page, info, 'manifest-query-result');await page.locator('[data-a=qleave]').click();

  await page.locator('#view .pclose').click();
  await page.locator('#minimap').click();
  await dismissCoach(page);
  await expect(page.locator('#view')).toContainText('Walking charts the terrain around you');
  await expect(page.locator('.cmap-frame img')).toBeVisible();
  await expect(page.locator('[data-a=cmaptravel]')).toHaveCount(0);
  await page.locator('[data-a=cmapview][data-mode=world]').click();
  await expect(page.locator('.ferry-routes polyline')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Aldermoot · Capital', exact: true })).toHaveCount(0);
  await screenshot(page, info, 'world-map-exploration');


  await page.locator('#nav [data-t="bag"]').click();
  await dismissCoach(page);
  await expect(page.locator('#nav [data-t="bag"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('#nav [data-t="hero"]').click();
  await dismissCoach(page);
  await expect(page.locator('input[data-target][data-stat="0"]')).toHaveCount(20);
  for (const [id, name] of [['hp', 'HP'], ['mana', 'Mana'], ['stamina', 'Stamina']]) {
    await expect(page.locator(`#hud [data-resource=${id}]`).getByRole('meter', { name })).toBeVisible();
  }
  await page.locator('input[data-target="magery"]').fill('55');
  await page.locator('[data-a="progresstarget"][data-id="magery"]').click();
  await page.locator('[data-a="progressmode"][data-id="inscription"]').click();
  await page.locator('[data-a="progressmode"][data-id="inscription"]').click();
  await expect(page.locator('[data-a="progressmode"][data-id="inscription"]')).toHaveText('Locked');
  await page.locator('[data-a=skilltab][data-id=stats]').click();
  await expect(page.locator('input[data-target][data-stat="1"]')).toHaveCount(3);
  await page.locator('[data-a=charactersettings]').click();
  await page.locator('[data-a="export"]').click();
  const code = await page.locator('#savebox').inputValue();
  const account = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  expect(account.v).toBe(9);
  expect(account.worlds).toHaveLength(3);
  const world = account.worlds[account.world], character = world.slots[world.cur];
  expect(character).toMatchObject({
    name: 'Release Tester', v: 8, uid: expect.stringMatching(/\S/),
    horse: { owned: false, mounted: false },
  });
  expect(character.skillTargets.magery).toBe(55);
  expect(character.skillModes.inscription).toBe('lock');
  await page.locator('.sheet-x').click();
  await page.locator('[data-a="import"]').click();
  await page.locator('#savebox').fill(code);
  await page.locator('[data-a="doimport"]').click();
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('[data-a="playslot"]')).toContainText('Release Tester');
  await page.locator('[data-a="playslot"]').click();
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await screenshot(page, info, 'restored-character');
}

module.exports = { observeErrors, playerFlow, screenshot };
