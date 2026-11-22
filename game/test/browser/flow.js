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
  await page.locator('#cr-name').fill('Release Tester');
  await page.locator('[data-a="begin"]').click();
  await page.locator('[data-a="beat"]').click();
  await page.locator('[data-a="beat"]').click();
  await page.locator('[data-a="skipguide"]').click();
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#stage canvas').first()).toBeVisible();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await screenshot(page, info, 'world');

  await page.locator('#nav [data-t="ledger"]').click();
  await dismissCoach(page);
  await page.locator('[data-a="lsub"][data-s="sandbox"]').click();
  await page.locator('#con-sql').fill('SELECT 42 AS release_check');
  await page.locator('[data-a="conrun"]').click();
  await expect(page.locator('#con-out')).toContainText('release_check');
  await expect(page.locator('#con-out td').first()).toHaveText('42');
  await screenshot(page, info, 'sql-result');

  await page.locator('#nav [data-t="bag"]').click();
  await dismissCoach(page);
  await expect(page.locator('#nav [data-t="bag"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('#nav [data-t="hero"]').click();
  await dismissCoach(page);
  await page.locator('[data-a="export"]').click();
  const code = await page.locator('#savebox').inputValue();
  expect(JSON.parse(Buffer.from(code, 'base64').toString('utf8')).slots.some(slot => slot?.name === 'Release Tester')).toBe(true);
  await page.locator('.sheet-x').click();
  await page.locator('[data-a="import"]').click();
  await page.locator('#savebox').fill(code);
  await page.locator('[data-a="doimport"]').click();
  await expect(page.locator('#sheet')).toBeHidden();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await page.reload();
  await expect(page.locator('#artload')).toBeHidden({ timeout: 45000 });
  await expect(page.locator('[data-a="playslot"]')).toContainText('Release Tester');
  await page.locator('[data-a="playslot"]').click();
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#hud')).toContainText('Release Tester');
  await screenshot(page, info, 'restored-character');
}

module.exports = { observeErrors, playerFlow, screenshot };
